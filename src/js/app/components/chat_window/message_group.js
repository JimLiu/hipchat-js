import AnalyticsActions from 'actions/analytics_actions';
import ChatWindowActions from 'actions/chat_window_actions';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import ChatPanelStrings from 'strings/chat_panel_strings';
import cx from 'classnames';
import CardHelper from 'helpers/card_helper';
import utils, {dom} from 'helpers/utils';
import logger from 'helpers/logger';
import Message from './message_types/message';
import NotificationMessage from './message_types/notification';
import InfoMessage from './message_types/info';
import FileMessage from './message_types/file';
import FileError from './message_types/file_error';
import LinkMessage from './message_types/link';
import ImageMessage from './message_types/image';
import VideoMessage from './message_types/video';
import UserStateMessage from './message_types/user_state';
import TwitterStatusMessage from './message_types/twitter_status';
import TwitterUserMessage from './message_types/twitter_user';
import ActionableMessage from './message_actions/wrapper';
import AttachedCardsToggle from "./attached_cards_toggle";
import MessageWrapper from './message_wrapper';
import PersonAvatar from 'components/common/avatars/person_avatar';
import AppConfig from 'config/app_config';

const message_types = {
  message: Message,
  notification: NotificationMessage,
  info: InfoMessage,
  file: FileMessage,
  file_error: FileError,
  link: LinkMessage,
  image: ImageMessage,
  video: VideoMessage,
  user_state: UserStateMessage,
  twitter_status: TwitterStatusMessage,
  twitter_user: TwitterUserMessage
};

const actionable_message_types = [
  Message,
  NotificationMessage,
  FileError,
  FileMessage,
  ImageMessage
];

const editable_message_types = [
  Message,
  FileMessage,
  FileError
];

let CSSTransitionGroup = React.addons.CSSTransitionGroup;

export default React.createClass({

  displayName: 'ChatWindowMessageGroup',

  // group is immutable
  // addons_avatars is immutable object
  // others are primitives
  // so we can use DeepEqualRenderMixin
  mixins: [DeepEqualRenderMixin],

  getMsg() {
    return this.props.group.messages[0];
  },

  /**
   * Returns true if the message type requires full messaging to user of time or status
   * @param {object} msg
   */
  doesNeedFullMessaging(msg) {
    return !_.includes(['image', 'user_state', 'twitter_status', 'twitter_user', 'info'], msg.type);
  },

  getSeparator(withSeparator) {
    return withSeparator ? <span className='separator'>&middot;</span> : false;
  },

  /**
   * Returns the time (if applicable for this message type) wrapped in proper spans & classes
   * and formatted to either 12 or 24 hr time based on current preference passed via props
   * @param {boolean} withSeparator
   */
  _getTimeDisplay(mid, withSeparator) {
    var msg = this.getMsg(),
        timeDisplay;

    if (this.doesNeedFullMessaging(msg)) {
      timeDisplay = (
        <span className='hc-chat-status-time'>
          {this.getSeparator(withSeparator)}
          <span className='hc-chat-time'>{ utils.format_time(msg.date, this.props.use24hrTime) }</span>
        </span>
      );
    }

    return timeDisplay;
  },

  _getEditedIndicator(withSeparator) {
    if (this.doesNeedFullMessaging(this.getMsg()) && _.some(this.props.group.messages, 'replace')) {
      return (
        <span className='hc-chat-status-edited'>
          {this.getSeparator(withSeparator)}
          <span className='hc-chat-edited'>{ChatPanelStrings.edited}</span>
        </span>
      );
    }
  },

  /**
   * Returns messaging to indicate that a group of messages are unconfirmed
   * @param {boolean} withSeparator
   */
  _getUnconfirmedMessaging(mid, withSeparator) {
    var msg = this.getMsg(),
        unconfirmedMessaging;

    if (this.doesNeedFullMessaging(msg)) {
      unconfirmedMessaging = (
        <span className='hc-chat-status-unconfirmed'>
          {this.getSeparator(withSeparator)}
          <span ref='unconfirmed_messaging' className='unconfirmed-messaging'>{ChatPanelStrings.unconfirmed_message_group}</span>
        </span>
      );
    }

    return unconfirmedMessaging;
  },

  /**
   * Returns messaging to indicate that a message has failed
   * @param {boolean} withSeparator
   */
  _getFailedMessaging(mid, withSeparator) {
    var msg = this.getMsg(),
        failedMessaging;

    if (this.doesNeedFullMessaging(msg)) {
      failedMessaging = (
        <span className='hc-chat-status-failed'>
          {this.getSeparator(withSeparator)}
          <span ref='failed_messaging' className='failed-messaging'>{ChatPanelStrings.failed_message}</span>
          <span ref='failed_message_actions' className='failed-message-actions'>
            <a onClick={this.onFailedMessageRetryClick}>{ChatPanelStrings.failed_message_retry}</a>
            <a onClick={this.onFailedMessageCancelClick}>{ChatPanelStrings.failed_message_cancel}</a>
          </span>
        </span>
      );
    }

    return failedMessaging;
  },

  onFailedMessageRetryClick() {
    ChatWindowActions.onFailedRetry(this.getMsg());
    AnalyticsActions.failedMessageRetried();
  },

  onFailedMessageCancelClick() {
    ChatWindowActions.onFailedCancel(this.getMsg());
    AnalyticsActions.failedMessageCanceled();
  },

  /**
   * Get the appropriate sender text string. For Image/Emote messages -- defaults are applied
   * Pass in either 'name' or 'mentions' to return
   * @param {string} nameDisplay - either 'names' or 'mentions'
   */
  _getSenderText(nameDisplay) {
    let sender_text;
    let msg = this.getMsg();
    if (msg.type === 'image') {
      sender_text = 'Image';
    } else if (msg.isEmote) {
      sender_text = '';
    } else if (nameDisplay === 'mentions' && msg.sender_mention) {
      sender_text = `@${msg.sender_mention}`;
    } else {
      sender_text = msg.sender;
    }
    return sender_text;
  },

  _getAvatarUrl() {
    var msg = this.getMsg(),
        sender = _.get(msg, 'notification_sender');

    if (_.get(sender, 'type', '') === 'addon') {
      return _.get(this.props.addon_avatars, [sender.id, 'url']);
    }

    return msg.sender_avatar;
  },

  /**
   * Get the avatar markup
   */
  _getAvatarDisplay(avatarClickable) {
    let msg = this.getMsg();
    let avatar_url = this._getAvatarUrl();
    let hasAvatar = avatar_url && msg.type !== 'info';
    let avatarClickHandler = avatarClickable ? this.onSenderClicked : _.noop;

    if (hasAvatar) {
      return (
        <PersonAvatar name={msg.sender}
                      size="medium"
                      avatar_url={avatar_url}
                      show_presence={false}
                      shouldAnimate={this.props.should_animate_avatar}
                      onClick={avatarClickHandler}/>
      );
    }

    let sender = _.get(msg, 'notification_sender');
    if (!this._isAddon(sender) && this._isAvatarRequired(msg)) {
      return this._getAvatarWithInitials(msg.sender);
    }

    return false;
  },

  _isAddon(sender) {
    return _.get(sender, 'type', '') === 'addon';
  },

  /**
   * Defines if the avatar is required
   * @param msg
   * @private
   * @returns {Boolean}
   */
  _isAvatarRequired(msg) {
    return msg.type === 'message';
  },

  /**
   * Returns avatar with initials
   */
  _getAvatarWithInitials(sender) {
    let bgColor = AppConfig.default_guest_avatar_bg;

    return (
      <PersonAvatar name={sender}
                    size="medium"
                    avatar_bg_color={bgColor}
                    show_presence={false}/>
    );
  },

  /**
   * Get the sender name
   */
  _getSenderName(params) {
    let msg = this.getMsg();
    let hasSenderName = msg.type !== 'info';
    if (hasSenderName) {
      return (
        <span ref='sender_text' className='sender-name' onClick={this.onSenderClicked} aria-label={params.tooltip}>
          { params.sender }
        </span>
      );
    }
  },

  /**
   * Generates all the common values for the message group display, then branches based
   * on which chatView is currently applied
   */
  render() {
    var msg = this.getMsg(),
      sender = this._getSenderText(this.props.nameDisplay),
      tooltip = this._getSenderText((this.props.nameDisplay === 'mentions') ? 'name' : 'mentions'),
      isUnconfirmedGroup = this.isUnconfirmedGroup(),
      isFailedGroup = this.isFailedGroup(),
      rowClasses = cx({
        'hc-chat-row': true,
        [`hc-msg-${msg.color} hc-msg-${msg.type}`]: !isFailedGroup,
        'hc-classic-neue': this.isClassicNeueView(),
        'hc-chat-row-unconfirmed': isUnconfirmedGroup,
        'hc-chat-row-failed': isFailedGroup,
        'unread-line-row': this.props.lastReadGroup
      }),
      chatClasses = cx({
        'hc-chat-msg': true,
        'image-link': msg.type === 'image'
      });

    if (this.isClassicNeueView()) {
      return this._renderClassicNeueView({
        rowClasses, chatClasses, sender, tooltip, isFailedGroup, isUnconfirmedGroup
      });
    }

    return this._renderStandardView({
      rowClasses, chatClasses, sender, tooltip, isFailedGroup, isUnconfirmedGroup
    });
  },

  isClassicNeueView() {
    // guest user forced to use standard view because DAL:guest-fetched-room-participants call don't return sender_avatar
    return this.props.chat_view === 'classic_neue' && !this.props.is_guest;
  },

  isUnconfirmedGroup() {
    // A group of all unconfirmed messages renders differently than a group of messages with a mix of statuses
    return _.every(this.props.group.messages, {status: 'unconfirmed'}) && this.props.honest_messages_enabled;
  },

  isFailedGroup() {
    // Failed messages should always be in their own group, so here we only check the first message
    return this.getMsg().status === 'failed';
  },

  /**
   * Renders the standard view for the chat messages -- that includes the
   * sender to the left and time to the right, with the messages stacked in between
   */
  _renderStandardView(params) {
    var msg = this.getMsg(),
        senderClasses = cx({
          'hc-chat-from': true,
          'invisible': msg.type === 'user_state'
        }),
        failedGroupMessaging;

    if (params.isFailedGroup) {
      failedGroupMessaging = this._getFailedMessaging(msg.mid, false);
    }

    return (
      <div className={params.rowClasses} ref="message_group_root" onClick={this._onMessageClicked}>
        <div className={senderClasses}>
          <span onClick={this.onSenderClicked} ref='sender_text' className='sender-name' aria-label={params.tooltip}>
            { params.sender }
          </span>
        </div>
        <div className={params.chatClasses}>
          { this._renderMessages() }
          { failedGroupMessaging }
        </div>
      </div>
    );
  },

  /**
   * Renders the 'classic_neue' view for the chat messages -- that includes
   * the avatar on the left with the sender/time/status above the messages
   */
  _renderClassicNeueView(params) {
    var msg = this.getMsg(),
        fromAddon = _.get(msg, 'notification_sender.type', 'user') === 'addon',
        avatar = this._getAvatarUrl(),
        hasAvatar = (avatar && msg.type !== 'info'),
        avatarClickable = hasAvatar && !fromAddon,
        avatarClasses = cx({
          'hc-chat-from': true,
          'no-action': !avatarClickable,
          'invisible': msg.type === 'user_state'
        }),
        timeDisplay, failedGroupMessaging, unconfirmedGroupMessaging, editedIndicator;

    if (params.isFailedGroup) {
      failedGroupMessaging = this._getFailedMessaging(msg.mid, true);
    } else if (params.isUnconfirmedGroup) {
      unconfirmedGroupMessaging = this._getUnconfirmedMessaging(msg.mid, true);
    } else {
      timeDisplay = this._getTimeDisplay(msg.mid, true);
      editedIndicator = this._getEditedIndicator(true);
    }

    return (
      <div className={params.rowClasses} ref="message_group_root" onClick={this._onMessageClicked}>
        <div className={avatarClasses}>
          { this._getAvatarDisplay(avatarClickable) }
        </div>
        <div className={params.chatClasses}>
          { this._getSenderName(params) }
          <CSSTransitionGroup transitionName="message-confirm-state" transitionAppear={false} transitionEnterTimeout={150} transitionLeaveTimeout={150}>
            { unconfirmedGroupMessaging }
            { failedGroupMessaging }
            { timeDisplay }
            { editedIndicator }
          </CSSTransitionGroup>
          { this._renderMessages() }
        </div>
      </div>
    );
  },

  /**
   * Renders the blue line that denotes unread messages
   */
  _renderBlueLine() {
    if (!this.props.shouldShowLastViewed) {
      return;
    }

    return (
      <div className="unread-line" key={'unread-line-' + _.uniqueId()}>
        <hr />
      </div>
    );
  },

  /**
   * Renders all the messages in the group
   */
  _renderMessages() {
    var integrationsEnabled = this.props.integrationsEnabled;
    var uniqueMesssages = _.uniq(this.props.group.messages);
    var attachedCardsToggleEnabled = this.props.attachedCardsToggleEnabled;
    var attachedTo = _.uniq(uniqueMesssages.reduce((current, message) => {
      if (CardHelper.isValidCard(message.card)) {
        let attachToMid = utils.getAttachToMid(message);
        if (attachToMid) {
          current.push(attachToMid);
        }
      }
      return current;
    }, []));

    var collapsed = null;
    var messageMarkup = [];

    uniqueMesssages.forEach((message, index, arr) => {
      try {
        let MessageType = message_types[message.type];
        if (!MessageType) {
          return undefined;
        }

        let msg = <MessageType
                    key={'msg-' + message.mid}
                    ref={'msg_' + message.mid}
                    msg={message}
                    use24hrTime={this.props.use24hrTime}
                    shouldHideAttachedCards={this.props.shouldHideAttachedCards}
                    shouldHideGifs={this.props.shouldHideGifs}/>;

        if (attachedCardsToggleEnabled && attachedTo.indexOf(message.mid) >= 0) {
          if (utils.isAttachedCardsCollapsed(message, this.props.shouldHideAttachedCards)) {
            collapsed = message.mid;
          } else {
            collapsed = null;
          }

          var toggle = <AttachedCardsToggle key={message.mid}
                                            mid={message.mid}
                                            collapsed={!!collapsed}/>;
          msg = [toggle, msg];
        } else {
          msg = [msg];
        }

        let time = this._getTimeDisplay(message.mid, false);
        let editedIndicator = this._getEditedIndicator(false);
        // For standard view, show the time or unconfirmed status only for the top message
        if (index === 0 && !this.isClassicNeueView()) {
          if (this.isUnconfirmedGroup()) {
            let unconfirmedGroupMessaging = this._getUnconfirmedMessaging(message.mid, false);
            msg.unshift(unconfirmedGroupMessaging);
          } else if (time && !this.isFailedGroup()) {
            if (editedIndicator) {
              msg.unshift(editedIndicator);
            }
            msg.unshift(time);
          }
        }

        if (collapsed && CardHelper.isValidCard(message.card)) {
          let attachToMid = utils.getAttachToMid(message);
          if (collapsed === attachToMid) {
            return undefined;
          }
        }

        let innerMessage,
            isEditableType = _.includes(editable_message_types, MessageType),
            isActionableType = _.includes(actionable_message_types, MessageType);
        if (isActionableType && integrationsEnabled && this.props.chat_type === 'groupchat' ||
            isActionableType && this.props.message_editing_enabled && this.props.chat_type === 'chat') {
          innerMessage = (
            <ActionableMessage key={'actionable-message-' + message.mid}
                               msg={message}
                               is_editable={isEditableType && message.sender_is_current_user && message.body !== ''}
                               chat_type={this.props.chat_type}
                               message_editing_enabled={this.props.message_editing_enabled}>
              {msg}
            </ActionableMessage>
          );
        } else {
          innerMessage = msg;
        }

        messageMarkup.push(<MessageWrapper key={'msg-wrapper-' + message.mid}
                               messageStatus={message.status}
                               innerMessage={innerMessage}
                               is_guest={this.props.is_guest}
                               chat_id={this.props.chat_id}
                               honest_messages_enabled={this.props.honest_messages_enabled}
                               msg={message} />);

        if (message.last_read_message) {
          messageMarkup.push(this._renderBlueLine());
        }

      } catch (e) {
        logger.warn(message);
      }
    });

    return messageMarkup;
  },

  onSenderClicked(e) {
    e.preventDefault();
    let msg = this.getMsg();
    let mentionName = msg.sender_mention;
    if (mentionName) {
      ChatWindowActions.senderClick({mention: '@' + mentionName});
    } else {
      logger.warn('Sender mention does not exists', msg);
    }
  },

  _onMessageClicked(evt) {
    if (evt.target) {
      let target = dom.findParentMatching(evt.target, dom.matchers.tag("a"), ReactDOM.findDOMNode(this.refs.message_group_root));

      if (target) {
        if (!_.get(window, 'HC.isEmbeddedComponent')) {

          if (!target.hasAttribute("rel")) {
            target.setAttribute('rel', "noreferrer");
          }

          target.setAttribute('target', '_blank');
        }
      }
    }
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_group.js
 **/