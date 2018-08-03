import PureRenderMixin from 'react-addons-pure-render-mixin';
import cx from 'classnames';
import app_config from 'config/app_config';

const MAX_UNREADS = app_config.max_unread_count;

export default React.createClass({

  displayName: "UnreadBadge",

  mixins: [PureRenderMixin],

  render: function() {
    var count = this.props.unreadCount > MAX_UNREADS ? `${MAX_UNREADS}+` : this.props.unreadCount,
        classes = cx({
          'aui-badge': (this.props.unreadCount > 0),
          'hc-badge': true,
          'hc-mention': (this.props.hasMention) ? true : false,
          'hc-updating': (this.props.isUpdating) ? true : false
        });
    return <span className={classes}>{count}</span>;
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/unread_badge.js
 **/