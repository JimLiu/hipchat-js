import GroupChatHeader from './groupchat_header';
import OTOHeader from './oto_header';
import ChatHeaderStore from 'stores/chat_header_store';
import PreferencesStore from "stores/preferences_store";
import PermissionsStore from "stores/permissions_store";
import ReadOnlyStore from 'stores/read_only_store';
import IntegrationsStore from 'stores/integrations_store';
import PureRenderMixin from 'react-addons-pure-render-mixin';

let integration_events = [
  'change:should_show_warning_icon'
];

function getState() {
  var chat = ChatHeaderStore.get('chat'),
      presence = chat.presence || {};

  return {
    type: ChatHeaderStore.get('type'),
    initialized: ChatHeaderStore.get('initialized'),
    path_prefix: ChatHeaderStore.get('path_prefix'),
    name: chat.name,
    jid: ChatHeaderStore.get('active_chat'),
    room_id: chat.id,
    privacy: chat.privacy,
    topic: chat.topic,
    guest_url: chat.guest_url,
    is_archived: chat.is_archived,
    title: chat.title,
    photo_large: chat.photo_large,
    loading_profile: chat.loading_profile,
    presence_status: presence.status,
    presence_show: presence.show,
    mention_name: chat.mention_name,
    time: chat.time,
    email: chat.email,
    active_chat: ChatHeaderStore.get('active_chat'),
    do_emoticons: PreferencesStore.shouldReplaceTextEmoticons(),
    should_animate_avatar: PreferencesStore.shouldAnimateAvatars(),
    groupchat_active_panel: PreferencesStore.getGroupChatActivePanel(),
    groupchat_show_sidebar: PreferencesStore.shouldShowGroupChatSidebar(),
    chat_active_panel: PreferencesStore.getChatActivePanel(),
    chat_show_sidebar: PreferencesStore.shouldShowChatSidebar(),
    topic_editing: ChatHeaderStore.get('topic_editing'),
    topic_input_value: chat.topic,
    can_create_room: PermissionsStore.canCreateRoom(),
    can_manage_room_integrations: PermissionsStore.canManageRoomIntegrations(),
    can_view_guest_access: PermissionsStore.canViewGuestAccess(),
    can_toggle_guest_access: PermissionsStore.canToggleGuestAccess(),
    read_only_mode: ReadOnlyStore.get('read_only_mode'),
    video_enabled: ChatHeaderStore.get('video_enabled'),
    user_is_admin: PermissionsStore.get('user_is_room_admin'),
    per_room_notifications_enabled: ChatHeaderStore.get('per_room_notifications_enabled'),
    web_client_integrations_enabled: ChatHeaderStore.get('web_client_integrations_enabled'),
    web_client_addlive_video_enabled: ChatHeaderStore.get('web_client_addlive_video_enabled'),
    web_client_enso_video_enabled: ChatHeaderStore.get('web_client_enso_video_enabled'),
    web_client_enso_room_video_enabled: ChatHeaderStore.get('web_client_enso_room_video_enabled'),
    show_integrations_warning_icon: IntegrationsStore.get('should_show_warning_icon')
  };
}

module.exports = React.createClass({

  displayName: "ChatHeader",

  mixins: [PureRenderMixin],

  getInitialState: function () {
    return getState();
  },

  componentDidMount: function() {
    ChatHeaderStore.on('change', this._onChange);
    PreferencesStore.on('change', this._onChange);
    PermissionsStore.on('change', this._onChange);
    IntegrationsStore.on(integration_events, this._onChange);
  },

  componentWillUnmount: function() {
    ChatHeaderStore.off('change', this._onChange);
    PreferencesStore.off('change', this._onChange);
    PermissionsStore.off('change', this._onChange);
    IntegrationsStore.off(integration_events, this._onChange);
  },

  _onChange: function(){
    this.setState(getState());
  },

  _getHeader: function () {
    if (this.state.type === 'chat') {
      return <OTOHeader photo_large={this.state.photo_large}
                        jid={this.state.jid}
                        id={this.state.room_id}
                        active_panel={this.state.chat_active_panel}
                        show_sidebar={this.state.chat_show_sidebar}
                        name={this.state.name}
                        mention_name={this.state.mention_name}
                        loading_profile={this.state.loading_profile}
                        presence_status={this.state.presence_status}
                        presence_show={this.state.presence_show}
                        time={this.state.time}
                        email={this.state.email}
                        title={this.state.title}
                        video_enabled={this.state.video_enabled}
                        should_animate_avatar={this.state.should_animate_avatar}
                        read_only_mode={this.state.read_only_mode}
                        web_client_enso_video_enabled={this.state.web_client_enso_video_enabled}
                        web_client_addlive_video_enabled={this.state.web_client_addlive_video_enabled}
                        web_client_integrations_enabled={this.state.web_client_integrations_enabled}/>;
      } else if (this.state.type === 'groupchat') {
        return <GroupChatHeader name={this.state.name}
                                jid={this.state.jid}
                                path_prefix={this.state.path_prefix}
                                room_id={this.state.room_id}
                                privacy={this.state.privacy}
                                type={this.state.type}
                                guest_url={this.state.guest_url}
                                is_archived={this.state.is_archived}
                                topic={this.state.topic}
                                initialized={this.state.initialized}
                                topic_editing={this.state.topic_editing}
                                topic_input_value={this.state.topic_input_value}
                                active_panel={this.state.groupchat_active_panel}
                                show_sidebar={this.state.groupchat_show_sidebar}
                                do_emoticons={this.state.do_emoticons}
                                is_guest={this.props.is_guest}
                                can_create_room={this.state.can_create_room}
                                can_view_guest_access={this.state.can_view_guest_access}
                                can_toggle_guest_access={this.state.can_toggle_guest_access}
                                can_manage_room_integrations={this.state.can_manage_room_integrations}
                                per_room_notifications_enabled={this.state.per_room_notifications_enabled}
                                user_is_admin={this.state.user_is_admin}
                                video_enabled={this.state.video_enabled}
                                read_only_mode={this.state.read_only_mode}
                                web_client_enso_video_enabled={this.state.web_client_enso_video_enabled}
                                web_client_enso_room_video_enabled={this.state.web_client_enso_room_video_enabled}
                                web_client_integrations_enabled={this.state.web_client_integrations_enabled}
                                show_integrations_warning_icon={this.state.show_integrations_warning_icon}/>;
    }
    return <div></div>;
  },

  render: function () {
    var header = this._getHeader();

    return (
      <header className="aui-page-header room-header">
        {header}
      </header>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/chat_header.js
 **/