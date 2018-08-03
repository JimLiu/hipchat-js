import PersonAvatar from 'components/common/avatars/person_avatar';
import WelcomeActions from 'actions/welcome_actions';
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: 'WelcomePeopleItem',

  mixins: [PureRenderMixin],

  componentDidMount: function () {
    if (this.props.item_index === 0 && this.props.is_first_selection) {
      this.selectItem(this.props.jid);
    }
  },

  getDefaultProps: function() {
    return {
      key: '',
      jid: '',
      name: '',
      title: '',
      user_id: null,
      item_index: 0,
      is_selected: false,
      photo_url: '',
      presence_show: ''
    };
  },

  propTypes: {
    key: React.PropTypes.string.isRequired,
    jid: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired,
    title: React.PropTypes.string,
    user_id: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.string
    ]).isRequired,
    item_index: React.PropTypes.number.isRequired,
    is_selected: React.PropTypes.bool.isRequired,
    photo_url: React.PropTypes.string.isRequired,
    presence_show: React.PropTypes.string.isRequired
  },

  _onClick: function () {
    let jid = this.props.jid;

    if (this.props.is_selected) {
      this.unselectItem(jid);
    } else {
      this.selectItem(jid);
    }
  },

  selectItem: function (jid) {
    WelcomeActions.selectPeopleItem(jid);
  },

  unselectItem: function (jid) {
    WelcomeActions.unselectPeopleItem(jid);
  },

  _getIcon: function () {
    return <PersonAvatar
              avatar_url={this.props.photo_url}
              presence={this.props.presence_show}
              size='medium'
              uid={this.props.user_id}
              active={true} />;
  },

  render: function() {

    let classes = cx({
          'hc-welcome-person-item': true,
          'selected': this.props.is_selected
        }),
        icon = this._getIcon(),
        name = this.props.name,
        job_title = this.props.title;

    return (
      <div className={classes} onClick={this._onClick} >
        <div className='hc-welcome-person-icon'>
          {icon}
        </div>
        <div className='hc-welcome-person-info hc-welcome-person-info-ellipsis'>
          <span className='hc-welcome-person-name'>
            {name}
          </span>
          <br/>
          <span className='hc-welcome-person-job-title'>
            {job_title}
          </span>
        </div>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/welcome_dialog/welcome_people_item.js
 **/