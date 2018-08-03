import Lobby from 'components/lobby/lobby';
import SearchResults from 'components/search/search_results';
import RightSidebar from "components/right_sidebar/sidebar";
import ChatHeader from 'components/chat_header/chat_header';
import ChatPanel from 'components/chat_window/chat_panel';
import ChatInputBox from 'components/chat_input/chat_input_box';
import ResizeOverlay from 'components/common/overlays/resize-overlay';
import utils from 'helpers/utils';
import LayoutStore from 'stores/layout_store';
import PreferencesStore from 'stores/preferences_store';
import LayoutActions from 'actions/layout_actions';
import appConfig from 'config/app_config';
import cx from 'classnames';

function getState(){
  var active_chat = LayoutStore.get("active_chat");
  return {
    active_chat: active_chat,
    chat_type: utils.room.detect_chat_type(active_chat),
    rightChatSidebarVisibility: PreferencesStore.shouldShowChatSidebar(),
    rightGroupChatSidebarVisibility: PreferencesStore.shouldShowGroupChatSidebar(),
    rightColumnWidth: PreferencesStore.getRightColumnWidth(),
    search_opened: LayoutStore.get('search_opened'),
    is_resizing: false
  };
}

export default React.createClass({

  displayName: "MainColumn",

  shouldComponentUpdate: function(nextProps, nextState) {
    return !_.isEqual(nextState, this.state);
  },

  getInitialState: getState,

  componentDidMount: function(){
    PreferencesStore.on(['change:showChatSidebar', 'change:showGroupChatSidebar', 'change:rightColumnWidth'], this._onChange);
    LayoutStore.on(['change:active_chat', 'change:search_opened'], this._onChange);
    if (utils.jid.is_chat(this.state.active_chat)) {
      this._resizeColumns(this.state.rightColumnWidth);
    }
  },

  componentDidUpdate: function() {
    if (utils.jid.is_chat(this.state.active_chat)) {
      this._resizeColumns(this.state.rightColumnWidth);
    }
  },

  componentWillUnmount: function(){
    PreferencesStore.off(['change:showChatSidebar', 'change:showGroupChatSidebar', 'change:rightColumnWidth'], this._onChange);
    LayoutStore.off(['change:active_chat', 'change:search_opened'], this._onChange);
  },

  _getRightSidebar: function () {
    return (
      <div className="hc-right-sidebar-col">
        <RightSidebar is_guest={this.props.is_guest} />
        <ResizeOverlay show_overlay={this.state.is_resizing} />
        <div className="resize-handle" onMouseDown={this._onResizeStart}></div>
      </div>
    );
  },

  render: function () {
    var panel,
        chatClasses = cx({
          'hc-rooms-container': true,
          'hidden': !utils.jid.is_chat(this.state.active_chat)
        }),
        search_active = utils.jid.is_search(this.state.active_chat) && !this.props.is_guest,
        rightSidebar = (this._showRightSidebar()) ? this._getRightSidebar() : false;

    if (utils.jid.is_lobby(this.state.active_chat) && !this.props.is_guest) {
      panel = <Lobby />;
    } else {
      panel = (
        <div className={chatClasses} data-skate-ignore>
          <div className="hc-chat-panel-header-container">
            <ChatHeader is_guest={this.props.is_guest} />
          </div>
          <div className="hc-chat-panel-container">
            <div className="hc-chat-panel-left-column">
              <ChatPanel is_guest={this.props.is_guest} />
              <ChatInputBox is_guest={this.props.is_guest} />
            </div>
            <div className="hc-chat-panel-right-column" ref="right_column">
              {rightSidebar}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="hc-main-col">
        {this.state.search_opened ? <SearchResults visible={search_active} /> : false }
        {search_active ? false : panel}
      </div>
    );
  },

  _showRightSidebar: function () {
    if (this.state.chat_type === "chat") {
      return PreferencesStore.shouldShowChatSidebar();
    } else if (this.state.chat_type === "groupchat") {
      return PreferencesStore.shouldShowGroupChatSidebar();
    }
  },

  _onChange: function(){
    this.setState(getState());
  },

  _resizeColumns: function(width) {
    width = (this._showRightSidebar()) ? `${width}px` : '0px';
    this.refs.right_column.style.width = width;
  },

  _onResizeStart: function(e) {
    e.preventDefault();
    this.beginX = e.pageX;
    this.beginWidth = this.state.rightColumnWidth;
    document.addEventListener('mouseup', this._onResizeEnd);
    document.addEventListener('mousemove', this._onHandleDrag);
    LayoutActions.setRightColumnWidthIsChanging(true);

    this.setState({
      is_resizing: true
    });
  },

  _onHandleDrag(e) {
    var diff = e.pageX - this.beginX;
    if (this.beginWidth - diff >= 0 && this.beginWidth - diff <= appConfig.column_width_limits['right'].max) {
      var width = this.beginWidth - diff;
      this._resizeColumns(width);
      this.setState({
        rightColumnWidth: width
      });
    }
  },

  _onResizeEnd: function(e) {
    e.preventDefault();
    document.removeEventListener('mouseup', this._onResizeEnd);
    document.removeEventListener('mousemove', this._onHandleDrag);

    // if you've resized the right sidebar beyond the width limit then hide it
    if (ReactDOM.findDOMNode(this.refs.right_column).offsetWidth <= appConfig.column_width_limits['right'].min) {
      var visibility = false;
      if (this.state.chat_type === "chat") {
        LayoutActions.setRightChatSidebarVisibility(visibility);
      } else if (this.state.chat_type === "groupchat") {
        LayoutActions.setRightGroupChatSidebarVisibility(visibility);
      }
      LayoutActions.saveRightColumnWidth(this.beginWidth);
    } else {
      LayoutActions.saveRightColumnWidth(this.state.rightColumnWidth);
    }
    LayoutActions.setRightColumnWidthIsChanging(false);

    this.setState({
      is_resizing: false
    });
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/main_column/main_col.js
 **/