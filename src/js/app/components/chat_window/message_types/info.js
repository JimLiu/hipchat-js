import emoticons from 'helpers/emoticons';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';

export default React.createClass({

  displayName: "InfoMessageType",

  mixins: [DeepEqualRenderMixin],

  componentDidMount: function() {
    emoticons._replaceSpecials(ReactDOM.findDOMNode(this));
  },

  render: function () {
    return <div className="info msg-line"
                data-copyable={`{"format": "info"}`}
                data-mid={this.props.msg.mid}
                data-presence-message={this.props.msg.is_presence_message}
                dangerouslySetInnerHTML={{__html: this.props.msg.rendered_body}} />;
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/info.js
 **/