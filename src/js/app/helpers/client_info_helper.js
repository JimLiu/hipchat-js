import ConfigStore from 'stores/configuration_store';

export const UNKNOWN_LOCATION_ID = 0;
export const INTERNET_LINK_LOCATION_ID = 1;
export const WEB_CLIENT_LOCATION_ID = 2;
export const MAC_CLIENT_LOCATION_ID = 3;
export const WINDOWS_CLIENT_LOCATION_ID = 4;
export const LINUX_CLIENT_LOCATION_ID = 5;
export const IOS_CLIENT_LOCATION_ID = 6;
export const ANDROID_CLIENT_LOCATION_ID = 7;

export function getClientLocationId() {
  var clientType = ConfigStore.get('client_type');
  var clientSubtype = ConfigStore.get('client_subtype');
  if (clientType === 'qt' && clientSubtype === 'windows') {
    return WINDOWS_CLIENT_LOCATION_ID;
  } else if (clientType === 'qt' && clientSubtype === 'linux') {
    return LINUX_CLIENT_LOCATION_ID;
  } else if (clientType === 'mac') {
    return MAC_CLIENT_LOCATION_ID;
  } else if (clientType === 'web') {
    return WEB_CLIENT_LOCATION_ID;
  }
  return UNKNOWN_LOCATION_ID;
}



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/client_info_helper.js
 **/