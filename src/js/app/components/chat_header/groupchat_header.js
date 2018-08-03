import TopicInput from "./topic_input";
import GroupChatHeaderButtons from "./groupchat_header_buttons";
import utils from "helpers/utils";
import ChatHeaderActions from 'actions/chat_header_actions';
import VideoActions from 'actions/video_actions';
import strings from 'strings/chat_header_strings';
import cx from 'classnames';
import emoticons from 'helpers/emoticons';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import GroupChatHeaderActions from 'actions/groupchat_header_actions';
import Spinner from 'components/common/spinner/spinner';
import AnalyticsActions from 'actions/analytics_actions';

export default React.createClass({

  displayName: "GroupChatHeader",

  mixins: [PureRenderMixin],

  propTypes: {
    do_emoticons: React.PropTypes.bool
  },

  componentDidUpdate: function() {
    emoticons._replaceSpecials(ReactDOM.findDOMNode(this));
  },

  _getTopic: function () {
    var topic;

    if (this.props.topic_editing) {
      topic = this._getTopicInput();
    } else {
      topic = this._getTopicText();
    }
    return topic;
  },

  _getTopicInput: function () {
    return <TopicInput topic_input_value={this.props.topic_input_value}/>;
  },

  _getTopicText: function () {
    var topic,
        escapedTopic,
        defaultTopicText = (this.props.is_guest) ? "" : strings.default_topic;

    // Topic is still loading, show spinner
    if (this.props.topic === null) {
      topic = <div className='topic-spinner'>
                <Spinner size='small'
                         spin={true}
                         left='0'
                         top='0'/>
              </div>;
    // Topic is loaded, but empty
    } else if (this.props.topic === '') {
      topic = <i className="hc-page-header-topic"
                 onDoubleClick={this._onTopicDoubleClick}>
                  {defaultTopicText}
              </i>;
    // Topic is loaded, not empty
    } else {
      escapedTopic = utils.escapeAndLinkify(this.props.topic, {
        escape_whitespace: true,
        do_word_breaks: false,
        do_emoticons: this.props.do_emoticons && this.props.initialized
      });
      topic = <div className="hc-page-header-topic"
                   title={this.props.topic}
                   onClick={this._onClick}
                   onDoubleClick={this._onTopicDoubleClick}
                   onCopy = {this._onCopy}
                   dangerouslySetInnerHTML={{__html: '<span>' + escapedTopic + '</span>'}}/>;
    }

    return topic;
  },

  _onCopy: function () {
    if (utils.link.identify_invite_link(window.getSelection().toString())) {
      AnalyticsActions.userInviteURLCopied();
    }
  },

  _onClick(evt) {
    let isLink = _.get(evt, 'target.tagName', '').toLowerCase() === 'a';
    let url = _.get(evt, 'target.href', null);
    let jid = this.props.jid;
    let room_id = this.props.room_id;

    if (!this.props.is_guest && isLink && !!url && utils.video.isVideoLink(url)) {
      evt.preventDefault();
      VideoActions.joinRoomVideoCall({ url, jid, room_id });
    }
  },

  _onTopicDoubleClick: function() {
    if (!this.props.is_guest) {
      ChatHeaderActions.editTopicInChatHeader();
    }
  },

  _getGroupChatButtons() {
    return <GroupChatHeaderButtons {...this.props} />;
  },

  _getGuestAccessLozenge() {
    if (!this.props.guest_url) {
      return null;
    }

    return (
      <span id="guest_access" className="guest-access-lozenge aui-lozenge aui-lozenge-complete aui-lozenge-subtle" onMouseOver={this._showGuestAccessInformation}>{strings.guest_access_on}</span>
    );
  },

  _showGuestAccessInformation() {
    GroupChatHeaderActions.showGuestAccessInformation({
      anchor: document.getElementById('guest_access'),
      guest_url: this.props.guest_url
    });
  },

  render: function () {
    var headerClasses = cx({
          'aui-page-header-main': true,
          'hc-page-header-main': true,
          'hc-integrations-enabled': this.props.web_client_integrations_enabled
        }),
        iconClasses = cx({
          'aui-icon': true,
          'hipchat-icon-huge': true,
          'icon-private': (this.props.privacy === "private"),
          'icon-public': (this.props.privacy === "public"),
          'icon-dot': (!this.props.privacy)
        }),
        topic = this._getTopic(),
        groupChatButtons = this._getGroupChatButtons(),
        guestAccess = this._getGuestAccessLozenge();

    return (
      <div className="aui-page-header-inner hc-groupchat">
        <div className="page-header-icon">
          <span className={iconClasses}></span>
        </div>
        <div className={headerClasses}>
          <div className="hc-groupchat-header">
            <h3>{this.props.name}</h3>{guestAccess}<br />
          </div>
          {topic}
        </div>
        {groupChatButtons}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/groupchat_header.js
 **/