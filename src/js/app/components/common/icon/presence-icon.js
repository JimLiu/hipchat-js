import Icon from "./icon";
import PureRenderMixin from 'react-addons-pure-render-mixin';
import PresenceSubscriptionHelper from 'helpers/presence_subscription_helper';

export default React.createClass({

  displayName: "PresenceIcon",

  mixins: [PureRenderMixin],

  componentWillMount() {
    if (this.props.uid) {
      PresenceSubscriptionHelper.subscribeToPresence(this.props.uid);
    }
  },

  componentDidUpdate(prevProps) {
    if (prevProps.uid !== this.props.uid) {
      PresenceSubscriptionHelper.unsubscribeFromPresence(prevProps.uid);
      PresenceSubscriptionHelper.subscribeToPresence(this.props.uid);
    }
  },

  componentWillUnmount() {
    if (this.props.uid) {
      PresenceSubscriptionHelper.unsubscribeFromPresence(this.props.uid);
    }
  },

  getDefaultProps: function() {
    return {
      classNames: {
        "hc-status-icon": true
      },
      presence: "chat",
      mobile: false,
      active: false,
      uid: ''
    };
  },

  _getPresenceIconName: function(statusName) {
    var iconName = statusName;

    if (statusName === "chat") {
      iconName = "available";
    } else if (statusName === "unknown") {
      iconName = "unavailable";
    }

    if (this.props.active) {
      iconName += "-selected";
    }

    return iconName;
  },

  _getStatusName: function() {
    var statusName = "unknown";

    if (this.props.presence === "unknown" && this.props.mobile) {
      statusName = "mobile";
    } else if (this.props.presence) {
      statusName = this.props.presence;
    }

    return statusName;
  },

  render: function() {
    var statusName = this._getStatusName();
    var iconName = this._getPresenceIconName(statusName);
    var className = "icon-" + statusName;
    var c = {};
    c[className] = true;
    var classes = _.assign({}, this.props.classNames, c);

    return (
      <Icon classes={classes} iconName={iconName} uid={this.props.uid}/>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/icon/presence-icon.js
 **/