import AppDispatcher from 'dispatchers/app_dispatcher';
import SmileySelector from './tooltip_types/smiley_selector';
import UploadPreview from './tooltip_types/upload_preview';

export default React.createClass({

  displayName: 'Tooltip',

  propTypes: {
    type: React.PropTypes.oneOf(['upload_preview', 'smiley_selector']).isRequired
  },

  componentDidMount() {
    AppDispatcher.register({
      'toggle-tooltip': this._onToggle,
      'close-tooltip': this._onClose,
      'open-tooltip': this._onOpen
    });
    this.toggle = _.bind((e) => {
      if (!ReactDOM.findDOMNode(this).parentNode.contains(e.target)){
        this._onToggle({type: this.props.type});
      }
    });
    this.outside_click_dismiss = this.props.type === 'smiley_selector';
  },

  componentWillUnmount() {
    var elem = ReactDOM.findDOMNode(this);
    document.removeEventListener('click', this.toggle);
    AppDispatcher.unregister({
      'toggle-tooltip': this._onToggle,
      'close-tooltip': this._onClose,
      'open-tooltip': this._onOpen
    });
    [].map.call(elem.querySelectorAll('.file-preview'), (element) => {
      return element;
    }).forEach((preview) => {
      preview.removeEventListener('load', this._positionTooltip);
    });
  },

  componentDidUpdate() {
    if (this.state.is_visible) {
      this._positionTooltip();
    }
  },

  getInitialState() {
    return {
      is_visible: false
    };
  },

  _getToolTip(type) {
    var tooltip_types = {
      smiley_selector: SmileySelector,
      upload_preview: UploadPreview
    };

    return tooltip_types[type];
  },

  render() {

    var ToolTip = this._getToolTip(this.props.type);

    return (
      <div className={'hc-tooltip ' + (this.state.is_visible ? '' : 'hidden')} >
        <div className="hc-tooltip-content" >
          <ToolTip data={this.state.data} />
        </div>
        <div className="aui-inline-dialog-arrow arrow aui-css-arrow"></div>
      </div>
    );
  },

  _onClose(args) {
    if (!this.isMounted()) {
      return;
    }
    if (args.type === this.props.type) {
      if (this.outside_click_dismiss) {
        document.removeEventListener('click', this.toggle);
      }
      this.setState({
        is_visible: false
      });
    }
    this._resetArrow();
  },

  _onOpen(args) {
    if (args.type === this.props.type) {
      if (this.outside_click_dismiss) {
        document.addEventListener('click', this.toggle);
      }
      this.setState({
        is_visible: true,
        data: args.data
      });
    }
  },

  _onToggle(args) {
    if (this.state.is_visible) {
      this._onClose(args);
    } else {
      this._onOpen(args);
    }
  },

  _resetArrow() {
    ReactDOM.findDOMNode(this).querySelector('.arrow').classList.remove('right');
  },

  _positionTooltip() {
    var elem = ReactDOM.findDOMNode(this),
        parent = elem.parentElement,
        bottom = parent.offsetHeight + 8,
        left = Math.floor(-elem.offsetWidth / 2 + parent.offsetWidth / 2);
    elem.style.bottom = bottom + 'px';
    elem.style.left = left + 'px';

    if (elem.getBoundingClientRect().right > window.innerWidth) {
      // Tooltip extends beyond right side of window
      elem.style.left = (elem.offsetLeft - 8) - (elem.getBoundingClientRect().right - window.innerWidth) + 'px';
      elem.querySelector('.arrow').classList.add('right');
    }

    [].map.call(elem.querySelectorAll('.file-preview'), (element) => {
      return element;
    }).forEach((preview) => {
      preview.addEventListener('load', this._positionTooltip);
    });
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/tooltip/tooltip.js
 **/