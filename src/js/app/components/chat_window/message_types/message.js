import utils from 'helpers/utils';
import emoticons from 'helpers/emoticons';
import Expando from 'components/chat_window/expando';
import MentionEmoticonTooltipMixin from 'components/mixins/mention_emoticon_tooltip_mixin';
import ScrollingMediaObserver from 'components/mixins/scrolling_media_observer_mixin';
import strings from 'strings/chat_panel_strings';
import Quote from 'components/chat_window/message_types/quote';
import Code from 'components/chat_window/message_types/code';
import Monospace from 'components/chat_window/message_types/monospace';

let PureRenderMixin = React.addons.PureRenderMixin;

function getHtmlMsg(mid, body) {
  return <div data-mid={mid} dangerouslySetInnerHTML={{__html: body}} />;
}

function getCommonMsg(mid, body, rendered_body) {
  if (utils.messageShouldBeTruncated(body)) {
    return (
      <Expando mid={mid}>
        <div className="msg-wrap"
             data-copyable={`{"format": "plain-message", "mid": "${mid}"}`}
             dangerouslySetInnerHTML={{__html: rendered_body }} />
      </Expando>
    );
  }

  return <div className="msg-line"
              data-mid={mid}
              data-copyable={`{"format": "plain-message", "mid": "${mid}"}`}
              dangerouslySetInnerHTML={{__html: rendered_body}} />;
}

function getDeletedMsg(mid) {
  return (
    <div className="msg-line deleted" data-mid={mid}>
      <div className="hc-msg-deleted-icon"></div>
      {strings.message_deleted}
    </div>
  );
}

function getRenderedMessage(msg) {
  if (msg.is_deleted) {
    return getDeletedMsg(msg.mid);
  }

  switch (msg.format) {
    case 'code':
      return <Code mid={msg.mid} body={msg.rendered_body}/>;
    case 'monospace':
      return <Monospace mid={msg.mid} body={msg.rendered_body}/>;
    case 'quotation':
      return <Quote mid={msg.mid} body={msg.body}/>;
    case 'html':
      return getHtmlMsg(msg.mid, msg.xhtml_im_body);
    default:
      return getCommonMsg(msg.mid, msg.body, msg.rendered_body);
  }
}

export default React.createClass({

  displayName: "MessageMessageType",

  // Message instance changes only when message changes, so
  // we can use PureRenderMixin here
  mixins: [PureRenderMixin, MentionEmoticonTooltipMixin, ScrollingMediaObserver],

  propTypes: {
    msg: React.PropTypes.shape({
      body: React.PropTypes.string.isRequired,
      rendered_body: React.PropTypes.string.isRequired,
      format: React.PropTypes.string.isRequired,
      mid: React.PropTypes.string.isRequired,
      status: React.PropTypes.string.isRequired
    })
  },

  componentDidMount() {
    emoticons._replaceSpecials(ReactDOM.findDOMNode(this));
  },

  render() {
    var msg = this.props.msg,
        renderedMessage = getRenderedMessage(msg);

    return renderedMessage;
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/message.js
 **/