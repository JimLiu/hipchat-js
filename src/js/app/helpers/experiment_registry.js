var Rehacked = require('rehacked')(require('react/addons'));
var rehackedPlaceholderBuilder = require('components/experiments/rehacked_placeholder_builder');

var _before = Rehacked.before;
var _after = Rehacked.after;
var _on = Rehacked.on;

function createPlaceholder(opts) {
  var node = opts.node || 'div';
  return rehackedPlaceholderBuilder(node, opts.props, opts.lifecycle);
}

Rehacked.on = function (componentName, selector, element /*, arguments */) {
  if (_.isPlainObject(element)) {
    Array.prototype.splice.call(arguments, 2, 1, createPlaceholder(element));
  }
  return _on.apply(Rehacked, arguments);
};

Rehacked.before = function (componentName, selector, element /*, arguments */) {
  if (_.isPlainObject(element)) {
    Array.prototype.splice.call(arguments, 2, 1, createPlaceholder(element));
  }
  return _before.apply(Rehacked, arguments);
};

Rehacked.after = function (componentName, selector, element /*, arguments */) {
  if (_.isPlainObject(element)) {
    Array.prototype.splice.call(arguments, 2, 1, createPlaceholder(element));
  }
  return _after.apply(Rehacked, arguments);
};

module.exports = Rehacked;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/experiment_registry.js
 **/