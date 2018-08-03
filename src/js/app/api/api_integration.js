import SimpleXDM from 'simple-xdm/host';

import AppDispatcher from "dispatchers/app_dispatcher";
import * as AuthModule from './modules/auth_module';
import * as ChatModule from './modules/chat_module';
import * as DialogModule from './modules/dialog_module';
import * as RoomModule from './modules/room_module';
import * as SidebarModule from './modules/sidebar_module';
import * as UserModule from './modules/user_module';
import * as FileModule from './modules/file_module';

AppDispatcher.register("integration-iframe-event", (event, target, data) => {
  SimpleXDM.broadcast(event, target, data);
});

export var modules = {
  dialog: DialogModule,
  sidebar: SidebarModule,
  room: RoomModule,
  chat: ChatModule,
  auth: AuthModule,
  user: UserModule,
  file: FileModule
};

class APIIntegration {
  registerModules() {
    _.each(modules, (module, key) => {
      SimpleXDM.defineModule(key, module);
    });
  }

}

export default new APIIntegration();



/** WEBPACK FOOTER **
 ** ./src/js/app/api/api_integration.js
 **/