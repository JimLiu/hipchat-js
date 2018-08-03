import Card from 'components/chat_window/message_types/card';
import MentionEmoticonTooltipMixin from 'components/mixins/mention_emoticon_tooltip_mixin';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import ScrollingMediaObserver from 'components/mixins/scrolling_media_observer_mixin';
import {dom} from 'helpers/utils';
import integration_link_helpers from 'helpers/integration_link_helper';
import Quote from 'components/chat_window/message_types/quote';
import Code from 'components/chat_window/message_types/code';
import Monospace from 'components/chat_window/message_types/monospace';

export default React.createClass({

  displayName: "NotificationMessageType",

  mixins: [MentionEmoticonTooltipMixin, DeepEqualRenderMixin, ScrollingMediaObserver],

  componentDidMount: function() {
    this._createTooltips();
  },

  componentWillUnmount: function() {
    this._destroyTooltips();
  },

  render: function () {
    let cardData = this.getCard(),
        notification = this.renderNotification();

    return cardData ? this.renderCard(cardData, notification) : notification;
  },

  getCard: function () {
    return _.get(this.props, "msg.card");
  },

  renderCard: function(cardData, fallback) {
    return <Card {...cardData}
                 fallback={fallback}
                 _setScroll={this.props._setScroll}
                 onClick={this.onLinkClick}/>;
  },

  renderNotification: function() {
    let notification,
        content,
        msg = this.props.msg;

    if (msg.format === 'html') {
      notification = msg.xhtml_im_body;
    } else {
      notification = msg.rendered_body;
    }

    if (msg.format === 'quotation') {
      content =
        <div className="notification msg-line" data-mid={msg.mid} onClick={this.onLinkClick}>
          <Quote mid={msg.mid} body={notification}/>
        </div>;
    } else if (msg.format === 'code') {
      content =
        <div className="notification msg-line" data-mid={msg.mid} onClick={this.onLinkClick}>
          <Code mid={msg.mid} body={notification}/>
        </div>;
    } else if (msg.format === 'monospace') {
      content =
        <div className="notification msg-line" data-mid={msg.mid} onClick={this.onLinkClick}>
          <Monospace mid={msg.mid} body={notification}/>
        </div>;
    } else {
      content = <div className="notification msg-line"
                     data-mid={msg.mid}
                     data-copyable={`{"format": "notification", "mid": "${msg.mid}"}`}
                     dangerouslySetInnerHTML={{__html: notification}} onClick={this.onLinkClick}/>;
    }

    return content;
  },

  onLinkClick: function(event) {
    if (event.target) {

      let targetLink = dom.findParentMatching(event.target, dom.matchers.tag("a"), ReactDOM.findDOMNode(this));

      if (targetLink) {
        let target = targetLink.getAttribute("data-target");
        let targetOptions = targetLink.getAttribute("data-target-options");
        let href = targetLink.getAttribute("href");

        if (integration_link_helpers.handleNotificationLink(target, targetOptions, href, this.props.msg)) {
          event.stopPropagation();
          event.preventDefault();
        }
      }
    }
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/notification.js
 **/