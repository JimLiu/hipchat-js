import AppHeaderActions from 'actions/app_header_actions';
import AnalyticsActions from 'actions/analytics_actions';
import utils from 'helpers/utils';
import cx from 'classnames';
import AppConfig from 'config/app_config';

export default React.createClass({

  displayName: "SearchInput",

  componentDidMount() {
    this._shouldFocus();
  },

  componentDidUpdate() {
    this._shouldFocus();
  },

  _shouldFocus() {
    var input = ReactDOM.findDOMNode(this.refs.searchInput);
    if (this.props.focus_search && input) {
      this._focusAndSelect(input);
    }
  },

  _focusAndSelect(input) {
    if (input !== document.activeElement) {
      input.focus();
      input.select();
    }
  },

  render() {
    var inputClasses = cx({
      'mousetrap': true
    });

    return (
      <div className="aui-quicksearch">
        <input id="search-query"
               tabIndex="-1"
               type="text"
               className={inputClasses}
               placeholder="Search history"
               name="name"
               autoComplete="off"
               data-tipsify-ignore
               aria-label="Search for something"
               ref="searchInput"
               onKeyDown={this._onKeyDown}
               onChange={this._onChange}
               onBlur={this._onBlur}
               onFocus={this._onFocus}
               value={this.props.text} />
      </div>
    );
  },

  _onKeyDown(evt) {
    if (evt.keyCode === utils.keyCode.Enter) {
      if (this.props.search_enabled) {
        AppHeaderActions.searchHistory(this.props.jid, this.props.text);
      } else {
        AppHeaderActions.searchHistoryExternally(this.props.jid, this.props.text);
      }
      AnalyticsActions.searchInputSubmitted(this.props.jid);
    } else if (evt.keyCode === utils.keyCode.Esc) {
      AppHeaderActions.setSearchText({
        text: ""
      });
      if (this.props.jid !== 'search') {
        this._focusOnMessageInput();
      }
    }
  },

  _focusOnMessageInput() {
    document.getElementById(`${AppConfig.chat_input_id}`).focus();
  },

  _onChange(evt) {
    AppHeaderActions.setSearchText({
      text: evt.target.value
    });
  },

  _onBlur() {
    AppHeaderActions.searchBlurred();
  },

  _onFocus(){
    AnalyticsActions.searchInputClicked();
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/search_input.js
 **/