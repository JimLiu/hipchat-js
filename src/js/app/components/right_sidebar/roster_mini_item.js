import PersonAvatar from '../common/avatars/person_avatar';
import PersonHelper from 'helpers/person_helper';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: 'RosterMiniItem',

  mixins: [PureRenderMixin],

  propTypes: {
    size: React.PropTypes.string,
    order: React.PropTypes.string,
    user_is_admin: React.PropTypes.bool,
    user_name: React.PropTypes.string.isRequired,
    user_mention_name: React.PropTypes.string.isRequired,
    user_presence_show: React.PropTypes.string,
    user_presence_status: React.PropTypes.string,
    user_photo_url: React.PropTypes.string,
    user_jid: React.PropTypes.string,
    user_id: React.PropTypes.oneOfType([React.PropTypes.number, React.PropTypes.string]),
    shouldAnimate: React.PropTypes.bool
  },

  getDefaultProps: function () {
    return {
      size: 'small',
      order: 'show',
      user_is_admin: false,
      user_presence_show: 'unknown',
      user_presence_status: ''
    };
  },

  _getTooltip() {
    return PersonHelper.get_user_tooltip_flat(this.props.user_name, this.props.user_mention_name, this.props.user_is_admin, this.props.user_presence_show, this.props.user_presence_status);
  },

  _getAvatar() {
    return <PersonAvatar avatar_url={this.props.user_photo_url}
                        presence={this.props.user_presence_show}
                        name={this.props.user_name}
                        size={this.props.size}
                        shouldAnimate={this.props.shouldAnimate}
                        uid={this.props.user_id}/>;
  },

  render: function () {
    var avatar = this._getAvatar(),
        tooltip = this._getTooltip();
    return (
      <div ref="person" key={'user-' + this.props.user_id} className="hc-roster-mini-item" data-order={this.props.order}
        data-status={this.props.user_presence_show} data-name={this.props.user_name} aria-label={tooltip}>
        {avatar}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/roster_mini_item.js
 **/