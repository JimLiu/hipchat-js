import cx from 'classnames';

/**
 * https://docs.atlassian.com/aui/latest/docs/dropdown2.html
 *
 * Interactive links are dropdown links with radio buttons or checkboxes
 * next to them. Clicking them do not close the dropdown they are in.
 * You can override this by setting the interactive property to false.
 *
 * <div className="aui-dropdown2">
 *   <div className="aui-dropdown2-section">
 *     <ul>
 *       <AUIDropdown2InteractiveLink type="radio">Clicking me won't close the dropdown</AUIDropdown2InteractiveLink>
 *       <AUIDropdown2InteractiveLink type="radio">Me neither</AUIDropdown2InteractiveLink>
 *     </ul>
 *     <ul>
 *       <AUIDropdown2InteractiveLink type="radio" interactive="false">Clicking me will close the dropdown</AUIDropdown2InteractiveLink>
 *     </ul>
 *     <ul>
 *       <AUIDropdown2InteractiveLink type="checkbox" disabled="true">I'm disabled</AUIDropdown2InteractiveLink>
 *       <AUIDropdown2InteractiveLink type="checkbox" checked="true">I'm checked</AUIDropdown2InteractiveLink>
 *     </ul>
 *   </div>
 * </div>
 */
export default React.createClass({

  displayName: 'AUIDropdown2InteractiveLink',

  propTypes: {
    type: React.PropTypes.oneOf([ 'checkbox', 'radio' ]).isRequired,
    interactive: React.PropTypes.bool,
    checked: React.PropTypes.bool,
    disabled: React.PropTypes.bool,
    onCheck: React.PropTypes.func,
    onUncheck: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      interactive: true,
      checked: false,
      disabled: false,
      onCheck: _.noop,
      onUncheck: _.noop
    };
  },

  componentDidMount() {
    AJS.$(this.refs.link).on({
      'aui-dropdown2-item-check': this._onCheck,
      'aui-dropdown2-item-uncheck': this._onUncheck
    });
  },

  componentWillUnmount() {
    AJS.$(this.refs.link).off();
  },

  _onCheck() {
    if (!this.props.disabled) {
      this.props.onCheck();
    }
  },

  _onUncheck() {
    if (!this.props.disabled) {
      this.props.onUncheck();
    }
  },

  render() {
    let attrs = {
      'ref': 'link',
      'id': this.props.id || _.uniqueId(),
      'aria-disabled': this.props.disabled,
      'className': cx({
        [this.props.className]: !!this.props.className,
        'aui-dropdown2-radio': this.props.type === 'radio',
        'aui-dropdown2-checkbox': this.props.type === 'checkbox',
        'interactive': this.props.interactive,
        'aui-dropdown2-checked': this.props.checked,
        'checked': this.props.checked,
        'disabled': this.props.disabled
      })
    };

    return <a {...attrs}>{ this.props.children }</a>;
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/dropdown2/aui_dropdown2_interactive_link.js
 **/