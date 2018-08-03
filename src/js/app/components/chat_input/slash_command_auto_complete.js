import AutoCompleteBox from 'components/common/autocomplete/auto_complete_box';
import utils from 'helpers/utils';

export default React.createClass({

  displayName: "SlashCommandAutoComplete",

  componentDidUpdate() {
    if (this.props.slash_command_results_count > 0) {
      this._scrollIntoView();
    }
  },

  _scrollIntoView() {
    var $node = $(ReactDOM.findDOMNode(this));
    var container = $node.find('.aui-inline-dialog-contents.contents').get(0);

    utils.scrollIntoViewIfNeeded($node.find('li.hc-autocomplete-item-selected').get(0), container, false);
  },

  render() {
    return (
      <div className="hc-slash-command-ac hc-chat-input-autocomplete">
        <AutoCompleteBox key="slash_command_auto_complete"
                          type="slash_command"
                          offset_left={-20}
                          list={this.props.slash_commands_list}
                          selected_item={this.props.slash_command_selected_item}
                          textarea_ref={this.props.textarea_ref}
                          ref="acBox" />
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/slash_command_auto_complete.js
 **/