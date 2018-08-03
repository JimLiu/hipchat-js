
export default {

  display_names: {},

  is_private_chat: function (jid) {
    return /@chat/.test(jid);
  },

  is_room: function (jid) {
    return /@conf/.test(jid);
  },

  is_lobby: function(jid) {
    return jid === 'lobby' || /^lobby@/.test(jid);
  },

  is_search: function(jid) {
    return jid === 'search' || /^search@/.test(jid);
  },

  is_chat: function(jid) {
    return (this.is_private_chat(jid) || this.is_room(jid)) && !this.is_lobby(jid) && !this.is_search(jid);
  },

  bare_jid: function (val) {
    if (!val) {
      return false;
    }

    return val.split('/')[0];
  },

  domain: function (val) {
    if (!val) {
      return false;
    }

    return val.split('@')[1].split('/')[0];
  },

  group_id: function (val) {
    var node = this.node(val);
    var id = node.substr(0, node.indexOf('_'));
    return parseInt(id, 10);
  },

  is_private_room: function (privacy) {
    return privacy === 'private';
  },

  is_public_room: function (privacy) {
    return privacy === 'public';
  },

  node: function (val) {
    if (!val) {
      return false;
    }

    return val.split('@')[0];
  },

  resource: function (val) {
    // we don't want to use val.split('/') here because there may be a slash
    // in the resource
    var i = val.indexOf('/');
    if (i === -1) {
      return null;
    }
    return val.substr(i + 1);
  },

  room_name: function (val) {
    var node = this.node(val);
    var name = node.substr(node.indexOf('_') + 1);
    return name;
  },

  // used to sanitize jids before using them in something HTML/Xpath like a jQuery search
  sanitize: function (val) {
    return val.replace('\\', '\\\\');
  },

  user_id: function (val) {
    var node = this.node(val);
    if (node) {
      var id = node.substr(node.indexOf('_') + 1);
      if (id.match(/[0123456789]+/)) {
        return parseInt(id, 10);
      }
    }

    return null;
  },

  user_name: function (jid) {
    return jid.split("/")[1];
  },

  get_display_name: function (jid, default_name) {

    if (typeof default_name === 'undefined') {
      default_name = 'Unknown';
    }
    if (!jid || typeof jid === 'undefined') {
      return default_name;
    }

    jid = this.bare_jid(jid);
    var member = this.display_names[jid];
    if (member) {
      return member.name;
    }

    return default_name;
  },

  /**
   * Builds a jid for the group instance
   *
   * @param groupName the name of the group
   * @param groupId the id of the group
   * @param conf the conference server string
   * @returns {string}
   */
  build_group_jid: function(groupName, groupId, conf) {
    return groupId + "_" + (typeof groupName === 'string' ? groupName.toLowerCase() : groupName) + "@" + conf;
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/jid_utils.js
 **/