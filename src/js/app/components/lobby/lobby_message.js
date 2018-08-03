import PureRenderMixin from 'react-addons-pure-render-mixin';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';
import logger from 'helpers/logger';

export default React.createClass({

  displayName: "LobbyMessage",

  mixin: [PureRenderMixin],

  propTypes: {
    webServer: React.PropTypes.string.isRequired,
    theme: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      webServer: '',
      theme: 'light'
    };
  },

  componentDidMount() {
    let $iframe = this._getIframe();
    $iframe.hide();
    $iframe.on('load', this._onIframeLoad);
  },

  componentWillUnmount(){
    this._getIframe().off('load', this._onIframeLoad);
  },

  _getIframe(){
    return $(ReactDOM.findDOMNode(this.refs.blog_info));
  },

  _getIframeBody() {
    return _.get(this._getIframe().get(0), 'contentWindow.document.body');
  },

  _onIframeLoad(){

    logger.type('blog-info-iframe').log('Iframe was loaded');

    let $iframe = this._getIframe(),
        contentCheck = $iframe.contents().has("#blog-info").length;

      if (contentCheck){

        let $body = $(this._getIframeBody()),
            hasContent = $body.children().length;

        if (hasContent){
          $iframe.show();
          let height = $iframe.contents().find("html").outerHeight();
          $iframe.height(height);
          $body.find("a").on("click", this._handleIframeClick);
          logger.type('blog-info-iframe').log('Iframe is shown with height:', height);
        } else {
          logger.type('blog-info-iframe').log('Iframe is hidden because content is not found');
        }
      } else {
        logger.type('blog-info-iframe').log('Iframe is hidden because error occurred');
      }
  },

  _handleIframeClick(e){

    let $target = $(e.currentTarget),
        href = $target.attr('href'),
        analyticsEvent = $target.attr('analytics');

    e.preventDefault();

    if (href){
      window.open(href, '_blank');
      logger.type('blog-info-iframe').log('Link opened: ', href);
    }

    if (analyticsEvent){
      AnalyticsDispatcher.dispatch("analytics-event", {
        name: analyticsEvent
      });
    }
  },

  render() {
    return <iframe ref="blog_info" id="blog-info-iframe" src={`https://${this.props.webServer}/blog_info?theme=${this.props.theme}`}></iframe>;
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/lobby/lobby_message.js
 **/