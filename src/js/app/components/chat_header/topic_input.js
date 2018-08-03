import ChatHeaderActions from 'actions/chat_header_actions';
import AppConfig from 'config/app_config';
import cx from "classnames";
import PureRenderMixin from 'react-addons-pure-render-mixin';
import link_utils from "helpers/link_utils";
import AnalyticsActions from 'actions/analytics_actions';

export default React.createClass({

  displayName: "TopicInput",

  mixins: [PureRenderMixin],

  componentDidMount: function() {
    ReactDOM.findDOMNode(this.refs.topicInput).select();
    document.addEventListener("click", this._onBlur);
  },

  componentWillUnmount: function() {
    document.removeEventListener("click", this._onBlur);
  },

  getInitialState: function() {
    return {
      topic_editing_value: null
    };
  },

  _handleTopicSubmit: function(e) {
    e.preventDefault();
    if (this.state.topic_editing_value !== null) { // Only set topic if changes were made
      this._setTopic();
    }
    this._dismissTopicEdit();
  },

  _onKeydown: function(evt) {
    if (evt.keyCode === 27) {
      this._dismissTopicEdit();
    }
  },

  _onKeyPressCancel: function(e) {
    if (e.keyCode === 13) {
      this._dismissTopicEdit();
    }
  },

  _onBlur: function(e) {
    var $target = $(e.target);

    if (!$target.is(".change-topic-action > a")) {
      this._dismissTopicEdit();
    }
  },

  _preventBubbling: function(evt) {
    evt.nativeEvent.stopImmediatePropagation();
  },

  _setTopic: function() {
    ChatHeaderActions.changeTopic(this.state.topic_editing_value);
    this.state.topic_editing_value = null;
  },

  _dismissTopicEdit: function() {
    this.topic_editing_value = null;
    ChatHeaderActions.dismissTopicEdit();
  },

  _onValueChange: function(evt) {
    this.setState({
      topic_editing_value: evt.target.value
    });
  },

  _onCopy: function () {
    if (link_utils.identify_invite_link(window.getSelection().toString())) {
      AnalyticsActions.userInviteURLCopied();
    }
  },

  render: function() {
    var inputValue = (this.state.topic_editing_value !== null) ? this.state.topic_editing_value : this.props.topic_input_value,
        inputClasses = cx({
          'text': true,
          'topic-edit-input': true,
          'mousetrap': true
        });

    return (
      <form ref="topicForm" className="aui" onSubmit={this._handleTopicSubmit} onKeyDown={this._onKeydown} onClick={this._preventBubbling}>
        <input type="text"
               ref="topicInput"
               id="topic-input"
               maxLength={AppConfig.max_topic_text_length}
               className={inputClasses}
               value={inputValue}
               onCopy={this._onCopy}
               onChange={this._onValueChange}/>
        <button id="topic-submit-btn" type="submit" className="aui-button">
          <span className="aui-icon aui-icon-small aui-iconfont-success">Success </span>
        </button>
        <button id="topic-cancel-btn" type="button" className="aui-button" onKeyDown={this._onKeyPressCancel} onClick={this._dismissTopicEdit}>
          <span className="aui-icon hipchat-icon-xsmall hc-close-icon icon-close">Close </span>
        </button>
      </form>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/topic_input.js
 **/