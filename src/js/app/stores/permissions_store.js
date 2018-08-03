import AppDispatcher from 'dispatchers/app_dispatcher';
import ConfigStore from 'stores/configuration_store';
import Store from 'lib/core/store';
import utils from 'helpers/utils';

class PermissionsStore extends Store {

  constructor() {
    super();
    this._hasRoomPermissionCheck = _.memoize(this._hasRoomPermission);
  }

  getDefaults() {
    return {
      permissions: {},
      room_roles: {},
      room_permissions: {},
      current_room: null,
      user_is_admin: false,
      user_is_room_admin: false,
      current_user: {},
      invite_url: false
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'hc-init': (data) => {
        this._init(data);
      }
    });

    AppDispatcher.register({
      'updated:config': (data) => {
        this._init(data);
      },
      'updated:permissions': (perms) => {
        this.set('permissions', perms);
      },
      'updated:current_user': (user) => {
        this.set('current_user', user);
        this._updateCurrentRoomRoles();
      },
      'updated:activeRooms': (rooms) => {
        let roomRolesInformation = _.mapValues(rooms, room => ({admins: room.admins, owner: room.owner}));
        let updatedRoomRoles = _.merge(this.data.room_roles, roomRolesInformation);

        this.set('room_roles', updatedRoomRoles);
        this._updateCurrentRoomRoles();
      },
      'updated:active_chat': (jid) => {
        this._clearPermissionsCache();
        this.data.current_room = jid;
        this._updateCurrentRoomRoles();
      },
      'DAL:handle-joined-rooms': (rooms) => {
        this._updateRoomPermissions(rooms);
      }
    });
  }

  _init(data) {
    this.set({
      user_is_admin: data.is_admin,
      invite_url: data.invite_url
    });
  }

  canCreateRoom() {
    var permissions = this.data.permissions;
    return permissions.create_rooms === "all" || (permissions.create_rooms === "admins" && this.data.user_is_admin);
  }

  canInviteUsersToGroup() {
    return !ConfigStore.get('feature_flags').hide_invite_your_team_button && (this.data.user_is_admin === true || this.data.invite_url);
  }

  canViewGuestAccess() {
    return this._hasRoomPermissionCheck('room:view_guest_access');
  }

  canToggleGuestAccess() {
    return this._hasRoomPermissionCheck('room:toggle_guest_access');
  }

  _hasRoomPermission(permission) {
    let user_jid = _.get(this.data.current_user, "jid"),
        current_room_permissions = this.data.room_permissions[this.data.current_room] || {},
        current_user_room_permissions = current_room_permissions[user_jid] || [];

    return current_user_room_permissions.indexOf(permission) !== -1;
  }

  canManageRoomIntegrations(){
    return this.data.user_is_admin === true
      || this.data.user_is_room_admin === true
      || this.data.permissions.manage_room_integrations === 'all';
  }

  canUpdateRoomIntegrations() {
    return this.data.user_is_admin === true
      || this.data.user_is_room_admin === true;
  }

  _updateRoomPermissions(rooms) {
    let user_jid = this.data.current_user.jid;
    utils.toArray(rooms).forEach((room) => {
      _.set(this.data.room_permissions, [room.jid, user_jid], room.permissions);
    });
    this._clearPermissionsCache();
    this.set('room_permissions', this.data.room_permissions);
  }

  _updateCurrentRoomRoles() {
    let current_room_admins = _.get(this.data.room_roles, [this.data.current_room, 'admins'], []);
    let current_room_owner = _.get(this.data.room_roles, [this.data.current_room, 'owner'], null);
    let user_is_room_admin = utils.user.is_admin(current_room_admins, current_room_owner, this.data.current_user);

    this.set({
      user_is_room_admin: user_is_room_admin
    });
  }

  _clearPermissionsCache() {
    this._hasRoomPermissionCheck.cache.clear();
  }

  clear() {
    super.clear();
    this._clearPermissionsCache();
  }

  reset() {
    super.reset();
    this._clearPermissionsCache();
  }

}

module.exports = new PermissionsStore();


/** WEBPACK FOOTER **
 ** ./src/js/app/stores/permissions_store.js
 **/