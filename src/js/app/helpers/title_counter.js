import strings from 'strings/common_strings';
import AppConfig from 'config/app_config';

export default class TitleCounter {

  constructor(data) {
    this.group_name = null;
    this.feature_flags = {};
    this.update(data);
  }

  update(data) {
    var group_name = _.get(data, 'group_name', ''),
        feature_flags = _.get(data, 'feature_flags', {});

    if (group_name !== this.group_name || !_.isEqual(feature_flags, this.feature_flags)) {
      this.group_name = group_name;
      this.feature_flags = feature_flags;
      this.set();
    }
  }

  set(unread_count = 0, notification = null) {
    var title = [];

    if (unread_count > AppConfig.max_unread_count) {
      title.push(`(${AppConfig.max_unread_count}+)`);
    } else if (unread_count) {
      title.push(`(${unread_count})`);
    }

    if (notification) {
      title.push(notification, '-');
    } else if (this.feature_flags.web_client_subdomain_scoped_session) {
      title.push(this.group_name, '-');
    }

    title.push(strings.app_name);

    this.setTitle(title.join(' '));
  }

  setTitle(title) {
    document.title = title;
  }

}


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/title_counter.js
 **/