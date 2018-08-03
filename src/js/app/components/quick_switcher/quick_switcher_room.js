import QuickSwitcherActions from "actions/quick_switcher_actions";
import DialogActions from "actions/dialog_actions";
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import mousePosition from 'helpers/mouse_position';

export default React.createClass({

  displayName: "QuickSwitcherRoom",

  mixins: [PureRenderMixin],

  propTypes: {
    "selected": React.PropTypes.bool,
    "name": React.PropTypes.string,
    "name_markup": React.PropTypes.string,
    "privacy": React.PropTypes.string,
    "idx": React.PropTypes.number
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

  render() {

    let classes = cx({
          "hc-qs-item": true,
          "selected": this.props.selected
        });

    return (
      <div className={classes} onClick={this._onClick} onMouseEnter={this._onEnter}>
        <span className={"hc-qs-room-icon aui-icon hipchat-icon-medium icon-" + (this.props.privacy || 'dot')}></span>
        <span className="hc-qs-name" dangerouslySetInnerHTML={{__html: this.props.name_markup || this.props.name }} />
      </div>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/quick_switcher/quick_switcher_room.js
 **/