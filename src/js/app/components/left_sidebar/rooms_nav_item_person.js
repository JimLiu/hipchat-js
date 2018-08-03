import PresenceIcon from "components/common/icon/presence-icon";
import UnreadBadge from './unread_badge';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import RooomsNavItemMixin from './mixins/rooms_nav_item_mixin';
import cx from 'classnames';

export default React.createClass({

  displayName: "RoomsNavItemPerson",

  mixins: [PureRenderMixin, RooomsNavItemMixin],

  _getUnreadBadge: function () {
    return <UnreadBadge unreadCount={this.props.unreadCount} hasMention={true} isUpdating={this.props.isUpdating} />;
  },

  render: function() {
    var hasBadge = (this.props.unreadCount > 0 && !this.props.active),
        unreadBadge = (hasBadge) ? this._getUnreadBadge() : false,
        classes = cx({
          'hc-tab': true,
          'aui-nav-selected': this.props.active,
          'hc-has-badge': hasBadge,
          'hc-person': true
        });

    return (
      <li ref="nav_item" draggable="true" className={classes} onDragStart={this._onDragStart} onDragEnd={this._onDragEnd} data-jid={this.props.jid}>
        <a ref="link" className="aui-nav-item" onClick={this._onSelectTab} aria-label={this.props.name} data-tipsify-ignore>
          <PresenceIcon active={true}
                        presence={this.props.presence}
                        mobile={this.props.mobile}
                        uid={this.props.uid}/>
          <span className="room-name">{this.props.name}</span>
          {unreadBadge}
        </a>
        <a ref="close_link" className="hc-tab-close" onClick={this._onCloseTab}>
          <span className="aui-icon hipchat-icon-xsmall hc-close-icon icon-close"/>
        </a>
      </li>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/rooms_nav_item_person.js
 **/