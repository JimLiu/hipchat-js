var CreateRoomNavItem = require('./create_room_nav_item');
var RoomsNavItemRoom = require('./rooms_nav_item_room');
var RoomNavActions = require("actions/room_nav_actions");
var CommonStrings = require("strings/common_strings");

module.exports = React.createClass({

  displayName: "RoomsNavRoomList",

  _onDragOver: function (e) {
    RoomNavActions.dragOver({
      event: e
    });
  },

  _getCreateRoomLink: function () {
    return <CreateRoomNavItem />;
  },

  _getRoomList: function () {
    return _.map(this.props.rooms, (room) => {
      return <RoomsNavItemRoom key={"RoomsNavRoomItem" + room.jid + room.type}
                                unreadCount={room.unreadCount}
                                hasMention={room.hasMention}
                                isUpdating={room.isUpdatingUnreadCount}
                                active={this.props.active_chat === room.jid}
                                name={room.name}
                                jid={room.jid}
                                type={room.type}
                                privacy={room.privacy} />;
    });
  },

  _getRoomsContent: function (createRoomLink) {
    var roomList = (this.props.rooms && this.props.rooms.length) ? this._getRoomList() : false;

    return (
      <ul ref="room_list" className="aui-nav hc-sidebar-nav hc-sortable hc-rooms" onDragOver={this._onDragOver} data-skate-ignore>
        <li className="aui-nav-heading"><strong>{CommonStrings.rooms}</strong></li>
        {roomList}
        {createRoomLink}
      </ul>
    );
  },

  render: function() {
    var createRoomLink = (this.props.can_create_room) ? this._getCreateRoomLink() : false,
        roomsContent = (this.props.rooms && this.props.rooms.length || createRoomLink) ? this._getRoomsContent(createRoomLink) : false;

    return (
      <div key="RoomsNavRooms">
        {roomsContent}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/rooms_nav_room_list.js
 **/