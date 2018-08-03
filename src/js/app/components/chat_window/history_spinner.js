import AppDispatcher from 'dispatchers/app_dispatcher';
import Spinner from 'components/common/spinner/spinner';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({
  displayName: "HistorySpinner",

  mixins: [PureRenderMixin],

  getInitialState() {
    return {
      history_loading: false
    };
  },

  componentDidMount(){

    AppDispatcher.register({
      'requesting-ancient-history': this._requestingAncientHistory,
      'ancient-history-fetched': this._ancientHistoryFetched
    });
  },

  componentWillUnmount(){
    AppDispatcher.unregister({
      'requesting-ancient-history': this._requestingAncientHistory,
      'ancient-history-fetched': this._ancientHistoryFetched
    });
  },

  _requestingAncientHistory(){
    this.setState({
      history_loading: true
    });
  },

  _ancientHistoryFetched(){
    this.setState({
      history_loading: false
    });
  },

  render() {
    return (
      <Spinner spin={this.state.history_loading}
               spinner_class="hc-chat-spinner medium-spinner" />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/history_spinner.js
 **/