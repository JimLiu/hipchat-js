import status_strings from 'strings/status_strings';
import utils from 'helpers/utils';

var user_utils = {

  get_user_name: function (users, group_id, user_id) {
    var jid_fragment = group_id + "_" + user_id + "@",
        user_name = "Unknown";
    _.find(users, function (val, key) {
      if (key.indexOf(jid_fragment) > -1) {
        user_name = val.name;
      }
    });
    return user_name;
  },

  get_user_status: function (presence_show) {
    var status;

    switch(presence_show) {
      case "chat":
        status = status_strings.available;
        break;
      case "away":
        status = status_strings.idle;
        break;
      case "xa":
        status = status_strings.away;
        break;
      case "dnd":
        status = status_strings.dnd;
        break;
      case "mobile":
        status = status_strings.mobile;
        break;
      default:
        status = status_strings.unavailable;
    }
    return status;
  },

  chat_header_status: function (presence_status) {
    var status;
    switch(presence_status) {
      case "chat":
        status = status_strings.available;
        break;
      case "away":
        status = status_strings.away;
        break;
      case "xa":
        status = status_strings.away;
        break;
      case "dnd":
        status = status_strings.dnd;
        break;
      case "mobile":
        status = status_strings.mobile;
        break;
      default:
        status = status_strings.unavailable;
    }
    return status;
  },

  format_idle_time: function (seconds) {
    var time_msg = "",
        days = Math.floor(seconds / 86400),
        hours = Math.floor((seconds % 86400) / 3600),
        mins = Math.floor(((seconds % 86400) % 3600) / 60);

    if (days > 0) {
      time_msg = days + "d ";
    }
    if (hours > 0) {
      time_msg += hours + "h ";
    }
    if (mins > 0) {
      time_msg += mins + "m";
    }
    return $.trim(time_msg);
  },

  is_admin: function (admins, ownerId, user) {
    var result = false,
        uid = Number(_.get(user, "user_id") || _.get(user, "id")),
        oid = Number(ownerId);

    if (_.get(user, "is_admin") || _.get(user, 'is_group_admin')) {
      result = true;
    } else if (uid) {
      if (admins) {
        result = _.some(admins, function (val) {
          return val === uid;
        });
      }
      if (!result && oid) {
        result = (oid === uid);
      }
    }
    return result;
  },

  is_guest: function(user) {
    return !('subscription' in user);
  },

  sort_users(results, query, key = null) {
    let matchingRegex = new RegExp(`^${utils.escapeRegEx(query)}`, 'gmi');

    let { exact, highPriority, lowPriority } = results.reduce((acc, el) => {
      let sortableValue = key ? el[key] : el;
      let words = sortableValue.trim().split(' ');
      let isMatched = words.some(name => name.match(matchingRegex));
      let isExact = isMatched ? words.some(name => name.toLowerCase() === query.toLowerCase()) : false;

      if (isExact) {
        acc.exact.push(el);
      } else if(isMatched) {
        acc.highPriority.push(el);
      } else {
        acc.lowPriority.push(el);
      }

      return acc;
    }, { exact: [], highPriority: [], lowPriority: [] });

    let sortFunc = (a, b) => {
      let [valueA, valueB] = key ? [ a[key], b[key] ] : [ a, b ];
      return valueA.toLowerCase() > valueB.toLowerCase();
    };

    exact = exact.sort(sortFunc);
    highPriority = highPriority.sort(sortFunc);
    lowPriority = lowPriority.sort(sortFunc);

    return exact.concat(highPriority).concat(lowPriority);
  }

};

export default user_utils;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/user_utils.js
 **/