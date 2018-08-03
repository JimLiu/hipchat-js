import cx from 'classnames';

/**
 * Create an AUI Dropdown2 trigger. The standard use case as defined in the
 * AUI docs (https://docs.atlassian.com/aui/latest/docs/dropdown2.html) is for
 * the trigger to be a button. This component does not make that distinction,
 * so if you want the trigger to be a button, you simply need to add the button
 * css classes:
 *
 * <AUIDropdown2Trigger className="aui-button aui-button-primary" dropdownID="123">
 *   Trigger text
 * </AUIDropdownTrigger>
 */
export default React.createClass({

  displayName: 'AUIDropdown2Trigger',

  propTypes: {
    type: React.PropTypes.oneOf(['a', 'link', 'button']),
    dropdownID: React.PropTypes.string.isRequired,
    arrowless: React.PropTypes.bool,
    disabled: React.PropTypes.bool,
    alignmentContainer: React.PropTypes.string, // optional selector
    hideLocation: React.PropTypes.string // optional selector
  },

  getDefaultProps() {
    return {
      type: 'button',
      arrowless: false,
      disabled: false
    };
  },

  render() {
    let attrs = {
      'id': this.props.id || _.uniqueId(),
      'href': `#${this.props.dropdownID}`,
      'aria-owns': this.props.dropdownID,
      'title': this.props.title || '',
      'aria-label': this.props['aria-label'] || this.props.title || '',
      'aria-controls': this.props.dropdownID,
      'aria-disabled': this.props.disabled,
      'aria-haspopup': true,
      'className': cx({
        [this.props.className]: !!this.props.className,
        'aui-dropdown2-trigger': true,
        'aui-dropdown2-trigger-arrowless': this.props.arrowless
      })
    };

    if (this.props.alignmentContainer) {
      attrs['data-container'] = this.props.alignmentContainer; // AUI 5.7
      attrs['data-aui-alignment-container'] = this.props.alignmentContainer; // AUI 5.8
    }

    if (this.props.hideLocation) {
      attrs['data-dropdown2-hide-location'] = this.props.hideLocation;
    }

    switch (this.props.type) {
      case 'a':
      case 'link':
        return <a {...attrs}>{ this.props.children }</a>;

      case 'button':
      default:
        return <button {...attrs}>{ this.props.children }</button>;
    }
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/dropdown2/aui_dropdown2_trigger.js
 **/