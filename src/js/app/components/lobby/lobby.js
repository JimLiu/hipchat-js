import LobbyStore from 'stores/lobby_store';
import ConfigStore from 'stores/configuration_store';
import PermissionsStore from 'stores/permissions_store';
import PreferencesStore from 'stores/preferences_store';
import LobbyActions from 'actions/lobby_actions';
import EmptyState from './empty_state';
import EmptySearchState from './empty_search_state';
import strings from 'strings/common_strings';
import utils from 'helpers/utils';
import AppDispatcher from 'dispatchers/app_dispatcher';
import DialogActions from 'actions/dialog_actions';
import AnalyticsActions from 'actions/analytics_actions';
import cx from 'classnames';
import LobbyItem from './lobby_item';
import LobbyMessage from './lobby_message';
import AnalyticsKeys from 'keys/analytics_keys';
import mousePosition from 'helpers/mouse_position';

export default React.createClass({

  displayName: "Lobby",

  getInitialState: function () {
    return this._getState();
  },

  componentDidMount: function () {
    this.debouncedFilter = _.debounce(this._debouncableFilter, 200);
    ConfigStore.on('change', this._onChange);
    LobbyStore.on('change', this._onChange);
    PermissionsStore.on('change', this._onChange);
    AppDispatcher.register('new-active-chat', this._roomSelected);
    LobbyActions.lobbyMounted();
    LobbyActions.resetSelectedItem();
    this._focusInput();
    this.throttledSetScrollPosition = _.throttle(this._setScrollPosition, 100, {leading: false, trailing: true});
  },

  componentWillUnmount: function () {
    ConfigStore.off('change', this._onChange);
    LobbyStore.off('change', this._onChange);
    PermissionsStore.off('change', this._onChange);
    AppDispatcher.unregister('new-active-chat', this._roomSelected);
    this.throttledSetScrollPosition.cancel();
  },

  _onKeyDown: function(evt){

    if (this.state.dialog_visible) {
      return;
    }

    if (evt.keyCode === utils.keyCode.UpArrow || evt.keyCode === utils.keyCode.DownArrow){

      evt.preventDefault();
      mousePosition.useLatest();

      if (!this.state.rows.length){
        return;
      }

      if (evt.keyCode === utils.keyCode.UpArrow && this.state.selected_item > 0){
        LobbyActions.selectedPrevItem();
      }

      if (evt.keyCode === utils.keyCode.DownArrow && this.state.selected_item < this.state.rows.length - 1){
        LobbyActions.selectedNextItem();
      }

      this.throttledSetScrollPosition();

    } else if (evt.keyCode === utils.keyCode.Enter) {

      this._openChat(evt);

    } else if (evt.keyCode === utils.keyCode.Esc) {

      this._clearInput();
    }
  },

  _setScrollPosition: function(){

    var container = ReactDOM.findDOMNode(this.refs.scrollable),
        rowHeight = document.getElementsByClassName('hc-lobby-list-item')[0].offsetHeight;

    var start = Math.ceil(container.scrollTop / rowHeight);
    var end = Math.floor((container.offsetHeight + container.scrollTop) / rowHeight);

    if (this.state.selected_item < start || this.state.selected_item > end - 1){
        let selected_item = container.querySelector('.hc-lobby-list-item.selected');
        if (!selected_item){
          selected_item = container.querySelector('.hc-lobby-list-item:last-child');
        }
        utils.scrollIntoViewIfNeeded(selected_item, container, false);
    }
  },

  renderItem(index, key){
    let item = this.state.rows[index];
    return <LobbyItem
              key={item.jid}
              jid={item.jid}
              name={item.name}
              user_id={item.id}
              mention_name={item.mention_name}
              privacy={item.privacy}
              type={utils.room.detect_chat_type(item.jid)}
              name_match_markup={item.name_match_markup}
              mention_match_markup={item.mention_match_markup}
              item_index={index}
              selected={this.state.selected_item === index}
              photo_url={item.photo_url}
              should_animate_avatar={this.state.should_animate_avatar}
              presence_show={item.presence ? item.presence.show : 'unknown'} />;
  },

  render: function () {

    var container_class = cx({
      'filtered-lobby-content': !(this.state.filter.scope === 'all' && this.state.filter.query === ''),
      'hc-lobby-panel': true,
      'hc-lobby-panel-content': true
    });

    var content;

    if (_.isEmpty(this.state.rows)){

      content = this.state.input_text ? <EmptySearchState inviteAction={this._inviteYourTeam}
                                                          userIsAdmin={this.state.userIsAdmin}
                                                          inviteUrl={this.state.inviteUrl}
                                                          inputText={this.state.input_text}
                                                          webServer={this.state.webServer}/>
                                      : <EmptyState />;
    } else {

      content = <ReactList
                  itemRenderer={this.renderItem}
                  length={this.state.rows.length}
                  selected={this.state.selected_item}
                  filtered_time={this.state.filtered_time}
                  threshold={10}
                  pageSize={20}
                  type='simple' />;
    }

    return (
      <div className="hc-rooms-container" tabIndex="1" onKeyDown={this._onKeyDown}>
        <header className="aui-page-header lobby-header">
            <div className="aui-page-header-inner">
                <div className="aui-page-header-main hc-lobby-search-content">
                  <form className="aui hc-filter-form" onSubmit={this._onSubmit}>
                    <label className="assistive" htmlFor="rosterfilter">{strings.filter}</label>
                    <input ref="lobbySearchInput" type="text" placeholder={strings.filter} className="text hc-filter long-field mousetrap" onChange={this._onInputChange} value={this.state.input_text}/>
                  </form>
                </div>
                <div className="aui-page-header-actions">
                    <div className="aui-buttons">
                        <button className={"aui-button aui-button-light " + (this.state.filter.scope === "all" ? "active" : "")} onClick={this._onFilter.bind(null,'all')}>{strings.all}</button>
                        <button className={"aui-button aui-button-light " + (this.state.filter.scope === "rooms" ? "active" : "")} onClick={this._onFilter.bind(null,'rooms')}>{strings.rooms}</button>
                        <button className={"aui-button aui-button-light " + (this.state.filter.scope === "people" ? "active" : "")} onClick={this._onFilter.bind(null,'people')}>{strings.people}</button>
                    </div>
                    { this._getCreateRoomButton() }
                    { this._getInviteTeamButton() }
                </div>
            </div>
        </header>
        <div className={container_class} ref="scrollable">
          {content}
        </div>
        {this._getLobbyMessage()}
      </div>
    );
  },

  _getLobbyMessage(){
    if (!this.state.isBTF && this.state.lobbyMessageEnabled){
      return <LobbyMessage webServer={this.state.webServer} theme={this.state.theme} />;
    }
  },

  _canCreateRoom(){
    return this.state.can_create_room;
  },

  _canInviteTeam(){
    return this.state.userIsAdmin || this.state.inviteUrl;
  },

  _getCreateRoomButton(){
    return this._canCreateRoom() ? (
      <div className="aui-buttons">
         <button onClick={this._onCreateRoom} className="aui-button aui-button-light" id="create-room-button">{strings.buttons.create_room}</button>
       </div>
    ) : null;
  },

  _getInviteTeamButton(){
    return this._canInviteTeam() ? (
      <div className="aui-buttons">
       <button ref="invite_team_button" onClick={this._inviteYourTeam} className="aui-button aui-button-light aui-inline-dialog-trigger" id="invite-team-button">{strings.buttons.invite_team}</button>
     </div>
    ) : null;
  },

  _getState: function () {
    return {
      rows: LobbyStore.get('filtered'),
      filter: LobbyStore.get('filter'),
      filtered_time: LobbyStore.get('filtered_time'),
      userIsAdmin: LobbyStore.get('user_is_admin'),
      inviteUrl: LobbyStore.get('invite_url'),
      webServer: LobbyStore.get('web_server'),
      isBTF: _.get(ConfigStore.get('feature_flags'), 'btf', false),
      lobbyMessageEnabled: _.get(ConfigStore.get('feature_flags'), 'web_client_lobby_message_enabled', false),
      input_text: LobbyStore.get('input_text'),
      selected_item: LobbyStore.get('selected_item'),
      dialog_visible: LobbyStore.get('dialog_visible'),
      theme: LobbyStore.get('theme'),
      can_create_room: PermissionsStore.canCreateRoom(),
      should_animate_avatar: PreferencesStore.shouldAnimateAvatars()
    };
  },

  _openChat(e) {
    var key = _.keys(this.state.rows)[this.state.selected_item];
    if (key) {
      e.preventDefault();
      var data = _.cloneDeep(this.state.rows[key]);
      data.query = this.state.filter.query;
      LobbyActions.openChat(data);
      LobbyActions.resetFilter();
    }
  },

  _clearInput(){
    if (this.state.input_text){
      this._setInputText("");
    }
  },

  _debouncableFilter: function(){
    LobbyActions.applyFilter({
      query: this.state.input_text,
      scope: this.state.filter.scope
    });
  },

  _onInputChange: function(evt) {
    this._setInputText(evt.target.value);
  },

  _setInputText(text){
    LobbyActions.setInputText(text);
    this.debouncedFilter();
    ReactDOM.findDOMNode(this.refs.scrollable).scrollTop = 0;
  },

  _onChange: function () {
    this.setState(this._getState());
  },

  _onFilter: function (scope) {
    LobbyActions.applyFilter({
      query: this.state.input_text,
      scope: scope
    });
    LobbyActions.resetSelectedItem();
    ReactDOM.findDOMNode(this.refs.scrollable).scrollTop = 0;
  },

  _onCreateRoom: function (e) {
    e.preventDefault();
    LobbyActions.showCreateRoomDialog();
  },

  _onSubmit: function (e) {
    e.preventDefault();
  },

  _roomSelected: function (data) {
    if (utils.jid.is_lobby(data.jid)) {
      this._focusInput();
    }
  },

  _focusInput: function () {
    if (this.refs.lobbySearchInput !== document.activeElement) {
      try {
        this.refs.lobbySearchInput.select();
      } catch (e) {
        this.refs.lobbySearchInput.focus();
      }
    }

  },

  _inviteYourTeam: function(evt) {
    evt.preventDefault();
    DialogActions.showInviteTeammatesDialog({type: AnalyticsKeys.LOBBY, default_text: this.state.input_text});
    AnalyticsActions.inviteTeamClickedEvent("lobby");
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/lobby/lobby.js
 **/