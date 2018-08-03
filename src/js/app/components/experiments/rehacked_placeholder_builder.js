module.exports = function (node, props, lifecycle) {
  var lifecycleAwareMethods = [
    'componentWillMount',
    'componentDidMount',
    'componentWillReceiveProps',
    'componentWillUpdate',
    'componentDidUpdate',
    'componentWillUnmount'
  ];

  var base = {
    displayName: "RehackedPlaceholder",

    render: function () {
      return React.createElement(node, props);
    }
  };

  var proxyLifecycleMethods = function (data) {
    var lifecycleMethods = lifecycleAwareMethods.map((method) => {
      return function (/* arguments */) {
        var requested = lifecycle[method];
        if (requested) {
          requested.apply(this, arguments);
        }
      };
    });
    return _.extend(_.fromPairs(lifecycleAwareMethods, lifecycleMethods), data);
  };

  return React.createClass(proxyLifecycleMethods(base));
};


/** WEBPACK FOOTER **
 ** ./src/js/app/components/experiments/rehacked_placeholder_builder.js
 **/