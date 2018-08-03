import AutoCompleteActions from"actions/autocomplete_actions";
import cx from"classnames";
import PureRenderMixin from 'react-addons-pure-render-mixin';
import link_utils from 'helpers/link_utils';
import mousePosition from 'helpers/mouse_position';

const MAX_WIDTH = 20;

export default React.createClass({

  displayName: "EmoticonAutoCompleteItem",

  propTypes: {
    "match_markup": React.PropTypes.string.isRequired
  },

  mixins: [PureRenderMixin],

  _onEmoticonMenuItemHover(evt) {
    if (mousePosition.hasChanged(evt)) {
      AutoCompleteActions.menuItemHovered({
        type: 'emoticon',
        index: this.props.idx
      });
    }
  },

  _onEmoticonSelected: function () {
    AutoCompleteActions.emoticonSelected();
  },

  _onRetinaImageNonExistent: function (evt) {
    evt.target.src = link_utils.remove_resolution(evt.target.src);
  },

  _getWidth(){
    if (this.props.width && this.props.width < MAX_WIDTH){
      return this.props.width;
    }
    return MAX_WIDTH;
  },

  render: function () {
    var classes = cx({
      'hc-autocomplete-item': true,
      'hc-autocomplete-item-selected': this.props.selected
    });

    return (
      <li className={classes} onClick={this._onEmoticonSelected} data-index={this.props.idx}>
        <div onMouseOver={this._onEmoticonMenuItemHover}>
          <div className="hc-ac-preview">
            <img src={this.props.src} alt={this.props.shortcut} key={this.props.shortcut} onError={this._onRetinaImageNonExistent}/>
          </div>
          <span className="hc-ac-name" dangerouslySetInnerHTML={{__html: this.props.match_markup || ''}} ></span>
        </div>
      </li>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/emoticon_autocomplete_item.js
 **/