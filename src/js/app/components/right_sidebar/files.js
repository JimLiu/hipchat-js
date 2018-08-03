import File from './file';
import EmptyState from './files_empty_state';
import RightPanelActions from 'actions/right_panel_actions';
import RosterStore from 'stores/roster_store';
import PreferencesStore from 'stores/preferences_store';
import PreferencesKeys from 'keys/preferences_keys';
import cx from 'classnames';
import logger from 'helpers/logger';
import SidebarListSpinner from './sidebar_list_spinner';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: 'RightSideBarFiles',

  mixins: [PureRenderMixin],

  propTypes: {
    is_guest: React.PropTypes.bool
  },

  getInitialState() {
    return this._getState();
  },

  componentDidMount() {
    RosterStore.on([
      'change:files',
      'change:rooms',
      'change:panels_scroll_top',
      'change:active_chat'
    ], this._onChange);
    PreferencesStore.on(['change:' + PreferencesKeys.USE_24_HR_FORMAT], this._onChange);
    RightPanelActions.filesMounted({id: _.uniqueId(), size: this.state.size});
    this.debouncedSetScrollPosition = _.debounce(this._setScrollPosition, 200, {leading: false, trailing: true});
  },

  componentWillUnmount() {
    RosterStore.off([
      'change:files',
      'change:rooms',
      'change:panels_scroll_top',
      'change:active_chat'
    ], this._onChange);
    PreferencesStore.off(['change:' + PreferencesKeys.USE_24_HR_FORMAT], this._onChange);
    this.debouncedSetScrollPosition.cancel();
  },

  componentDidUpdate(prevProps, prevState) {
    if (prevState.room !== this.state.room){
      if (this.state.files_fetched && this.state.size > 0) {
        let index = this._getInitialIndex();
        this.refs.list.scrollTo(index);
        logger.type('files-panel').log('Scrolled to index: ', index);
      }
    }
  },

  _getState() {
    var {
      active_chat: room,
      files,
      can_share_files,
      panels_scroll_top,
      rooms
    } = RosterStore.getAll();

    let scroll_top = _.get(panels_scroll_top[room], `files`, 0),
        files_fetched = _.get(rooms[room], `files_fetched`, false),
        files_fetching = _.get(rooms[room], `files_fetching`, false),
        all_files_fetched = _.get(rooms[room], `all_files_fetched`, false),
        size = files.length;

    return {
      room,
      scroll_top,
      files_fetched,
      files_fetching,
      all_files_fetched,
      files,
      size,
      can_share_files,
      use24hrTime: PreferencesStore.shouldUse24HrTime()
    };
  },

  _onChange() {
    this.setState(this._getState());
  },

  _getRowHeight() {
    return 42;
  },

  _getInitialIndex(scroll_top) {
    var rowHeight = this._getRowHeight();
    return Math.floor((scroll_top || this.state.scroll_top) / rowHeight);
  },

  _getFile(index, key) {
    var file = this.state.files[index];
    if (!file){
      return <SidebarListSpinner key={key} height={this._getRowHeight()} />;
    }
    return <File key={key}
                 file={file}
                 use_24hr_time={this.state.use24hrTime}/>;
  },

  _filesBody() {
    return (
      <ul className="aui-nav aui-navgroup-vertical" data-skate-ignore>
        <ReactList
          ref="list"
          itemRenderer={this._getFile}
          length={this._getListSize()}
          use_24hr_time={this.state.use24hrTime}
          initialIndex={this._getInitialIndex()}
          threshold={0}
          pageSize={50}
          itemSizeGetter={this._getRowHeight}
          type='variable' />
      </ul>
    );
  },

  _getListSize() {
    var size = this.state.size;
    if (this.state.files_fetching){
      size++;
    }
    return size;
  },

  _setScrollPosition() {
    var node = this.refs.scrollbox;

    if (!node){
      return;
    }

    RightPanelActions.setPanelScrollTopPosition({
      room: this.state.room,
      type: 'files',
      scroll_top: node.scrollTop
    });

    let index = this._getInitialIndex(node.scrollTop);
    logger.type('files-panel').log('Scrolled to index:', index);
  },

  _onScroll() {
    this.debouncedSetScrollPosition();

    if (this.state.all_files_fetched || this.state.files_fetching){
      return;
    }

    let node = this.refs.scrollbox;

    if (node.scrollHeight - node.offsetHeight < node.scrollTop + node.offsetHeight){
      RightPanelActions.fetchFilesHistory();
    }
  },

  render() {
    if (!this.props.is_guest && !this.state.files_fetched){
      return null;
    }

    let fileClasses = cx({
          'hc-files': true,
          'hc-sidebar-scroll': true
        }),
        files_display = _.isEmpty(this.state.files) ? <EmptyState can_share_files={this.state.can_share_files} /> : this._filesBody();

    return (
      <div className={fileClasses} ref="scrollbox" onScroll={this._onScroll}>
        {files_display}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/files.js
 **/