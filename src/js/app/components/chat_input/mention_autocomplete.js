var AutoCompleteBox = require('components/common/autocomplete/auto_complete_box');
var utils = require('helpers/utils');

module.exports = React.createClass({

  displayName: "MentionAutoComplete",

  componentDidUpdate: function () {
    if (this.props.mention_results_count > 0) {
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
      <div className="hc-mention-ac hc-chat-input-autocomplete">
        <AutoCompleteBox key="mention_auto_complete"
                          type="mention"
                          list={this.props.mention_list}
                          should_animate_avatar={this.props.should_animate_avatar}
                          textarea_ref={this.props.textarea_ref}
                          selected_item={this.props.mention_selected_item}
                          ref="acBox" />
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/mention_autocomplete.js
 **/