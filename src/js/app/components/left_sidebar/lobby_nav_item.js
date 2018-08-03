import AnalyticsActions from 'actions/analytics_actions';
import PersonAvatar from 'components/common/avatars/person_avatar';
import RoomsNavActions from 'actions/room_nav_actions';
import CommonStrings from 'strings/common_strings';
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: 'LobbyNavItem',

  mixins: [PureRenderMixin],

  _onClick: function() {
    RoomsNavActions.select('lobby');
    AnalyticsActions.lobbyRoomNavItemClicked();
  },

  _getLobbyIcon: function () {
    var icon;

    if (_.isString(this.props.group_name)) {
      icon = <PersonAvatar
        text={this.props.group_name.charAt(0)}
        avatar_url={this.props.group_avatar_url}
        avatar_bg_color={this.props.group_avatar_bg}
        size='xsmall'
        show_presence={false} />;

    } else {
      icon = <span className='aui-icon hipchat-icon-small icon-lobby'></span>;
    }

    return icon;
  },

  _getLobbyText: function () {
    var text = CommonStrings.lobby;
    if (_.isString(this.props.group_name)) {
      text = this.props.group_name;
    }
    return (
      <span className='aui-nav-item-label'>{text}</span>
    );
  },

  _getLobbyContent: function () {
    var lobbyText = this._getLobbyText(),
        lobbyIcon = this._getLobbyIcon();

    return (
      <a ref='link' className='aui-nav-item' onClick={this._onClick}>
        {lobbyIcon}
        {lobbyText}
      </a>
    );
  },

  render: function() {
    var classes = cx({
          'hc-tab': true,
          'aui-nav-selected': this.props.active
        }),
        lobbyContent = this._getLobbyContent();

    return (
      <ul className='aui-nav hc-sidebar-nav hc-lobby' data-skate-ignore>
        <li className={classes} data-jid='lobby'>
          {lobbyContent}
        </li>
      </ul>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/lobby_nav_item.js
 **/