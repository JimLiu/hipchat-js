import cx from 'classnames';

export default React.createClass({

  propTypes: {
    heading: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      heading: ''
    };
  },

  _getHeading() {
    if (!this.props.heading) {
      return undefined;
    }
    return <strong aria-role="presentation" class="aui-dropdown2-heading">{ this.props.heading }</strong>;
  },

  render() {

    let attrs = {
      'role': 'presentation',
      'className': cx({
        [this.props.className]: !!this.props.className,
        'aui-dropdown2-section': true
      })
    };

    let heading = this._getHeading;

    return (
      <div {...attrs}>
        { heading }
        <div role="group">
          { this.props.children }
        </div>
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/dropdown2/aui_section.js
 **/