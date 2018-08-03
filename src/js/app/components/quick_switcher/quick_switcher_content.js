import QuickSwitcherInput from './quick_switcher_input';
import QuickSwitcherEmptyState from './quick_switcher_empty_state';
import QuickSwitcherHint from './quick_switcher_hint';
import QuickSwitcherStore from 'stores/quick_switcher_store';
import PreferencesStore from 'stores/preferences_store';
import AnalyticsActions from 'actions/analytics_actions';
import ClientPrefKeys from 'keys/client_preferences_keys';
import QuickSwitcherActions from 'actions/quick_switcher_actions';
import QuickSwitcherPerson from './quick_switcher_person';
import QuickSwitcherRoom from './quick_switcher_room';
import utils from 'helpers/utils';
import cx from 'classnames';

export default React.createClass({

  displayName: 'QuickSwitcherContent',

  componentDidMount () {
    QuickSwitcherStore.on(['change'], this._onChange);
    PreferencesStore.on([`change:${ClientPrefKeys.SHOW_QUICK_SWITCHER_HINT}`], this._onChange);
    this._throttledScrollToSelected = _.throttle(this._scrollToSelected, 100, {leading: false, trailing: true});
  },

  componentWillUnmount () {
    QuickSwitcherStore.off(['change'], this._onChange);
    PreferencesStore.off([`change:${ClientPrefKeys.SHOW_QUICK_SWITCHER_HINT}`], this._onChange);
    QuickSwitcherActions.reset();
    this._throttledScrollToSelected.cancel();
  },

  componentWillUpdate(nextProps, nextState) {
    // only fire the event if we are going from some results to no results.
    if(nextState.total === 0 && this.state.total > 0) {
      AnalyticsActions.quickSwitcherNoResults(nextState.text);
    }
  },

  componentDidUpdate () {
    ReactDOM.findDOMNode(this.refs.input.refs.input_field).focus();
  },

  getInitialState () {
    return this._getState();
  },

  _getState () {
    var qsData = QuickSwitcherStore.getAll();

    return {
      text: qsData.text,
      filtered: qsData.filtered,
      filtered_time: qsData.filtered_time,
      selected_item: qsData.selected_item,
      rows: qsData.list,
      total: qsData.list.length,
      show_hint: PreferencesStore.getShowQuickSwitcherHint(),
      should_animate_avatar: PreferencesStore.shouldAnimateAvatars()
    };
  },

  _onChange () {
    this.setState(this._getState());
  },

  _getEmptyState() {
    var empty_state = null;

    if (this.state.text && !this.state.total && this.state.filtered) {
      empty_state = <QuickSwitcherEmptyState ref='empty_state'/>;
    }

    return empty_state;
  },

  _getHint() {
    var hint = null;

    if (this.state.show_hint && !this.props.hideHint) {
      hint = <QuickSwitcherHint ref='qs_hint' with_results={this.state.total > 0}/>;
    }

    return hint;
  },

  _scrollTop() {
    if (this.refs.scrollable){
      this.refs.scrollable.scrollTo(0);
    }
  },

  _scrollToSelected() {

    if (!this.refs.scrollable || !this.state.rows.length){
      return;
    }

    var container = ReactDOM.findDOMNode(this.refs.scrollable_wrap),
        rowHeight = document.getElementsByClassName('hc-qs-item')[0].clientHeight,
        start = Math.ceil(container.scrollTop / rowHeight),
        end = Math.floor((container.clientHeight + container.scrollTop) / rowHeight);

    if (this.state.selected_item < start || this.state.selected_item > end - 1){
      let selected_item = container.querySelector('.hc-qs-item.selected');
      if (!selected_item){
        selected_item = container.querySelector('.hc-qs-item-container:last-child .hc-qs-item');
      }
      utils.scrollIntoViewIfNeeded(selected_item, container, false);
    }
  },

  renderItem(index, key){

    var item = this.state.rows[index],
        rendered_item;

    if (item.item_type === 'user') {
      let mention_markup = `@${item.mention_match_markup}`;
      rendered_item = <QuickSwitcherPerson key={'qs-item-' + item.jid}
        name={item.name}
        id={item.id}
        name_markup={item.name_match_markup}
        mention_name={item.mention_name}
        mention_markup={mention_markup}
        jid={item.jid}
        photo_url={item.photo_url}
        show={item.presence_show}
        mobile={item.presence_mobile}
        idx={index}
        should_animate_avatar={this.state.should_animate_avatar}
        selected={this.state.selected_item === index} />;
    } else {
      rendered_item = <QuickSwitcherRoom key={'qs-item-' + item.jid}
        name={item.name}
        name_markup={item.name_match_markup}
        jid={item.jid}
        privacy={item.privacy}
        idx={index}
        selected={this.state.selected_item === index} />;
    }

    return (
      <div key={key} className="hc-qs-item-container">
        { rendered_item }
      </div>
    );
  },

  render() {

    var scrollableWrapClasses = cx({
          'hc-qs-list-wrap': true,
          'with-hint': this.state.show_hint
        }),
        empty_state = this._getEmptyState(),
        hint = this._getHint();

    return (
      <div className='hc-qs-content'>
        <QuickSwitcherInput
          text={this.state.text}
          scrollTop={this._scrollTop}
          canNavigate={this.state.rows.length > 0}
          scrollToSelected={this._throttledScrollToSelected}
          ref='input'/>
        <div ref='scrollable_wrap' className={scrollableWrapClasses}>
          { empty_state }
          <ReactList
            ref='scrollable'
            itemRenderer={this.renderItem}
            length={this.state.rows.length}
            selected={this.state.selected_item}
            filtered_time={this.state.filtered_time}
            threshold={10}
            type='simple'/>
        </div>
        { hint }
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/quick_switcher/quick_switcher_content.js
 **/