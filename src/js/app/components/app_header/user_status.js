import PersonAvatar from "components/common/avatars/person_avatar";
import UserStatusMenu from "components/app_header/user_status_menu";
import ConnectionStatus from 'components/app_header/connection_status';
import HelpMenuContent from "components/app_header/help_menu_content";
import CurrentUserStore from 'stores/current_user_store';
import ConfigStore from 'stores/configuration_store';
import AppHeaderActions from 'actions/app_header_actions';
import SearchInput from 'components/app_header/search_input';
import PresenceIcon from 'components/common/icon/presence-icon';
import utils from 'helpers/utils';
import AUIDropdownTrigger from 'components/common/aui/dropdown2/aui_dropdown2_trigger';
import AUIDropdown from 'components/common/aui/dropdown2/aui_dropdown2';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import ConnectionStatusStore from 'stores/connection_status_store';
import ConnectionStates from 'lib/enum/connection';
import NetworkStates from 'lib/enum/network';

export default React.createClass({

  displayName: "UserStatus",

  mixins: [PureRenderMixin],

  getInitialState() {
    return this._getState();
  },

  componentDidMount (){
    CurrentUserStore.on(['change'], this._onChange);
    ConfigStore.on('change:web_server', this._onChange);
    ConnectionStatusStore.on('change', this._onChange);

    this._debouncedResize = _.debounce(this._debouncedChange, 50, {leading: false, trailing: true});
    $(window).on('resize', this._debouncedResize);
  },

  componentWillUnmount() {
    CurrentUserStore.off(['change'], this._onChange);
    ConfigStore.off('change:web_server', this._onChange);
    ConnectionStatusStore.off('change', this._onChange);

    $(window).off('resize', this._debouncedResize);
    this._debouncedResize.cancel();
  },

  _onHelpButtonClicked() {
    AppHeaderActions.helpButtonClicked();
  },

  _onUserProfileDropdownClick() {
    AppHeaderActions.userProfileDropdownClicked();
  },

  _getSearchInput() {
    return (
      <li>
        <SearchInput jid={this.props.active_chat}
                     text={this.props.search_text}
                     focus_search={this.props.focus_search}
                     search_enabled={this.props.search_enabled} />
      </li>
    );
  },

  _getHelpMenu(is_guest) {
    var help_menu;

    if (!is_guest) {
      help_menu = (
        <li>
          <AUIDropdownTrigger type="link" id="header-help-menu-link" dropdownID="header-help-menu" className="hc-header-help-menu" arrowless={true}>
            <span className='aui-icon aui-icon-small aui-iconfont-help'></span>
          </AUIDropdownTrigger>
          <AUIDropdown dropdownID="header-help-menu" className="aui-dropdown2-in-header">
            <HelpMenuContent read_only_mode={this.props.read_only_mode} />
          </AUIDropdown>
        </li>
      );
    }

    return help_menu;
  },

  render() {
    var searchInput = (this.props.is_guest || this._shouldHideSearchInput()) ? false : this._getSearchInput(),
        help_menu = this._getHelpMenu(this.props.is_guest);

    return (
      <div className="aui-header-secondary">
        <ul className="aui-nav" data-skate-ignore>
          <li>
            <ConnectionStatus />
          </li>
          {searchInput}
          {help_menu}
          <li id="status_dropdown" ref="status_dropdown" className="status-dropdown" onClick={this._onUserProfileDropdownClick}>
            <AUIDropdownTrigger type="link" dropdownID="current-user-status" className="hc-header-user-avatar">
              <PersonAvatar avatar_url={this.state.photo_small}
                         size="small"
                         shouldAnimate={this.props.should_animate_avatar}
                         show_presence={false}/>
              <PresenceIcon presence={this.state.show} active={true} uid={this.state.id}/>
            </AUIDropdownTrigger>
            <AUIDropdown dropdownID="current-user-status" className="aui-dropdown2-in-header">
              <UserStatusMenu
                web_server={this.state.web_server}
                is_guest={this.props.is_guest}
                multi_org_supported={this.props.multi_org_supported}
                presence_show={this.state.show}
                presence_status={this.state.status}
                current_user_uid={this.state.id}/>
            </AUIDropdown>
          </li>
        </ul>
      </div>
    );
  },

  _shouldHideSearchInput() {
    var headerWidth = $('.aui-header').width();

    return ((this.state.connectionStatus !== ConnectionStates.CONNECTED || this.state.networkStatus !== NetworkStates.ONLINE) && headerWidth < 950);
  },

  _getState() {
    return _.extend({
        web_server: ConfigStore.get('web_server'),
        presenceDialogVisible: false,
        currentTime: utils.getMoment(),
        connectionStatus: ConnectionStatusStore.get('connection_status'),
        networkStatus: ConnectionStatusStore.get('network_status')
      },
      CurrentUserStore.getAll()
    );
  },

  _onChange(){
    this.setState(this._getState());
  },

  _debouncedChange(){
    AppHeaderActions.positionDialogs();
    this._onChange();
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/app_header/user_status.js
 **/