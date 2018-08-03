import cx from 'classnames';

/**
 * https://docs.atlassian.com/aui/latest/docs/dropdown2.html
 * Usage:
 *
 * <AUIDropdown2Trigger dropdownID="123">Trigger</AUIDropdown2Trigger>
 *
 * <AUIDropdown2 dropdownID="123">
 *   // dropdown html contents or a react component that renders it
 * <AUIDropdown2>
 *
 * Notes:
 *  - dropdownID is required for both the dropdown and trigger elements and must match
 */
export default React.createClass({

  displayName: 'AUIDropdown2',

  propTypes: {
    dropdownID: React.PropTypes.string.isRequired,
    onShow: React.PropTypes.func,
    onHide: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      onShow: _.noop,
      onHide: _.noop
    };
  },

  /*
   * When the dropdown is shown, AUI will move the container element
   * to the body and fire a "show" event. We'll wait for that event
   * and then React.render this component's children to the container
   *
   * When the dropdown is closed, we'll unmount this component's
   * children from the container element
   */
  componentDidMount() {
    AJS.$(this._getDropdownElement()).on({
      'aui-dropdown2-show': this.renderDropdownContents,
      'aui-dropdown2-hide': this.removeDropdownContents
    });
  },

  /*
   * Remove AUI DOM event listeners
   */
  componentWillUnmount() {
    this.removeDropdownContents();
    AJS.$(this._getDropdownElement()).off();
  },

  /*
   * AUI's gonna take over and move this element all around the DOM
   * mutating it all the way so don't let React try to update it
   */
  shouldComponentUpdate() {
    return false;
  },

  /*
   * For our initial render, we want to take the dropdown html
   * and render it statically within this component. We don't want
   * React to try to manage the HTML at all, but we *DO* want to have
   * it in there so AUI can properly measure the size of the contents
   * and place it properly when the dropdown becomes visible
   */
  render() {
    let attrs = {
      'id': this.props.dropdownID,
      'aria-hidden': 'true',
      'role': 'menu',
      'className': cx({
        [this.props.className]: !!this.props.className,
        'aui-dropdown2': true,
        'aui-style-default': true
      }),
      'dangerouslySetInnerHTML': {
        __html: this._getStaticDropdownDOM()
      }
    };

    return <div {...attrs} />;
  },

  invokeTrigger() {
    AJS.$(`[aria-owns="${this.props.dropdownID}"]`).trigger('aui-button-invoke');
  },

  /*
   * When the dropdown is shown & once AUI has moved it across
   * the DOM, we'll blow away the static contents, and overwrite
   * it with a new React-managed component
   */
  renderDropdownContents() {
    ReactDOM.render(this.props.children, this._getDropdownElement());
    AJS.$(window).one('resize', this.invokeTrigger);
    this.props.onShow();
  },

  /*
   * When the dropdown is hidden & once AUI has moved it again,
   * we'll unmount the React component, and replace the inner
   * contents with the static DOM children we had originally.
   * This way AUI has the contents again to measure with for
   * the next time the dropdown opens
   */
  removeDropdownContents() {
    AJS.$(window).off('resize', this.invokeTrigger);
    ReactDOM.unmountComponentAtNode(this._getDropdownElement());
    AJS.$(this._getDropdownElement())
      .empty()
      .html(this._getStaticDropdownDOM());
    this.props.onHide();
  },

  /*
   * Find the element on the page. It can be anywhere in the DOM after AUI moves it
   */
  _getDropdownElement() {
    return document.getElementById(this.props.dropdownID);
  },

  /*
   * Render the child components in this dropdown as raw HTML
   */
  _getStaticDropdownDOM() {
    return ReactDOMServer.renderToStaticMarkup(this.props.children);
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/dropdown2/aui_dropdown2.js
 **/