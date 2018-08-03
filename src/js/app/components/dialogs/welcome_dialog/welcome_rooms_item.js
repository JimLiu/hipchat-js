import PersonAvatar from 'components/common/avatars/person_avatar';
import WelcomeActions from 'actions/welcome_actions';
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: 'WelcomeRoomsItem',

  mixins: [PureRenderMixin],

  getDefaultProps: function() {
    return {
      key: '',
      jid: '',
      name: '',
      topic: '',
      privacy: '',
      type: '',
      is_selected: false,
      avatar_url: '',
      all_participants: [],
      roster: {},
      current_user_jid: '',
      presence_show: '',
      max_amount_of_people_icons: null
    };
  },

  propTypes: {
    key: React.PropTypes.string.isRequired,
    jid: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired,
    topic: React.PropTypes.string,
    privacy: React.PropTypes.string.isRequired,
    type: React.PropTypes.string.isRequired,
    is_selected: React.PropTypes.bool.isRequired,
    avatar_url: React.PropTypes.string.isRequired,
    all_participants: React.PropTypes.array.isRequired,
    roster: React.PropTypes.object.isRequired,
    current_user_jid: React.PropTypes.string.isRequired,
    presence_show: React.PropTypes.string.isRequired,
    max_amount_of_people_icons: React.PropTypes.number.isRequired,
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
    WelcomeActions.selectRoomsItem(jid);
  },

  unselectItem: function (jid) {
    WelcomeActions.unselectRoomsItem(jid);
  },

  _getIcon: function () {
    let icon;

    if (this.props.type === 'groupchat' && this.props.avatar_url === '') {
      icon = <span className={'aui-icon hipchat-icon-small icon-' + this.props.privacy}></span>;
    } else {
      icon = <PersonAvatar
                avatar_url={this.props.avatar_url}
                show_presence={false}
                size='medium' />;
    }

    return icon;
  },

  _getParticipantsIcon: function () {
    let icons = [],
        participants = this.props.all_participants;

    if (participants.indexOf(this.props.current_user_jid) > -1) {
      participants.splice(participants.indexOf(this.props.current_user_jid), 1);
    }

    participants.forEach((participantJid) => {
      if (icons.length < this.props.max_amount_of_people_icons && participantJid in this.props.roster) {

        icons.push(<PersonAvatar
                      key={this.props.roster[participantJid].jid}
                      avatar_url={this.props.roster[participantJid].photo_url}
                      show_presence={false}
                      size='small' />);
      }
    });

    return icons;
  },

  render: function() {

    let classes = cx({
          'hc-welcome-room-item': true,
          'selected': this.props.is_selected
        }),
        name = this.props.name,
        icon = this._getIcon(),
        participants_icons = this.props.all_participants ? this._getParticipantsIcon() : [],
        topic = this.props.topic;

    return (
      <div className={classes} onClick={this._onClick} >
        <div className='hc-welcome-room-icon'>
          {icon}
        </div>
        <div className='hc-welcome-room-info hc-welcome-room-info-ellipsis'>
          <span className='hc-welcome-room-name'>
            {name}
          </span>
          <br/>
          <span className='hc-welcome-room-topic'>
            {topic}
          </span>
        </div>
        <div className='hc-welcome-room-participants'>
          {participants_icons}
        </div>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/welcome_dialog/welcome_rooms_item.js
 **/