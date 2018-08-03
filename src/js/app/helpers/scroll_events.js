module.exports = function() {
  var dispatch = $.event.dispatch || $.event.handle;


  var special = $.event.special,
      uid1 = 'D' + (+new Date()),
      uid2 = 'D' + (+new Date() + 1);

  special.scrollstart = {

    setup: function (data) {

      var _data = $.extend({
        latency: special.scrollstop.latency
      }, data);

      let handler = function (evt, ...args) {
        var _self = this;
        evt.type = 'scrollstart';
        dispatch.apply(_self, [evt, ...args]);
      }.bind(this);

      let debouncedHandler = _.debounce(handler, _data.latency, {leading: true, trailing: false});

      $(this).on('scroll', (evt) => {
        if (!$(this).data('skipScrollStartEvent')){
          debouncedHandler(evt);
        } else {
          $(this).data('skipScrollStartEvent', false);
        }
      }).data(uid1, debouncedHandler);
    },

    teardown: function () {
      $(this).data(uid1).cancel();
      $(this).off('scroll', $(this).data(uid1));
      $(this).removeData(uid1);
    }
  };

  special.scrollstop = {

    latency: 250,

    setup: function (data) {

      var _data = $.extend({
        latency: special.scrollstop.latency
      }, data);

      var handler = _.debounce(function (evt) {
        var _self = this,
            _args = arguments;
        evt.type = 'scrollstop';
        dispatch.apply(_self, _args);
        $(this).data('skipScrollStartEvent', false);
      }.bind(this), _data.latency, {leading: false, trailing: true});

      $(this).on('scroll', handler).data(uid2, handler);
    },

    teardown: function () {
      $(this).data(uid2).cancel();
      $(this).off('scroll', $(this).data(uid2));
      $(this).removeData(uid2);
    }
  };
};


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/scroll_events.js
 **/