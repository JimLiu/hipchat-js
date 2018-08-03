import SearchStore from 'stores/search_store';
import PreferencesStore from 'stores/preferences_store';
import ConfigStore from 'stores/configuration_store';
import utils from 'helpers/utils';
import logger from 'helpers/logger';
import cx from 'classnames';
import AppConfig from 'config/app_config';
import SearchActions from 'actions/search_actions';
import AnalyticsActions from 'actions/analytics_actions';

const cssVersion = (new Date()).getTime();

export default React.createClass({

  displayName: "SearchResults",

  getInitialState: function () {
    return this._getState();
  },

  _getState: function () {
    return {
      apiv1_token: ConfigStore.get("apiv1_token"),
      text: SearchStore.get("text"),
      jid: SearchStore.get("jid"),
      web_server: SearchStore.get("web_server"),
      active_chat: SearchStore.get('active_chat'),
      theme: PreferencesStore.getTheme()
    };
  },

  componentDidMount: function () {
    SearchStore.on(['change:text', 'change:jid', 'change:web_server', 'change:active_chat'], this._onChange);
    ConfigStore.on(['change:apiv1_token'], this._onChange);
    PreferencesStore.on(['change:theme'], this._onChange);
    this.previousSearchURL = this._getSearchUrl();
    this._bindIframeLoad();
  },

  componentWillUnmount: function () {
    SearchStore.off(['change:text', 'change:jid', 'change:web_server', 'change:active_chat'], this._onChange);
    ConfigStore.off(['change:apiv1_token'], this._onChange);
    PreferencesStore.off(['change:theme'], this._onChange);
    this._unbindIframeLoad();
  },

  componentWillUpdate: function (nextProps, nextState) {
    if (nextState.active_chat !== this.state.active_chat &&
      utils.jid.is_search(this.state.active_chat) &&
      !utils.jid.is_search(nextState.active_chat)){
      $(this._getIframeBody()).find("#select2-drop-mask").click();
    }
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (prevState.text !== this.state.text ||
        prevState.jid !== this.state.jid){
      this._hideIframe();
    }

    if (prevState.apiv1_token !== this.state.apiv1_token){
      // this delay is to ensure the native app has time to update the cookie
      _.delay(() => {
        $(this._getIframe()).attr('src', this.previousSearchURL);
        $(this._getIframe()).show();
      }, 1000);
    }

    if (prevState.theme !== this.state.theme) {
      this._unbindIframeLoad();
      this._bindIframeLoad();
      this._reloadIframe();
    }
  },

  _onChange: function () {
    this.setState(this._getState());
  },

  _bindIframeLoad: function () {
    this._getIframe().on("load", this._onIframeLoad);
  },

  _unbindIframeLoad: function () {
    this._getIframe().off("load", this._onIframeLoad);
  },

  _reloadIframe: function () {
    let location = _.get(this._getIframe().get(0), 'contentWindow.location');
    if (location && typeof location.reload === 'function'){
      location.reload(true);
    }
  },

  _getIframe: function () {
    return $(ReactDOM.findDOMNode(this.refs.search_results));
  },

  _getIframeHead: function () {
    return _.get(this._getIframe().get(0), 'contentWindow.document.head');
  },

  _getIframeBody: function () {
    return _.get(this._getIframe().get(0), 'contentWindow.document.body');
  },

  _onIframeLoad: function () {
    let $body = $(this._getIframeBody()),
        $iframe = this._getIframe();

    // If our API V1 token is invalid the server redirects to the sign in page. Users shouldn't see this.
    if (AppConfig.login_page_redirect_regex.test(_.get($iframe.get(0), 'contentWindow.location.pathname', ''))) {
      return this._handleLoginRedirect();
    }

    this.previousSearchURL = _.get($iframe.get(0), 'contentWindow.location.href');

    if (!$body.hasClass("embedded-search-page")) {
      $body.addClass("embedded-search-page");
    }

    $body.find("form").on("submit", this._hideIframe);
    $body.find("a").on("click", this._handleIframeClick);
    $body.find("form [type=text]").on("keydown", (e) => {
      if (e.keyCode === utils.keyCode.Esc){
        $body.find("form [type=text]").val("");
      } else if (e.keyCode === utils.keyCode.Enter){
        AnalyticsActions.searchInputSubmitted($body.find("#chat-select").val());
      }
    });

    if (this.state.theme !== "light") {
      let $head = $(this._getIframeHead()),
          themeStyles = this._getThemeStyles();
      $head.append(themeStyles);
    }

    $iframe.show();
  },

  _handleIframeClick: function (e) {
    let $target = $(e.currentTarget),
        href = $target.attr('href');
    if ($target.attr("target") !== "_blank" && !$target.parent().hasClass("file-meta")
        && $target.parents('.hc-chat-row').length
        && !$target.parents('.hc-chat-time').length) {

      // hide/show links
      if (href.indexOf('javascript') === 0) {
        e.preventDefault();
      } else if (href) {
        logger.type('search-results').log('Target contains external link, it will be opened in new window: ', href);
        e.preventDefault();
        window.open(href, '_blank');
      } else {
        this._hideIframe();
      }
    } else {
      if (!href){
        logger.type('search-results').log('Link is empty and it skipped.');
        e.preventDefault();
      }
    }
  },

  _hideIframe: function () {
    $(this._getIframe()).hide();
  },

  /**
   * In the rare occurance that your API v1 token becomes invalid and user attempts to search
   * we request a new token and reload the search page.
   */
  _handleLoginRedirect: function() {
    this._hideIframe();
    SearchActions.updateAPIV1Token();
  },

  _getThemeStyles: function () {
    var url = `https://${this.state.web_server}/wc/${this.state.theme}.css?v=${cssVersion}`;
    return `<link rel='stylesheet' href='${url}' type='text/css'>`;
  },

  _getSearchUrl: function () {
    if (this.state.jid) {
      var jid = this.state.jid,
        url = `https://${this.state.web_server}/embedded/search?adg=true&q=${this.state.text}`;

      if (utils.jid.is_chat(jid) && utils.jid.is_private_chat(jid)) {
        url += '&t=uid-' + utils.jid.user_id(jid);
      } else if (utils.jid.is_chat(jid) && utils.jid.is_room(jid)) {
        url += '&r=' + utils.jid.room_name(jid);
      }

      return encodeURI(url);
    }
  },

  render: function () {
    var containerClasses = cx({
          "hc-rooms-container": true,
          "hc-rooms-container-hidden": !this.props.visible
        }),
        iframeStyles = {
          display: (this.state.theme !== "light") ? 'none' : "block"
        };

    return (
      <div className={containerClasses} >
        <iframe ref="search_results" id="search-container" src={this._getSearchUrl()} style={iframeStyles} />
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/search/search_results.js
 **/