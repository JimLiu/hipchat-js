import AutoCompleteActions from 'actions/autocomplete_actions';
import Avatar from 'components/common/avatars/person_avatar';
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import mousePosition from 'helpers/mouse_position';

export default React.createClass({

  displayName: 'MentionAutoCompleteRow',

  mixins: [PureRenderMixin],

  _onMentionMenuItemHover(evt) {
    if (mousePosition.hasChanged(evt)){
      AutoCompleteActions.menuItemHovered({
        type: 'mention',
        index: this.props.idx
      });
    }
  },

  _onMentionSelected: function () {
    AutoCompleteActions.mentionSelected();
  },

  _getAvatar: function () {
    let avatar;

    if (this.props.photo_url) {
      avatar = <Avatar size='small'
                       presence={this.props.show}
                       avatar_url={this.props.photo_url}
                       active={true}
                       shouldAnimate={this.props.should_animate_avatar}
                       key={this.props.user_id}
                       uid={this.props.user_id}/>;
    } else {
      avatar = (
        <span className='aui-avatar aui-avatar-project aui-avatar-small'>
          <span className='aui-avatar-inner'>
            <div className='mention-group-icon'></div>
          </span>
        </span>
      );
    }
    return avatar;
  },

  render: function () {
    let avatar = this._getAvatar(),
        classes = cx({
          'hc-autocomplete-item': true,
          'hc-autocomplete-item-selected': this.props.selected
        });

    return (
      <li className={classes} onClick={this._onMentionSelected} data-index={this.props.idx}>
        <div className='hc-ac-row' onMouseOver={this._onMentionMenuItemHover}>
          <div className='hc-ac-avatar'>
            {avatar}
          </div>
          <span className='hc-ac-name' dangerouslySetInnerHTML={{__html: this.props.name_match_markup || ''}} />
          <span className='hc-ac-mention-name' dangerouslySetInnerHTML={{__html: this.props.mention_match_markup || ''}} />
        </div>
      </li>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/mention_autocomplete_row.js
 **/