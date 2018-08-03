import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: "ChatWindowEmptyState",

  propTypes: {
    chatName: React.PropTypes.string,
    firstName: React.PropTypes.string,
    type: React.PropTypes.string,
    jid: React.PropTypes.string,
    web_server: React.PropTypes.string
  },

  mixins: [PureRenderMixin],

  getDefaultProps: function () {
    return {
      chatName: "",
      firstName: "",
      jid: "",
      web_server: "",
      type: ""
    };
  },

  _getEmptyState: function () {
    var emptyState;
    if (this.props.type === "chat") {
      emptyState = this._getOTOEmptyState();
    } else {
      emptyState = this._getGroupChatEmptyState();
    }
    return emptyState;
  },

  _getGroupChatEmptyState: function () {
    return (
      <div ref="empty_state" className="empty-state groupchat">
        <div className="empty-state-img"></div>
        <div className="empty-state-msg">
          <p className="empty-header">
          Welcome to the {this.props.chatName} room!
          </p>
          <p className="empty-msg">
            This window is kinda empty, huh? It fills up fast when you
            <br/>
            start chatting with your friends. Happy chatting!
          </p>
        </div>
      </div>
    );
  },

  _getOTOEmptyState: function () {
    return (
      <div ref="empty_state" className="empty-state chat">
        <div className="empty-state-img"></div>
        <div className="empty-state-msg">
          <p className="empty-header">
          Say Hello to {this.props.chatName}!
          </p>
          <p className="empty-msg">
            You haven't talked to {this.props.firstName} before. Why not break the ice with
            <br/>
            an emoticon? (fonzie) <img src={`https://${this.props.web_server}/wc/assets/img/embedded/fonzie@3x.png`} width="34" height="25"/>
          </p>
        </div>
      </div>
    );
  },

  render: function() {
    return (
      <div className="empty">
        {this._getEmptyState()}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/empty_state.js
 **/