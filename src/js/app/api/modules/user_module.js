import scoped_api from './scoped_api';
import CurrentUserStore from 'stores/current_user_store';
import {open as open_room} from "./room_module";

export const getCurrentUser = scoped_api('view_room', () => {
  let current_user = CurrentUserStore.getAll();
  return {
    mention_name: current_user.mention,
    id: current_user.id,
    name: current_user.user_name,
    presence: {show: current_user.show},
    photo_url: current_user.photo_large,
    is_admin: current_user.is_admin,
    is_guest: current_user.is_guest,
    email: current_user.email,
    title: current_user.title
  };
});

export function open({userId, userMentionName, message}) {
  return open_room({userId, userMentionName, message});
}


/** WEBPACK FOOTER **
 ** ./src/js/app/api/modules/user_module.js
 **/