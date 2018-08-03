import utils from 'helpers/utils';
import Expando from 'components/chat_window/expando';

export default React.createClass({
  displayName: 'MonospaceMessageType',

  mixins: [React.addons.PureRenderMixin],

  propTypes: {
    mid: React.PropTypes.string.isRequired,
    body: React.PropTypes.string.isRequired
  },

  render() {
    let { mid, body } = this.props,
        html = `<pre class="prettyprint">${_.escape(body)}</pre>`,
        content;

    if (utils.messageShouldBeTruncated(body)) {
      content =
        <Expando className="monospace" mid={mid} >
          <div className="msg-line"
               data-mid={mid}
               data-copyable={`{"format": "monospace", "mid": "${mid}"}`}>
            <div className="pre-wrap" dangerouslySetInnerHTML={{__html: html}} />
          </div>
        </Expando>;
    } else {
      content =
        <div className="msg-line monospace"
             data-mid={mid}
             data-copyable={`{"format": "monospace", "mid": "${mid}"}`}>
          <div className="pre-wrap" dangerouslySetInnerHTML={{__html: html}} />
        </div>;
    }

    return content;
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/monospace.js
 **/