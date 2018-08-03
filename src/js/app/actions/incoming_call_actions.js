import AppDispatcher from 'dispatchers/app_dispatcher';
import AnalyticsDispatcher from 'dispatchers/analytics_dispatcher';

export default {

  answerCall: function(data, service) {
    AnalyticsDispatcher.dispatch('analytics-event', {
      name: 'hipchat.client.user.oto.video.answer',
      properties: {
        service: service
      }
    });
    AppDispatcher.dispatch(`${service}.answer-audio-video-call`, data);
  },

  declineCall: function(data, service) {
    AnalyticsDispatcher.dispatch('analytics-event', {
      name: 'hipchat.client.user.oto.video.decline',
      properties: {
        service: service
      }
    });
    AppDispatcher.dispatch(`${service}.decline-audio-video-call`, data);
  }

};



/** WEBPACK FOOTER **
 ** ./src/js/app/actions/incoming_call_actions.js
 **/