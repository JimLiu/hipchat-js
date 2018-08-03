import PersonAvatar from 'components/common/avatars/person_avatar';
import LobbyActions from 'actions/lobby_actions';
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import mousePosition from 'helpers/mouse_position';

export default React.createClass({

  displayName: 'LobbyItem',

  mixins: [PureRenderMixin],

  _onMouseEnter: function (evt) {
    if (mousePosition.hasChanged(evt)) {
      LobbyActions.itemHovered({
        index: this.props.item_index
      });
    }
  },

  _onOpenChat: function () {
    LobbyActions.openChat({
      jid: this.props.jid,
      name: this.props.name,
      type: this.props.type
    });
  },

  _getIcon: function () {
    let icon;

    if (this.props.type === 'groupchat') {
      icon = <span className={'aui-icon hipchat-icon-small icon-' + this.props.privacy}></span>;
    } else {
      icon = <PersonAvatar avatar_url={this.props.photo_url}
                        presence={this.props.presence_show}
                        size='small'
                        uid={this.props.user_id}
                        shouldAnimate={this.props.should_animate_avatar}
                        active={true} />;
    }

    return icon;
  },

  _getMention: function () {
    let mention = this.props.mention_match_markup || this.props.mention_name,
        mention_markup = {__html: `@${mention}` };

    return <span className='hc-lobby-list-mention-name' dangerouslySetInnerHTML={mention_markup} />;
  },

  render: function() {
    let classes = cx({
          'hc-lobby-list-item': true,
          'selected': this.props.selected
        }),
        icon = this._getIcon(),
        mention = this.props.mention_name ? this._getMention() : null;

    return (
      <div className={classes} onClick={this._onOpenChat} onMouseEnter={this._onMouseEnter}>
        <div className='hc-lobby-list-icon'>
          {icon}
        </div>
        <div className='hc-lobby-list-names'>
          <span className={`hc-lobby-list-name ${this.props.type}`} dangerouslySetInnerHTML={{__html: this.props.name_match_markup || _.escape(this.props.name) }} />
          {mention}
        </div>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/lobby/lobby_item.js
 **/