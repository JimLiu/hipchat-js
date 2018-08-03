var ChatPanelStrings = require('strings/chat_panel_strings');
var cx = require('classnames');
import ChatWindowActions from 'actions/chat_window_actions';

module.exports = React.createClass({

  displayName: "Expando",

  getInitialState: function(){
    return {
      truncated: true,
      height: 0
    };
  },

  componentDidMount: function(){
    var height = $(ReactDOM.findDOMNode(this.refs.expando)).height();
    this.setState({
      height: height,
      truncated: height > 120 ? true : false
    });
  },

  componentDidUpdate: function() {
    ChatWindowActions.preserveScrollValue({animation: false});
  },

  render: function () {
    var contentClasses = cx({
      "msg-line": true,
      "truncatable": true,
      "truncated": this.state.truncated,
      "expanded": !this.state.truncated
    });
    var toggleClasses = cx({
      "truncatable": true,
      "truncated": this.state.truncated,
      "expanded": !this.state.truncated,
      "hidden": this.state.height <= 120
    });
    return (
      <div className={contentClasses + ' ' + this.props.className} data-mid={this.props.mid}>
        <div className="truncate-wrap">
          <div ref="expando" className="msg-wrap">
            {this.props.children}
          </div>
        </div>
        <div className={toggleClasses}>
          <a name="truncate" onClick={this._toggleTruncatedText}>{(this.state.truncated ? ChatPanelStrings.show_more : ChatPanelStrings.show_less)}</a>
        </div>
      </div>
    );
  },

  _toggleTruncatedText: function (e) {
    e.preventDefault();
    this.setState({
      truncated: !this.state.truncated
    });
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/expando.js
 **/