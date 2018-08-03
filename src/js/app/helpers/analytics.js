import AppDispatcher from 'dispatchers/app_dispatcher';

// Wrap the first change of AppStore::ui_available as a Promise,
// so that components that mount after the value is set can
// still hook into the event
const uiAvailablePromise = new Promise((resolve, reject) => {
  AppDispatcher.registerOnce('updated:ui_available', resolve);
});

export { uiAvailablePromise };


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/analytics.js
 **/