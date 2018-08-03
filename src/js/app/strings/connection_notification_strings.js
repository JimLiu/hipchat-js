export default {
  connecting: `Connecting...`,
  connecting_seconds: (sec) => {
    return `Connecting in ${sec} second${sec !== 1 ? 's' : ''}`;
  },
  check_network: `We're having trouble connecting to HipChat. We'll try again in a few seconds.`,
  retry_cta: `Retry now`,
  unable_to_connect_hipchat: (status_url) => (`We couldn't connect to HipChat. Check your network connection or check our <a href="${status_url}" target="_blank">status</a>.`),
  cant_connect: `Couldn't connect`,
  disconnecting: `Disconnecting`,
  offline: `Offline`,
  offline_status: `It looks like you’re not connected to the internet. Check your network connection.`
};


/** WEBPACK FOOTER **
 ** ./src/js/app/strings/connection_notification_strings.js
 **/