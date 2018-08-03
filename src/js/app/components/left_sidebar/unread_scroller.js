import RoomNavStore from 'stores/rooms_nav_store';
import utils from 'helpers/utils';
import SidebarStrings from 'strings/sidebar_strings';
import RoomsNavActions from 'actions/room_nav_actions';
import cx from 'classnames';

//This constant describes vertical area size, where scroll starts while object dragging to box edge
const DRAG_SCROLL_THRESHOLD = 20;

//This constant is a scroll value for scroll while dragging.
const DRAG_SCROLL_VALUE = 12;

function isBelow(el, boundary) {
  // offsetHeight coefficient controls what percentage of the nav item must be visible
  // for the unread scroller to be considered "below" it
  return (el.offsetTop + el.offsetHeight * 0.5) > boundary;
}

function isAbove(el, boundary) {
  // offsetHeight coefficient controls what percentage of the nav item must be visible
  // for the unread scroller to be considered "above" it
  return (el.offsetTop + el.offsetHeight * 0.5) < boundary;
}

export default React.createClass({

  displayName: 'UnreadScroller',

  getInitialState() {
    return {
      hideTop: true,
      hideBottom: true,
      topMention: false,
      bottomMention: false
    };
  },

  componentWillMount() {
    this._throttledOnChange = _.throttle(this._onChange, 100, {
      trailing: true,
      leading: true
    });
    this._tabsAbove = [];
    this._tabsBelow = [];
    RoomNavStore.on('change', this._throttledOnChange);
  },

  componentWillUnmount() {
    this._throttledOnChange.cancel();
    RoomNavStore.off('change', this._throttledOnChange);
  },

  render() {
    var topClass = cx({
      'hidden': this.state.hideTop,
      'has-mention': this.state.topMention
    });
    var bottomClass = cx({
      'hidden': this.state.hideBottom,
      'has-mention': this.state.bottomMention
    });
    let autoScrollWhileDragBugPresent = utils.browser.is.firefox() || utils.browser.is.safari() || utils.browser.is.ie();
    autoScrollWhileDragBugPresent = autoScrollWhileDragBugPresent || utils.browser.family() === "unknown";
    let dragOverHandler = autoScrollWhileDragBugPresent ? this._dragOver : null;
    return (
      <nav className="aui-navgroup aui-navgroup-vertical hc-sidebar hc-sidebar-scroll" ref="target" onScroll={this._throttledOnChange} onDragOver={ dragOverHandler }>
        <div className={'hc-unread-scroller hc-unread-scroller-top ' + topClass}>
          <a href="#" onClick={this._scrollUpToUnread}><span className="aui-icon aui-icon-small aui-iconfont-arrows-up">{SidebarStrings.scroll_up_to_unread}</span></a>
        </div>

        {this.props.children}

        <div className={'hc-unread-scroller hc-unread-scroller-bottom ' + bottomClass}>
          <a href="#" onClick={this._scrollDownToUnread}><span className="aui-icon aui-icon-small aui-iconfont-arrows-down">{SidebarStrings.scroll_down_to_unread}</span></a>
        </div>
      </nav>
    );
  },

  _onChange() {
    this.setState(this._getState());
  },

  _getState() {
    var node = ReactDOM.findDOMNode(this.refs.target);
    var tabs = $('.hc-badge').closest('.hc-tab');
    this._tabsAbove = tabs.filter((idx,el) => {
      return isAbove(el, node.scrollTop);
    });
    this._tabsBelow = tabs.filter((idx,el) => {
      return isBelow(el, node.scrollTop + node.offsetHeight);
    });
    return {
      hideTop: !this._tabsAbove.length,
      hideBottom: !this._tabsBelow.length,
      topMention: $(this._tabsAbove).find('.hc-mention').length,
      bottomMention: $(this._tabsBelow).find('.hc-mention').length
    };
  },

  _dragOver: function (evt) {
    let isScrollTopNeed = evt.currentTarget.scrollTop > 0;
    let isScrollBottomNeed = evt.currentTarget.scrollHeight - evt.currentTarget.scrollTop - evt.currentTarget.clientHeight > 0;
    let crect = evt.currentTarget.getBoundingClientRect();
    let clientY = evt.clientY - crect.top;
    if (isScrollTopNeed && clientY <= DRAG_SCROLL_THRESHOLD) {
      evt.currentTarget.scrollTop -= DRAG_SCROLL_VALUE;
    }
    if (isScrollBottomNeed && (evt.currentTarget.clientHeight - clientY) <= DRAG_SCROLL_THRESHOLD) {
      evt.currentTarget.scrollTop += DRAG_SCROLL_VALUE;
    }
  },


  _scrollUpToUnread(evt) {
    evt.preventDefault();
    this.setState(this._getState());
    if (this._tabsAbove.length > 0) {
      let tab = this._tabsAbove.get(this._tabsAbove.length - 1),
          jid = $(tab).data('jid'),
          type = utils.jid.is_private_chat(jid) ? 'chat' : 'groupchat';
      utils.scrollIntoViewIfNeeded(tab, ReactDOM.findDOMNode(this.refs.target));
      RoomsNavActions.select(jid, type);
    }
  },

  _scrollDownToUnread(evt) {
    evt.preventDefault();
    this.setState(this._getState());
    if (this._tabsBelow.length > 0) {
      let tab = this._tabsBelow.get(0),
          jid = $(tab).data('jid'),
          type = utils.jid.is_private_chat(jid) ? 'chat' : 'groupchat';
      utils.scrollIntoViewIfNeeded(tab, ReactDOM.findDOMNode(this.refs.target));
      RoomsNavActions.select(jid, type);
    }
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/unread_scroller.js
 **/