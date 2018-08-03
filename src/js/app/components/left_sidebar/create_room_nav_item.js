import PureRenderMixin from 'react-addons-pure-render-mixin';
import AnalyticsActions from 'actions/analytics_actions';
import DialogActions from 'actions/dialog_actions';
import CommonStrings from 'strings/common_strings';

export default React.createClass({

  displayName: "CreateRoomNavItem",

  mixins: [PureRenderMixin],

  _onClick: function () {
    DialogActions.showCreateRoomDialog();
    AnalyticsActions.createRoomClickedEvent("left.navigation");
  },

  render: function() {
    return (
      <li className="hc-tab hc-add-item-link">
        <a ref="link" className="aui-nav-item hc-create-room-link" onClick={this._onClick}>
          <span className="aui-icon aui-icon-small aui-iconfont-add-small"></span>
          <span className="room-name">{CommonStrings.buttons.create_room}</span>
        </a>
      </li>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/create_room_nav_item.js
 **/