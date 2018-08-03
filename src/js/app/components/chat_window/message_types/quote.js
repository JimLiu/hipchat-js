import Expando from 'components/chat_window/expando';

export default React.createClass({
  displayName: 'QuoteMessageType',

  mixins: [React.addons.PureRenderMixin],

  propTypes: {
    mid: React.PropTypes.string.isRequired,
    body: React.PropTypes.string.isRequired
  },

  render() {
    return (
      <Expando mid={this.props.mid}>
        <blockquote data-copyable={`{"format": "quotation", "mid": "${this.props.mid}"}`}>{this.props.body}</blockquote>
      </Expando>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/quote.js
 **/