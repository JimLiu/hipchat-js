/*global prettyPrintOne*/
import utils from 'helpers/utils';
import Expando from 'components/chat_window/expando';

export default React.createClass({
  displayName: 'CodeMessageType',

  mixins: [React.addons.PureRenderMixin],

  propTypes: {
    mid: React.PropTypes.string.isRequired,
    body: React.PropTypes.string.isRequired
  },

  render() {
    let { mid, body } = this.props,
        linenums = utils.getNumberOfLines(body) > 1,
        html = prettyPrintOne(`<pre class="prettyprint ${linenums ? 'linenums' : ''}">${_.escape(body)}</pre>`, undefined, linenums),
        content;

    if (utils.messageShouldBeTruncated(body)) {
      content =
        <Expando className="code" mid={mid} >
          <div className="msg-line"
               data-mid={mid}
               data-copyable={`{"format": "code", "mid": "${mid}"}`}>
            <div className="pre-wrap" dangerouslySetInnerHTML={{__html: html}} />
          </div>
        </Expando>;
    } else {
      content =
        <div className="msg-line code"
             data-mid={mid}
             data-copyable={`{"format": "code", "mid": "${mid}"}`}>
          <div className="pre-wrap" dangerouslySetInnerHTML={{__html: html}} />
        </div>;
    }

    return content;
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/code.js
 **/