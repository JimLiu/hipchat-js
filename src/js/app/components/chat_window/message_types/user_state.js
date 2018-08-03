import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';

export default React.createClass({

  displayName: "UserStateMessageType",

  mixins: [DeepEqualRenderMixin],

  render: function () {
    return <div className="state info msg-line" data-mid={this.props.msg.mid}>{this.props.msg.body}</div>;
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/user_state.js
 **/