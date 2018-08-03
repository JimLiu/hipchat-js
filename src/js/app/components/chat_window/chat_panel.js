import MessageList from "./message_list";
import ChatWindowStore from "stores/chat_window_store";
import IntegrationsStore from "stores/integrations_store";
import utils from "helpers/utils";
import WindowActions from "actions/chat_window_actions";

function getChatsState() {
  return ChatWindowStore.getAll();
}

function getAddonAvatars() {
  return {addon_avatars: IntegrationsStore.get('addon_avatars')};
}

function getInitialChatsState() {
  return _.extend(getAddonAvatars(), getChatsState());
}

let PureRenderMixin = React.addons.PureRenderMixin;

module.exports = React.createClass({

  displayName: "ChatPanel",

  mixins: [PureRenderMixin],

  getInitialState: function() {
    return getInitialChatsState();
  },

  componentDidMount: function() {
    ChatWindowStore.on(['change'], this._onChatStateChange);
    var size = 0;
    var members = this.state.chats && _.get(this.state, `chats["${this.state.active_chat}"].participants.members`);
    if (members) {
      size = members.length;
    }
    WindowActions.chatPanelMounted({id: this.state.active_chat, size: size});
    IntegrationsStore.on("change:addon_avatars", this._onAddonAvatarsChanged);
  },

  componentWillUnmount: function() {
    ChatWindowStore.off(['change'], this._onChatStateChange);
    IntegrationsStore.off('change:addon_avatars', this._onAddonAvatarsChanged);
  },

  render: function(){
    var styles = {
          zoom: this.state.zoom_level
        },
        chat;

    if (this.state.active_chat && utils.jid.is_chat(this.state.active_chat) && this.state.chats[this.state.active_chat]) {
      chat = <MessageList key={this.state.active_chat}
                          chat={this.state.chats[this.state.active_chat]}
                          is_guest={this.props.is_guest}
                          initialized={this.state.initialized}
                          web_server={this.state.web_server}
                          token={this.state.oauth2_token}
                          addon_avatars={this.state.addon_avatars}/>;
    }
    return (
      <div className="hc-chat-panel" style={styles}>
         {chat}
      </div>
    );
  },

  _onChatStateChange: function(){
    this.setState(getChatsState());
  },

  _onAddonAvatarsChanged() {
    this.setState(getAddonAvatars());
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/chat_panel.js
 **/