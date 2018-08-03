/*global CardDrawer*/
import logger from 'helpers/logger';
import AppConfig from 'config/app_config';
import ConfigStore from 'stores/configuration_store';
import FileViewerActions from 'actions/file_viewer_actions';
import fileHelper from 'helpers/file_helper';
import ChatWindowActions from 'actions/chat_window_actions';
import CardHelper from 'helpers/card_helper';

var urlAndUrl2xObject = React.PropTypes.oneOfType([
  React.PropTypes.string,
  React.PropTypes.shape({
    url: React.PropTypes.string.isRequired,
    'url@2x': React.PropTypes.string
  })
]);

export default React.createClass({

  displayName: "Card",

  propTypes: {
    id: React.PropTypes.string.isRequired,
    title: React.PropTypes.string.isRequired,
    description: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.object]),
    style: React.PropTypes.oneOf(['file', 'link', 'image', 'application', 'media']),
    icon: urlAndUrl2xObject,
    format: React.PropTypes.oneOf(['medium', 'compact']),
    thumbnail: React.PropTypes.shape({
      url: React.PropTypes.string.isRequired,
      'url@2x': React.PropTypes.string,
      width: React.PropTypes.number,
      height: React.PropTypes.number
    }),
    attributes: React.PropTypes.arrayOf(React.PropTypes.shape({
      label: React.PropTypes.string,
      value: React.PropTypes.shape({
        icon: urlAndUrl2xObject,
        label: React.PropTypes.string.isRequired
      })
    })),
    fallback: React.PropTypes.element,
    show_always: React.PropTypes.bool
  },

  options: {
    "type": "link",
    "format": "compact",
    "responsive": false
  },

  /**
   * Cards are immutable and there are not going to change their state in their entire existence
   * That is why we pass false to guarantee performance with React.
   * @returns {boolean}
   */
  shouldComponentUpdate: function () {
    return false;
  },

  getDefaultProps: function() {
    return {
      onClick: _.noop
    };
  },

  getInitialState: function () {
    return this._getState();
  },

  componentDidMount: function () {
    var node = ReactDOM.findDOMNode(this);
    this.thumbnailLink = node.querySelector(".atlascard .thumbnail > a");
    this.title = node.querySelector(".atlascard .title > a");
    this.activity = node.querySelector(".atlascard .activity-expander");

    if (this.thumbnailLink) {
      this.thumbnailLink.addEventListener('click', this._onClick);
    }

    if (this.title) {
      this.title.addEventListener('click', this._onClick);
    }

    if (this.activity) {
      this.activity.addEventListener('click', this._onActivityExpanded);
    }
  },

  componentWillUnmount: function () {
    if (this.thumbnailLink) {
      this.thumbnailLink.removeEventListener('click', this._onClick);
    }

    if (this.title) {
      this.title.removeEventListener('click', this._onClick);
    }

    if (this.activity) {
      this.activity.removeEventListener('click', this._onActivityExpanded);
    }
  },

  render: function () {

    if (!this.cardsEnabled() || !this.isValid()) {
      return this.fallback();
    }

    var cardData = _.clone(this.props);
    cardData.fallback = {}; // We don't want to pass the fallback if it exists
    cardData.date = 0; // If we don't set this IE11 & Edge go boom
    var options = _.clone(this.options);

    try {

      this.processCard(options, cardData);
      var cardDrawer = new CardDrawer(cardData, options);
      return <div data-mid={this.props.mid}
                  onClick={this.props.onClick}
                  dangerouslySetInnerHTML={{__html: cardDrawer.render()}} />;

    } catch (err) {
      this._logError(err, this.props);
      return this.fallback();
    }
  },

  _onClick: function (evt) {
    var urlLink = {url: this.props.url};

    if (fileHelper.shouldOpenFileViewer(evt) && fileHelper.fileViewerSupports(urlLink)) {
      evt.preventDefault();
      FileViewerActions.openInFileViewer(urlLink);
    }
  },

  /**
   * We want that if activity cards are the last message and you
   * expanded to be able to expand and don't have to scroll to see it.
   * If the activity is in the top of the chat, we don't need to scroll anything
   * @param evt the event
   * @private
   */
  _onActivityExpanded: function (evt) {
    var node = $(ReactDOM.findDOMNode(this));
    var shouldScroll = node.offset().top > $(window).height() / 2;
    if (shouldScroll) {
      ChatWindowActions.preserveScrollValue({animation: false});
    }
  },

  _getState: function () {
    return {
      feature_flags: ConfigStore.get("feature_flags")
    };
  },

  processCard: function (options, cardData) {

    if (this.isImage() || this.isFile()) {

      options.format = "narrow";
      cardData.title = cardData.title || this.props.url.match("[^/]*$");

    } else if (this.isLink() || this.isMedia()) {

      options.format = _.get(cardData, 'format', "compact");
      cardData.site = this._getHostname(this.props.url);

    } else if (this.isApplication()) {

      options.format = _.get(cardData, 'format', "compact");
      options.type = cardData.type = "application";
    }

    if (this.state.feature_flags.web_client_cards_feedback_enabled) {
      options.feedback = {
        url: this._feedbackUrl(cardData),
        label: 'Feedback',
        tooltip: 'Let the HipChat team know what you think about cards.'
      };
    }
  },

  /**
   * Will check the required fields for each type to be rendered
   */
  isValid: function () {
    return CardHelper.isValidCard(this.props);
  },

  fallback: function () {
    return this.props.fallback ? this.props.fallback : <div/>;
  },

  /**
   * If the card has a show_always it will render despite any feature flag.
   * This happens with links that already rolled out
   * @returns true if enabled, false if not
   */
  cardsEnabled: function () {
    return this.props.show_always
      || CardHelper.cardsEnabled(this.state.feature_flags);
  },

  isValidStyle: function () {
    return CardHelper.isValidStyle(this.props);
  },

  isLink: function () {
    return CardHelper.isLink(this.props);
  },

  isMedia: function () {
    return CardHelper.isMedia(this.props);
  },

  isFile: function () {
    return CardHelper.isFile(this.props);
  },

  isImage: function () {
    return CardHelper.isImage(this.props);
  },

  isApplication: function () {
    return CardHelper.isApplication(this.props);
  },

  _getHostname: function (url) {
    var link = document.createElement('a');
    link.href = url;
    return link.hostname;
  },

  _feedbackUrl: function (cardData) {
    return AppConfig.cards.feedback_url + encodeURIComponent(JSON.stringify(cardData));
  },

  _logError: function (error, data) {
    logger.error(error);
    logger.error(data);
    this.valid = false;
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/card.js
 **/