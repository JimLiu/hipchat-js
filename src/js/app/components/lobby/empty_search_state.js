import CommonStrings from 'strings/common_strings';
import EmptyStrings from 'strings/empty_state_strings';
import AnalyticsActions from 'actions/analytics_actions';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: "LobbyEmptySearchState",

  mixin: [PureRenderMixin],

  getDefaultProps: function() {
    return {
      inputText: ""
    };
  },

  componentDidMount: function () {
    AnalyticsActions.lobbyNoResults(this.props.inputText);
  },

  _inviteLink: function(){

    if (this.props.userIsAdmin || this.props.inviteUrl){

      var link = <a target="_blank" className="aui-inline-dialog-trigger" onClick={this.props.inviteAction} >{CommonStrings.buttons.invite_team_in_lobby}</a>;

      if (!this.props.inviteUrl) {
        link = <a target="_blank" className="aui-inline-dialog-trigger" href={`https://${this.props.webServer}/admin`}>{CommonStrings.buttons.invite_team_in_lobby}</a>;
      }

      return <p className="empty-msg">{link}</p>;
    }
  },

  render: function(){
    return (
      <div className="empty empty-lobby empty-search-lobby">
        <div className="empty-state">
          <div className="empty-search-lobby-state-img"></div>
          <div className="empty-state-msg">
            <p className="empty-header">
              {EmptyStrings.empty_search_lobby}
            </p>
            {this._inviteLink()}
          </div>
        </div>
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/lobby/empty_search_state.js
 **/