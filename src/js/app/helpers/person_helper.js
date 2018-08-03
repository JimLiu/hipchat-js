import strings from 'strings/tooltip_strings';
import utils from 'helpers/utils';
import Presence from 'lib/enum/presence';

export default {

  get_user_tooltip_flat: function (user_name, user_mention_name, user_is_admin, user_presence_show, user_presence_status, user_presence_idle_time) {
    var title = `${user_name}\n` +
      `@${user_mention_name}\n` +
      `${strings.status} ${utils.user.get_user_status(user_presence_show)}`;

    if (user_presence_show === Presence.IDLE && user_presence_idle_time) {
      title += ` - ${user_presence_idle_time}`;
    }
    if (user_is_admin) {
      title += '\n' + strings.admin;
    }
    if (user_presence_status) {
      title += `\n` + this._splitToLines(`${strings.message} ${user_presence_status}`);
    }
    return title;
  },

  _splitToLines(str, maxLength = 50) {
     let sumLength = 0;
    if (str.length <= maxLength) {
      return str;
    }
    return str.split(' ').reduce((acc, part, index, arr) => {
      sumLength += part.length;
      if (index === arr.length - 1) {
        acc.push(part);
      } else if (sumLength > maxLength) {
        acc.push(part + '\n');
        sumLength = 0;
      } else {
        acc.push(part + ' ');
        sumLength = part.match('\n') ? 0 : sumLength;
      }

      return acc;
    }, []).join('');
  },

  get_user_tooltip: function (user) {
    let presence = user.presence || {};
    return this.get_user_tooltip_flat(user.name, user.mention_name, user.is_admin, presence.show, presence.status, presence.idleTime);
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/person_helper.js
 **/