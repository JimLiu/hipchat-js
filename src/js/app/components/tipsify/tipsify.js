import {tipsify} from 'config/app_config';

export default React.createClass({

  displayName: 'Tipsify',
  mixin: [React.addons.PureRenderMixin],
  debouncedMouseOver: null,

  getInitialState() {
    return ({
      showTooltip: false,
      tooltip: '',
      currentTarget: null
    });
  },

  componentWillMount() {
    this.debouncedMouseOver = _.debounce( e => this._onMouseOver(e), tipsify.delay);
    document.addEventListener('mouseover', this.debouncedMouseOver);
    document.addEventListener('mouseout', this._onDocumentMouseOut);
    window.addEventListener('blur', this._hideTooltip);
  },

  componentWillUnmount() {
    document.removeEventListener('mouseover', this.debouncedMouseOver);
    document.removeEventListener('mouseout', this._onDocumentMouseOut);
    window.removeEventListener('blur', this._hideTooltip);
    this.debouncedMouseOver = null;
  },

  componentDidUpdate() {
    if (this.refs.content && this.state.currentTarget) {
      this._positionTooltip();
    }
  },

  _onDocumentMouseOut(e) {
    this.debouncedMouseOver.cancel();
  },

  _onMouseOver(e) {
    let target = this._getTarget(e.target);
    if (!target || this._isSameTarget(target)) { return; }

    let tooltip = this._getTooltip(target);
    this._showTooltip(tooltip, target);
  },

  _onMouseOut(e) {
    if (this._isSameTarget(this._getTarget(e.toElement))) { return; }
    this._hideTooltip();
  },

  _onClick() {
    this._hideTooltip();
  },

  _getTarget(target) {
    if (!target || target === document.body) { return null; }

    let iterations = 0,
        tooltip = null;

    while(target && !tooltip && iterations <= tipsify.max_dom_traverse_depth) {
      tooltip = this._getTooltip(target);
      if (tooltip) {
        return target;
      }
      target = target.parentElement;
      iterations++;
    }

    return null;
  },

  _getTooltip(target) {
    if (!target || target.hasAttribute('data-tipsify-ignore')) {
      return null;
    }

    return target.getAttribute('aria-label');
  },

  _showTooltip(tooltip, target) {
    this.setState({
      showTooltip: true,
      tooltip: this._stripTags(tooltip).replace(/\n/g, '<br />'),
      currentTarget: target
    });

    target.addEventListener('mouseout', this._onMouseOut);
    target.addEventListener('click', this._onClick);
  },

  _hideTooltip() {
    if (!this.state.currentTarget) {
      return;
    }

    this.state.currentTarget.removeEventListener('mouseout', this._onMouseOut);
    this.state.currentTarget.removeEventListener('click', this._onClick);

    this.setState({
      showTooltip: false,
      tooltip: '',
      currentTarget: null
    });
  },

  _stripTags(str) {
    return str.replace(/<\/?[^>]+>/g, '');
  },

  _isSameTarget(target) {
    return target === this.state.currentTarget;
  },

  _isInvalidPosition(rect) {
    return rect.left === 0 && rect.right === 0 && rect.top === 0 && rect.bottom === 0 && rect.width === 0 && rect.height === 0;
  },

  _positionTooltip() {
    let content = ReactDOM.findDOMNode(this.refs.content);
    content.style.padding = '0'; // Reset padding to make sure that we the correct width of the element

    let contentRect = content.getBoundingClientRect(),
        bodyRect = document.body.getBoundingClientRect(),
        targetRect = this.state.currentTarget.getBoundingClientRect(),
        left = targetRect.left + ((targetRect.width - contentRect.width) / 2),
        top = targetRect.top + targetRect.height + tipsify.distance,
        overflowX = (left + contentRect.width) - (bodyRect.width - tipsify.window_margin),
        overflowY = (top + contentRect.height) - (bodyRect.height - tipsify.window_margin);

    if (this._isInvalidPosition(targetRect)) {
      this._hideTooltip();
      return;
    }

    if (overflowX > 0) {
      left -= overflowX;
      content.style.padding = `0 ${overflowX * 2}px 0 0`; // This is needed for repositioning the arrow
    }

    if (overflowY > 0) {
      top = targetRect.top - contentRect.height - tipsify.distance;
      content.className = 'tipsify-content reversed';
    }

    content.style.left = `${left}px`;
    content.style.top = `${top}px`;

    AJS.layer(content);
  },

  _renderTooltip() {
    if (!this.state.showTooltip) {
      return null;
    }

    let tooltip = { __html: this.state.tooltip };

    return (
      <div className="tipsify-content" ref="content">
        <div className="tipsify-content-inner" dangerouslySetInnerHTML={tooltip} />
      </div>
    );
  },

  render() {
    let tooltip = this._renderTooltip();
    return (
      <div id="tipsify">
        {tooltip}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/tipsify/tipsify.js
 **/