import EmptyStrings from 'strings/empty_state_strings';

export default React.createClass({

  displayName: "LobbyEmptyState",

  shouldComponentUpdate(){
    return false;
  },

  render(){
    return (
      <div className="empty empty-lobby">
        <div className="empty-state">
          <div className="empty-lobby-state-img"></div>
          <div className="empty-state-msg">
            <p className="empty-header">
              {EmptyStrings.empty_lobby_title}
            </p>
            <p className="empty-msg">
              {EmptyStrings.empty_lobby_message}
            </p>
          </div>
        </div>
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/lobby/empty_state.js
 **/