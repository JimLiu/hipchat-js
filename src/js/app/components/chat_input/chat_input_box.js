import ChatInput from './chat_input';
import MarkdownLink from 'components/common/read_only/markdown_link';
import ReadOnlyStore from 'stores/read_only_store';
import RosterStore from 'stores/roster_store';
import PreferencesStore from 'stores/preferences_store';
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';

module.exports = React.createClass({

  displayName: "ChatInputBox",

  mixins: [PureRenderMixin],

  getInitialState: function() {
    return this.getInputBoxState();
  },

  componentDidMount: function(){
    RosterStore.on(['change:chat_type'], this._onChange);
    PreferencesStore.on(['change:showChatSidebar', 'change:showGroupChatSidebar'], this._onChange);
    ReadOnlyStore.on(['change:read_only_mode', 'change:read_only_input_markdown'], this._onChange);
  },

  componentWillUnmount: function(){
    RosterStore.off(['change:chat_type'], this._onChange);
    PreferencesStore.off(['change:showChatSidebar', 'change:showGroupChatSidebar'], this._onChange);
    ReadOnlyStore.off(['change:read_only_mode', 'change:read_only_input_markdown'], this._onChange);
  },

  getInputBoxState: function () {
    return {
      chat_type: RosterStore.get("chat_type"),
      chat_sidebar_visible: PreferencesStore.shouldShowChatSidebar(),
      groupchat_sidebar_visible: PreferencesStore.shouldShowGroupChatSidebar(),
      read_only_mode: ReadOnlyStore.get('read_only_mode'),
      read_only_input_markdown: ReadOnlyStore.get('read_only_input_markdown')
    };
  },

  _onChange: function(){
    this.setState(this.getInputBoxState());
  },

  _sidebarVisible: function () {
    return this.state[this.state.chat_type + '_sidebar_visible'];
  },

  render: function() {
    var chatBoxClasses = cx({
          'hc-chat-box': true,
          'sidebar-hidden': !this._sidebarVisible(),
          'hc-read-only-mode': this.state.read_only_mode
        });

    var input;

    if (this.state.read_only_mode) {
      input = <MarkdownLink>{ this.state.read_only_input_markdown }</MarkdownLink>;
    } else {
      input = <ChatInput is_guest={this.props.is_guest} chat_type={this.state.chat_type} />;
    }

    return (
      <div className={chatBoxClasses}>
        {input}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_input/chat_input_box.js
 **/