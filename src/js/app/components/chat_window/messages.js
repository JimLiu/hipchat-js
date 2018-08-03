import utils from 'helpers/utils';
import AppDispatcher from 'dispatchers/app_dispatcher';
import CardHelper from 'helpers/card_helper';
import ConfigStore from "stores/configuration_store";
import MessageGroup from 'components/chat_window/message_group';

const PureRenderMixin = React.addons.PureRenderMixin;

const nonGroupingTypes = [
  'notification',
  'twitter_user',
  'twitter_status',
  'info'
];

/**
 * Checks to see if two messages have the same sender by checking sender_id or
 * sender. sender_id could be null in old btf servers
 *
 * @param {Object} message1
 * @param {Object} message2
 * @returns boolean
 */
export function doSendersMatch(message1, message2) {
  if (message1.sender_id || message2.sender_id) {
    return message1.sender_id === message2.sender_id;
  }
  return message1.sender === message2.sender;
}

/**
 * Determines if the current message should be grouped with the previous message
 *
 * @param {Object} the first message object in the group
 * @param {Object} the previous message object
 * @param {Object} the current message object
 *
 * @returns Boolean
 */
export function shouldGroupMessage(firstInGroup, previousMsg, message) {
  return doSendersMatch(firstInGroup, message)
      && message.time - previousMsg.time <= 300
      && firstInGroup.color === message.color
      && !previousMsg.last_read_message
      && !~nonGroupingTypes.indexOf(message.type)
      && !~nonGroupingTypes.indexOf(firstInGroup.type)
      && message.status !== 'failed'
      && previousMsg.status !== 'failed'
      && (message.type !== 'image' ||
          message.type === 'image' &&
          firstInGroup.type === 'image' &&
          utils.getRealMid(firstInGroup.mid) === utils.getRealMid(message.mid));
}

/**
 * Determines if the current message should be attached to the previous message
 *
 * @param {Boolean} whether card attachment is enabled
 * @param {Object} the previous message object
 * @param {Object} the current message object
 *
 * @returns Boolean
 */
export function shouldAttachMessage(attachEnabled, previousMsg, message) {
  var previousMidToAttach = utils.getAttachToMid(previousMsg) || previousMsg.mid,
      msgMidToAttachTo = utils.getAttachToMid(message);

  return attachEnabled
      && CardHelper.isValidCard(message.card)
      && previousMidToAttach === msgMidToAttachTo;
}

/*
 * Split single message array into array of message groups grouped by date.
 *
 * @param {Object[]} messages array of messages
 *
 * @returns {{date: string, messages: Object[]}[]} array of message groups
 */
export function groupByDate(messages) {
  var result = [],
      lastDate = null,
      group = null;

  messages.forEach(function (message) {
    let currentDate = utils.format_time_for_separator(message.sortTime || message.time);

    if (lastDate === null || lastDate !== currentDate) {
      lastDate = currentDate;
      group = {
        date: currentDate,
        messages: [message]
      };
      result.push(group);
    } else {
      group.messages.push(message);
    }
  });

  return result;
}

/*
 * Split single message array into array of message groups.
 *
 * @param {Object[]} messages array of messages
 * @param feature_flags the configured feature flags
 *
 * @returns {{key: string, messages: Object[]}[]} array of message groups
 */
export function groupNearbyMessages(messages, attach_enabled = false) {
  var result = [],
      firstInGroupMsg = null,
      group = null;

  messages.forEach(function (msg, i) {
    if (firstInGroupMsg === null || !(shouldGroupMessage(firstInGroupMsg, messages[i - 1], msg) || shouldAttachMessage(attach_enabled, messages[i - 1], msg) )) {
      firstInGroupMsg = msg;
      group = {
        key: 'msg-group-' + msg.mid,
        messages: [msg]
      };
      result.push(group);
    } else {
      group.messages.push(msg);
    }
  });

  return result;
}

/**
 * Determines if any of the messages in the group are the last read message
 * used for styling the message group
 *
 * @param {Object} a message group object with an array of message objects
 *
 * @returns Boolean
 */
export function groupContainsLastRead (group) {
  return !!~_.findLastIndex(group.messages, { last_read_message: true });
}

export default React.createClass({
  displayName: 'ChatWindowMessages',

  // messages are immutable
  // addons_avatars is also immutable object (we create new instance each time)
  // other props are primitives
  // so we can use PureRenderMixin here
  mixins: [PureRenderMixin],

  renderMessageGroup(group) {
    let props = this.props;
    let lastReadGroup = groupContainsLastRead(group);
    let attachedCardsToggleEnabled = _.get(this.feature_flags, 'web_client_attach_to_collapsable_enabled');
    return (
      <MessageGroup
        group={group}
        key={group.key}
        shouldHideGifs={props.shouldHideGifs}
        shouldHideAttachedCards={props.shouldHideAttachedCards}
        should_animate_avatar={props.should_animate_avatar}
        attachedCardsToggleEnabled={attachedCardsToggleEnabled}
        use24hrTime={props.use24hrTime}
        shouldShowLastViewed={props.showUnreadDivider}
        lastReadGroup={lastReadGroup}
        nameDisplay={props.nameDisplay}
        chat_view={props.chat_view}
        chat_type={props.chat_type}
        chat_id={props.chat_id}
        is_guest={props.is_guest}
        integrationsEnabled={props.integrationsEnabled}
        addon_avatars={props.addon_avatars}
        honest_messages_enabled={this.feature_flags.web_client_honest_messages}
        message_editing_enabled={this.feature_flags.web_client_message_editing} />
    );
  },

  componentWillMount() {
    this.feature_flags = ConfigStore.get('feature_flags');
    AppDispatcher.register('updated:config', this._updateConfig);
  },

  componentWillUnmount() {
    AppDispatcher.unregister('updated:config', this._updateConfig);
  },

  renderDateMessages({date, messages}) {
    let attach_enabled = _.get(this.feature_flags, 'web_client_attach_to_rendering_enabled') && CardHelper.cardsEnabled(this.feature_flags);
    let groupedMessages = groupNearbyMessages(messages, attach_enabled);

    return (
      <div className='date-block' key={date.replace(/\s/g, '')}>
        <div className='date-divider' data-copyable={`{"format": "date-divider"}`}>
          <span>{date}</span>
        </div>
        {groupedMessages.map(this.renderMessageGroup)}
      </div>
    );
  },

  render() {
    let messages = this.props.messages;

    if (!this.props.show_join_leave_messages) {
      messages = messages.filter(msg => !msg.is_presence_message);
    }

    return (
      <div className="hc-messages">
        {groupByDate(messages).map(this.renderDateMessages)}
      </div>
    );
  },

  _updateConfig(config) {
    this.feature_flags = _.get(config, 'feature_flags');
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/messages.js
 **/