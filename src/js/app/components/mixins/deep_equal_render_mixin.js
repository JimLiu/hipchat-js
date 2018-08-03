export default {
  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState);
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/components/mixins/deep_equal_render_mixin.js
 **/