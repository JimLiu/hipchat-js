import cx from 'classnames';
import ChatWindowActions from 'actions/chat_window_actions';

export default React.createClass({

  displayName: "AttachedCardsToggle",

  propTypes: {
    mid: React.PropTypes.string,
    collapsed: React.PropTypes.bool
  },

  _onToggle() {
    ChatWindowActions.toggleAttachedCards(this.props.mid);
  },

  render() {
    let collapsed = this.props.collapsed;
    let classes = cx({
      "toggle-attached": true,
      "expand": collapsed,
      "collapse": !collapsed
    });
    let toggleText = collapsed ? "Show card" : "Hide card";

    return <div className="toggle-attached-container" title={toggleText} onClick={this._onToggle}>
      <span className={classes}>{toggleText}</span>
    </div>;
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/attached_cards_toggle.js
 **/