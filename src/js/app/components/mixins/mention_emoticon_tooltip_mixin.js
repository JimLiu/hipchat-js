export default {

  _tooltipElements(){
    return ReactDOM.findDOMNode(this).querySelectorAll('.hc-mention-user, .remoticon');
  },

  // Put me in componentDidMount
  _createTooltips() {
    AJS.$(this._tooltipElements()).tooltip({
      title() {
        let link = this.querySelector('a');
        return link && link.getAttribute('data-title') || this.getAttribute('data-title') || this.alt || "";
      }
    });
  },

  // Put me in componentWillUnmount
  _destroyTooltips() {
    AJS.$(this._tooltipElements()).tooltip('destroy');
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/components/mixins/mention_emoticon_tooltip_mixin.js
 **/