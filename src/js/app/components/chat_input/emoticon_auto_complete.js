var AutoCompleteBox = require('components/common/autocomplete/auto_complete_box');
var utils = require('helpers/utils');

module.exports = React.createClass({

  displayName: "EmoticonAutoComplete",

  componentDidUpdate: function () {
    if (this.props.emoticon_results_count > 0) {
      this._scrollIntoView();
    }
  },

  _scrollIntoView: function () {
    var $node = $(ReactDOM.findDOMNode(this));
    var container = $node.find('.aui-inline-dialog-contents.contents').get(0);

    utils.scrollIntoViewIfNeeded($node.find('li.hc-autocomplete-item-selected').get(0), container, false);
  },

  render: function() {
    return (
      <div className="hc-emoticon-ac hc-chat-input-autocomplete">
        <AutoCompleteBox key="emoticon_auto_complete"
                          type="emoticon"
                          path_prefix={this.props.path_prefix}
                          list={this.props.emoticon_list}
                          box_type={this.props.box_type}
                          textarea_ref={this.props.textarea_ref}
                          selected_item={this.props.emoticon_selected_item}
                          ref="acBox" />
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/emoticon_auto_complete.js
 **/