var InviteUsersNavItem = require('./invite_users_nav_item');
var RoomsNavItemPerson = require('./rooms_nav_item_person');
var RoomNavActions = require("actions/room_nav_actions");
var CommonStrings = require("strings/common_strings");

module.exports = React.createClass({

  displayName: "RoomsNavPeopleList",

  _onDragOver: function (e) {
    RoomNavActions.dragOver({
      event: e
    });
  },

  _getInviteUsers: function () {
    return <InviteUsersNavItem />;
  },

  _getPeopleList: function () {
    var peopleList = _.map(this.props.people, (room) => {
      return <RoomsNavItemPerson key={"RoomsNavPersonItem" + room.jid + room.type}
                                  unreadCount={room.unreadCount}
                                  isUpdating={room.isUpdatingUnreadCount}
                                  active={this.props.active_chat === room.jid}
                                  name={room.name}
                                  jid={room.jid}
                                  type={room.type}
                                  uid={room.id}
                                  presence={room.presence.show}
                                  status={room.presence.status}
                                  mobile={room.mobile} />;
    });
    return peopleList;
  },

  _getPeopleContent: function (inviteUsersLink) {
    var peopleList = (this.props.people && this.props.people.length) ? this._getPeopleList() : false;

    return (
      <ul ref="people_list" className="aui-nav hc-sidebar-nav hc-sortable hc-people" onDragOver={this._onDragOver} data-skate-ignore>
        <li className="aui-nav-heading"><strong>{CommonStrings.people}</strong></li>
        {peopleList}
        {inviteUsersLink}
      </ul>
    );
  },

  render: function() {
    var inviteUsersLink = (this.props.can_invite_users) ? this._getInviteUsers() : false,
        peopleContent = (this.props.people && this.props.people.length || inviteUsersLink) ? this._getPeopleContent(inviteUsersLink) : false;

    return (
      <div key="RoomsNavPeople">
        {peopleContent}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/rooms_nav_people_list.js
 **/