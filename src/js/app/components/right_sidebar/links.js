import Link from './link';
import EmptyState from './links_empty_state';
import RosterStore from 'stores/roster_store';
import RightPanelActions from 'actions/right_panel_actions';
import VideoActions from 'actions/video_actions';
import PreferencesStore from 'stores/preferences_store';
import PreferencesKeys from 'keys/preferences_keys';
import video_utils from 'helpers/video_utils';
import cx from 'classnames';
import logger from 'helpers/logger';
import SidebarListSpinner from './sidebar_list_spinner';

export default React.createClass({

  displayName: "RightSideBarLinks",

  propTypes: {
    is_guest: React.PropTypes.bool
  },

  getInitialState: function() {
    return this._getState();
  },

  componentDidMount: function() {
    RosterStore.on([
      'change:links',
      'change:rooms',
      'change:panels_scroll_top',
      'change:active_chat'
    ], this._onChange);
    PreferencesStore.on(['change:' + PreferencesKeys.USE_24_HR_FORMAT], this._onChange);
    this.throttledSetScrollPosition = _.throttle(this._setScrollPosition, 200, {leading: false, trailing: true});
  },

  componentWillUnmount: function() {
    RosterStore.off([
      'change:links',
      'change:rooms',
      'change:panels_scroll_top',
      'change:active_chat'
    ], this._onChange);
    PreferencesStore.off(['change:' + PreferencesKeys.USE_24_HR_FORMAT], this._onChange);
    this.throttledSetScrollPosition.cancel();
  },

  componentDidUpdate(prevProps, prevState){
     if (prevState.room !== this.state.room){
       if (this.state.links_fetched && this.state.size > 0) {
         let index = this._getInitialIndex();
         this.refs.list.scrollTo(index);
         logger.type('links-panel').log('Scrolled to index: ', index);
       }
     }
  },

  onScrollStop(){

    let node = this.refs.scrollbox;

    RightPanelActions.setPanelScrollTopPosition({
      room: this.state.room,
      type: 'links',
      scroll_top: node.scrollTop
    });

    if (!this.state.all_links_fetched && node.scrollHeight <= node.scrollTop + node.offsetHeight){
      RightPanelActions.fetchLinksHistory();
    }

    let index = this._getInitialIndex(node.scrollTop);
    logger.type('links-panel').log('Scroll is stopped on index:', index);
  },

  _getState: function() {

    let {
      active_chat: room,
      links,
      panels_scroll_top,
      rooms
    } = RosterStore.getAll();


    let scroll_top = _.get(panels_scroll_top[room], `links`, 0),
        links_fetched = _.get(rooms[room], `links_fetched`, false),
        links_fetching = _.get(rooms[room], `links_fetching`, false),
        all_links_fetched = _.get(rooms[room], `all_links_fetched`, false),
        room_id = _.get(rooms[room], 'id'),
        size = links.length;

    return {
      room,
      room_id,
      scroll_top,
      links_fetched,
      all_links_fetched,
      links_fetching,
      links,
      size,
      use24hrTime: PreferencesStore.shouldUse24HrTime()
    };
  },

  _onChange: function() {
    this.setState(this._getState());
  },

  _onClick(evt) {
    let isLink = _.get(evt, 'target.tagName', '').toLowerCase() === 'a';
    let url = _.get(evt, 'target.href', null);
    let jid = this.state.room;
    let room_id = this.state.room_id;

    if (!this.props.is_guest && isLink && !!url && video_utils.isVideoLink(url)) {
      evt.preventDefault();
      VideoActions.joinRoomVideoCall({ url, jid, room_id });
    }
  },

  _getLink: function (index, key) {

    let link = this.state.links[index];
    if (!link){
      return <SidebarListSpinner key={key} height={this._getRowHeight()} />;
    }

    return <Link key={key}
                 name={link.user_name}
                 url={link.url}
                 date={link.date}
                 use_24hr_time={this.state.use24hrTime}
                 display_url={link.display_url}/>;
  },

  _getRowHeight(){
    return 42;
  },

  _getInitialIndex(scroll_top){
    let rowHeight = this._getRowHeight();
    return Math.floor((scroll_top || this.state.scroll_top) / rowHeight);
  },

  _linksBody() {
    return (
      <ul className="aui-nav aui-navgroup-vertical" data-skate-ignore>
        <ReactList
            ref="list"
            itemRenderer={this._getLink}
            length={this._getListSize()}
            initialIndex={this._getInitialIndex()}
            use_24hr_time={this.state.use24hrTime}
            threshold={0}
            pageSize={50}
            type='variable' />
      </ul>
    );
  },

  _getListSize(){
    let size = this.state.size;
    if (this.state.links_fetching){
      size++;
    }
    return size;
  },

  _setScrollPosition(){

    let node = this.refs.scrollbox;

    if (!node){
      return;
    }

    RightPanelActions.setPanelScrollTopPosition({
      room: this.state.room,
      type: 'links',
      scroll_top: node.scrollTop
    });

    let index = this._getInitialIndex(node.scrollTop);
    logger.type('links-panel').log('Scrolled to index:', index);
  },

  _onScroll(){

    this.throttledSetScrollPosition();

    if (this.state.all_links_fetched || this.state.links_fetching){
      return;
    }

    let node = this.refs.scrollbox;

    if (node.scrollHeight - node.offsetHeight < node.scrollTop + node.offsetHeight){
      RightPanelActions.fetchLinksHistory();
    }
  },

  render(){

    if (!this.props.is_guest && !this.state.links_fetched){
      return null;
    }

    var linkClasses = cx({
          'hc-links': true,
          'hc-sidebar-scroll': true,
          'hc-bg-striped': !_.isEmpty(this.state.links)
        }),
        links_display = _.isEmpty(this.state.links) ? <EmptyState /> : this._linksBody();

    return (
      <div className={linkClasses} ref="scrollbox" onClick={this._onClick} onScroll={this._onScroll}>
        {links_display}
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/links.js
 **/