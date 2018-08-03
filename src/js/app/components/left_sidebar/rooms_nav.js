import LobbyNavItem from './lobby_nav_item';
import SearchNavItem from './search_nav_item';
import RoomsNavPeopleList from './rooms_nav_people_list';
import RoomsNavRoomList from './rooms_nav_room_list';
import RoomsNavStore from 'stores/rooms_nav_store';
import RoomNavActions from 'actions/room_nav_actions';
import AnalyticsActions from 'actions/analytics_actions';
import AppDispatcher from 'dispatchers/app_dispatcher';
import utils from 'helpers/utils';

function getState() {
  var rooms = RoomsNavStore.get('rooms');
  return {
    rooms: rooms["rooms"],
    people: rooms["people"],
    room_order: RoomsNavStore.get('room_order'),
    active_chat: RoomsNavStore.get('active_chat'),
    feature_flags: RoomsNavStore.get('feature_flags'),
    group_name: RoomsNavStore.get('group_name'),
    group_avatar_url: RoomsNavStore.get('group_avatar_url'),
    group_avatar_bg: RoomsNavStore.get('group_avatar_bg'),
    search_nav_item_visible: RoomsNavStore.get('search_nav_item_visible'),
    drag_target: RoomsNavStore.get('drag_target'),
    drag_over_target: RoomsNavStore.get('drag_over_target'),
    drag_over_clientY: RoomsNavStore.get('drag_over_clientY'),
    dragging: RoomsNavStore.get('dragging'),
    ui_available: RoomsNavStore.get('ui_available')
  };
}

module.exports = React.createClass({

  displayName: "RoomsNav",

  getInitialState: function() {
    return getState();
  },

  componentDidMount: function() {
    RoomsNavStore.on('change', this._onChange);
    this.placeholder = document.createElement("li");
    this.placeholder.className = "hc-sortable-placeholder";
    this.launchToActiveChatCalled = false;
  },

  componentWillMount: function() {
    AppDispatcher.register("after:restore-room-order", this._scrollToActiveChat);
  },

  componentWillUnmount: function() {
    RoomsNavStore.off('change', this._onChange);
    this.placeholder = null;
    AppDispatcher.unregister("after:restore-room-order", this._scrollToActiveChat);
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (this.state.ui_available && !this.launchToActiveChatCalled) {
      // This should only fire once after the preloader has been removed
      this._handleLaunchToActiveChatList();
    }
    if (prevState.active_chat !== this.state.active_chat && !utils.jid.is_search(this.state.active_chat)) {
      this._scrollToActiveChat();
    }
    if (this.state.dragging && this.state.drag_over_target && this.state.drag_over_clientY) {
      this._dragOver();
    } else if (!this.state.dragging && this.state.drag_target) {
      this._dragEnd();
    }
  },

  _onChange: function() {
    this.setState(getState());
  },

  _getChatCount: function () {
    return this.state.rooms.length + this.state.people.length;
  },

  _handleLaunchToActiveChatList: function () {
    AnalyticsActions.handleLaunchToActiveChatList({
      size: this._getChatCount()
    });
    this.launchToActiveChatCalled = true;
  },

  _scrollToActiveChat: function () {
    var element = $(ReactDOM.findDOMNode(this)).find("[data-jid='" + this.state.active_chat + "']"),
      container = ReactDOM.findDOMNode(this).parentNode;

    if (element && element.length) {
      utils.scrollIntoViewIfNeeded(element[0], container);
    }
  },

  _dragOver: function () {
    var $tabTarget = $(this.state.drag_over_target).closest(".hc-tab"),
        $container = $tabTarget.closest(".hc-sortable"),
        clientY = this.state.drag_over_clientY,
        relY,
        tabHeight = $tabTarget.height(),
        height = tabHeight / 2;

    if (this._allowDrop($container) && $tabTarget.length && ($tabTarget.hasClass('hc-room') || $tabTarget.hasClass('hc-person'))) {
      relY = clientY - $tabTarget.offset().top;
      if (relY > height) {
        $tabTarget.after(this.placeholder);
      } else if(relY < height) {
        $tabTarget.before(this.placeholder);
      }
    }
  },

  _dragEnd: function () {
    var jid_order = _.cloneDeep(this.state.room_order),
        $placeholder = $(".hc-sortable").find(".hc-sortable-placeholder"),
        end = _.indexOf(jid_order, $(this.state.drag_target).data('jid')),
        start = Number($placeholder.index() - 1);

    if (this.state.drag_target && this.state.drag_target.classList.contains("hc-person")) {
      start = start + ReactDOM.findDOMNode(this).querySelectorAll(".hc-room").length;
    }
    $placeholder.remove();
    if (end < start) {
      start--;
    }
    jid_order.splice(start, 0, jid_order.splice(end, 1)[0]);
    RoomNavActions.update_room_order(jid_order);
  },

  _allowDrop: function ($container) {
    // Prevent dropping rooms in people list & vice versa
    return (this.state.drag_target &&
      ((this.state.drag_target.classList.contains("hc-room") && $container.hasClass("hc-rooms")) ||
      (this.state.drag_target.classList.contains("hc-person") && $container.hasClass("hc-people"))));
  },

  _getLobbyItem: function () {
    var lobby_is_active = (!this.state.active_chat || utils.jid.is_lobby(this.state.active_chat));

    return <LobbyNavItem ref="lobby"
                         active={lobby_is_active}
                         group_avatar_url={this.state.group_avatar_url}
                         group_avatar_bg={this.state.group_avatar_bg}
                         group_name={this.state.group_name} />;
  },

  _getSearchItem: function () {
    return <SearchNavItem ref="search" active={utils.jid.is_search(this.state.active_chat)} />;
  },

  render: function() {
    var searchNavItem = (this.state.search_nav_item_visible) ? this._getSearchItem() : false,
        lobbyNavItem = this._getLobbyItem();

    return (
      <div className="aui-navgroup-inner">
        {lobbyNavItem}
        {searchNavItem}
        <RoomsNavRoomList rooms={this.state.rooms} active_chat={this.state.active_chat} can_create_room={this.props.can_create_room} />
        <RoomsNavPeopleList people={this.state.people} active_chat={this.state.active_chat} can_invite_users={this.props.can_invite_users} />
      </div>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/rooms_nav.js
 **/