import AutoCompleteActions from "actions/autocomplete_actions";
import cx from "classnames";
import PureRenderMixin from 'react-addons-pure-render-mixin';
import mousePosition from 'helpers/mouse_position';

export default React.createClass({

  displayName: "SlashCommandAutoCompleteItem",

  propTypes: {
    name: React.PropTypes.string.isRequired,
    usage: React.PropTypes.string,
    description: React.PropTypes.string.isRequired
  },

  mixins: [PureRenderMixin],

  _onMenuItemHover(evt) {
    if (mousePosition.hasChanged(evt)){
      AutoCompleteActions.menuItemHovered({
        type: 'slash_command',
        index: this.props.idx
      });
    }
  },

  _onMenuItemSelected() {
    AutoCompleteActions.slashCommandSelected();
  },

  render() {
    let classes = cx({
      'hc-autocomplete-item': true,
      'hc-autocomplete-item-selected': this.props.selected
    });

    return (
      <li className={classes} onClick={this._onMenuItemSelected} data-index={this.props.idx}>
        <div onMouseOver={this._onMenuItemHover}>
          <div className="hc-ac-name-container">
            <span className="hc-ac-name">{this.props.name}</span>
            <span className="hc-ac-usage">{this.props.usage}</span>
          </div>
          <div className="hc-ac-description">{this.props.description}</div>
        </div>
      </li>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/slash_command_autocomplete_item.js
 **/