import PersonAvatar from 'components/common/avatars/person_avatar';
import QuickSwitcherActions from 'actions/quick_switcher_actions';
import DialogActions from 'actions/dialog_actions';
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import mousePosition from 'helpers/mouse_position';

export default React.createClass({

  displayName: 'QuickSwitcherPerson',

  mixins: [PureRenderMixin],

  propTypes: {
    'selected': React.PropTypes.bool,
    'photo_url': React.PropTypes.string,
    'name': React.PropTypes.string,
    'name_markup': React.PropTypes.string,
    'mention_name': React.PropTypes.string,
    'mention_markup': React.PropTypes.string,
    'show': React.PropTypes.string,
    'mobile': React.PropTypes.string,
    'idx': React.PropTypes.number,
    'id': React.PropTypes.oneOfType([React.PropTypes.number, React.PropTypes.string]),
    'should_animate_avatar': React.PropTypes.bool
  },

  _onEnter (evt) {
    if (mousePosition.hasChanged(evt)) {
      QuickSwitcherActions.itemHovered({
        index: this.props.idx
      });
    }
  },

  _onClick (e) {
    e.preventDefault();
    DialogActions.closeDialog();
    QuickSwitcherActions.selectItem();
  },

  render () {
    let classes = cx({
      'hc-qs-item': true,
      'selected': this.props.selected
    });

    return (
      <div className={classes} onClick={this._onClick} onMouseEnter={this._onEnter}>
        <span className='hc-qs-aui-avatar'>
          <PersonAvatar
            avatar_url={this.props.photo_url}
            size='medium'
            uid={this.props.id}
            presence={this.props.show}
            mobile={this.props.mobile}
            shouldAnimate={this.props.should_animate_avatar}
            active='false'/>
        </span>
        <span className='hc-qs-name' dangerouslySetInnerHTML={{__html: this.props.name_markup || this.props.name }} />
        <span className='hc-qs-mention-name' dangerouslySetInnerHTML={{__html: this.props.mention_markup || this.props.mention_name }} />
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/quick_switcher/quick_switcher_person.js
 **/