var RoomsNav = require("./rooms_nav"),
    PermissionsStore = require('stores/permissions_store'),
    UnreadScroller = require('./unread_scroller');

function getState() {
  return {
    can_create_room: PermissionsStore.canCreateRoom(),
    can_invite_users: PermissionsStore.canInviteUsersToGroup()
  };
}

module.exports = React.createClass({

  displayName: "LeftSideBar",

  getInitialState: function(){
    return getState();
  },

  componentDidMount: function(){
    PermissionsStore.on('change', this._onChange);
  },

  componentWillUnmount: function(){
    PermissionsStore.off('change', this._onChange);
  },

  _onChange: function(){
    this.setState(getState());
  },

  render: function () {
    return (
      <UnreadScroller>
        <RoomsNav can_create_room={this.state.can_create_room} can_invite_users={this.state.can_invite_users} />
      </UnreadScroller>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/sidebar.js
 **/