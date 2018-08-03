import strings from 'strings/quick_switcher_strings';

export default React.createClass({

  displayName: "QuickSwitcherEmptyState",

  render() {
    return (
      <div className="hc-qs-list">
        <div className="hc-qs-item hc-qs-empty-state" ref="text">
          {strings.empty_state}
        </div>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/quick_switcher/quick_switcher_empty_state.js
 **/