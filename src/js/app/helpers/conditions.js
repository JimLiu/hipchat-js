/*global no_match*/
import logger from 'helpers/logger';
import utils from 'helpers/utils';
import link_utils from 'helpers/link_utils';
import traverse from 'traverse';

const Context = {

  check: (context, ctx) => {
    var subContext = context[ctx];
    if (!subContext) {
      logger.error(`Context {ctx} is not set`);
      subContext = {};
    }
    return subContext;
  },

  ROOM: 'room',
  USER: 'user',
  MESSAGE: 'message',
  GLANCE_DATA: 'glanceData'
};

class MetaDataMatcher {

  constructor(metadata) {
    this.metadata = metadata;
  }

  /**
   * Matches metadata of cards and glances
   * @param metadataConditions the conditions declared on the ui extension. Example:
   *  [
   *    { 'attr': 'domain', 'eq': 'jira.atlassian.com'},
   *    { 'attr': 'nested.something', 'gt': 2}
   *  ]
   * @returns {boolean} true if matched, false otherwise
   */
  match(metadataConditions) {
    return _.every(metadataConditions, (cond) => {
      if (!cond.attr) {
        logger.error('Metadata conditions must specify an "attr" attribute');
        return false;
      }

      let value = _.get(this.metadata, cond.attr);
      if (typeof cond.eq !== 'undefined') {
        return value === cond.eq;
      }
      else if (typeof cond.lt !== 'undefined') {
        return _.lt(value, cond.lt);
      }
      else if (typeof cond.gt !== 'undefined') {
        return _.gt(value, cond.gt);
      }

      logger.error(`Unknown metadata operator in condition: ${cond}`);
      return false;
    });
  }
}

const Evaluators = {

  /**
   * Check if the room in the context is a public room
   * @param context the condition context, containing 'room'
   * @returns {boolean}
   */
  'room_is_public': (context) => {
    var privacy = Context.check(context, Context.ROOM).privacy;
    return utils.jid.is_public_room(privacy);
  },

  /**
   * Check if the user in the context is an administrator
   * @param context the condition context, containing 'user'
   * @returns {boolean}
   */
  'user_is_admin': (context) => {
    return Context.check(context, Context.USER).is_admin;
  },

  /**
   * Check if the user in the context is a guest user
   * @param context the condition context, containing 'user'
   * @returns {boolean}
   */
  'user_is_guest': (context) => {
    return Context.check(context, Context.USER).is_guest;
  },

  /**
   * Check if the user in the context is the owner of the the room in the context
   * @param context the condition context, containing 'user' and 'room'
   * @returns {boolean}
   */
  'user_is_room_owner': (context) => {
    var room = Context.check(context, Context.ROOM);
    var user = Context.check(context, Context.USER);

    return room.owner === user.id;
  },

  /**
   * Check if the message in the context matches a certain sub-condition.
   * @param context the condition context, containing 'message'
   * @param params: Currently supported params:
   *
   * Matches the message type:
   * params: {
   *   "type": "notification"
   * }
   *
   * Matches the message body (regular expression):
   * params: {
   *   "regex": {
   *     "pattern": "<pattern>",
   *     "flags": "i"
   *   }
   * }
   *
   * Matches the message sender:
   * params: {
   *   "sender": "Giphy"
   * }
   *
   * @returns {boolean}
   */
  'message_matches': (context, params) => {

    var message = Context.check(context, Context.MESSAGE);

    function matchType() {
      var type = _.get(params, 'type');
      if (type) {
        return message.type === type;
      }
      return true;
    }

    function matchFileType() {
      var type = _.get(params, 'file_type');
      if (type) {
        return _.get(message, 'file_data.file_type') === type.replace('image','img');
      }
      return true;
    }

    function matchRegExp() {
      var regex = _.get(params, 'regex');
      if (regex) {
        if (regex.pattern) {
          try {
            let regularExpression = new RegExp(regex.pattern, regex.flags);
            return regularExpression.test(message.body);
          } catch (e) {
            logger.error(e);
            return false;
          }
        } else {
          logger.error('Regular Expression condition must specify a "pattern" attribute');
          return false;
        }
      }
      return true;
    }

    function matchSender() {
      var sender = _.get(params, 'sender');
      if (sender) {
        return message.sender === sender;
      }
      return true;
    }

    return matchType() && matchFileType() && matchRegExp() && matchSender();
  },

  /**
   * Check if the message in the context contains a link
   * @param context the condition context, containing 'message'
   * @returns {boolean}
   */
  'message_contains_link': (context) => {
    var message = Context.check(context, Context.MESSAGE);
    return link_utils.contains_url(message.body);
  },

  /**
   * Check if the message in the context was sent by the user in the context
   * @param context the condition context, containing 'message' and 'user'
   * @returns {boolean}
   */
  'message_sent_by_current_user': (context) => {
    var message = Context.check(context, Context.MESSAGE);
    var user = Context.check(context, Context.USER);
    return message.sender_id === user.id;
  },

  /**
   * Check if the message in the context is a card and matches certain sub-conditions.
   * @param context the condition context, containing 'message'
   * @param params: Currently supported params:
   *
   * Matches the card style:
   * params: {
   *   "style": "application"
   * }
   *
   * Matches metadata (see MetaDataMatcher above)
   * params: {
   *   "metadata": [
   *     { 'attr': 'canBeClosed', 'eq': true}
   *   ]
   * }
   *
   * @returns {boolean}
   */
  'card_matches': (context, params) => {

    var message = Context.check(context, Context.MESSAGE);

    function matchStyle() {
      var style = _.get(params, 'style');
      if (style) {
        return message.card && message.card.style === style;
      }
      return true;
    }

    function matchMetadata() {
      var metadataConditions = _.get(params, 'metadata');
      if (_.isArray(metadataConditions)) {
        if (message.metadata) {
          let matcher = new MetaDataMatcher(message.metadata);
          return matcher.match(metadataConditions);
        }
        return false;
      }
      return true;
    }

    return matchStyle() && matchMetadata();
  },

  /**
   * Check if the glance data in the context matches sub-conditions
   * @param context the condition context, containing 'glanceData'
   * @param params: Currently supported params:
   *
   * Matches metadata (see MetaDataMatcher above)
   * params: {
   *   "metadata": [
   *     { 'attr': 'isConfigured', 'eq': true}
   *   ]
   * }
   *
   * @returns {boolean}
   */
  'glance_matches': (context, params) => {


    var glanceData = Context.check(context, Context.GLANCE_DATA);

    function matchMetadata() {
      var metadataConditions = _.get(params, 'metadata');
      if (_.isArray(metadataConditions)) {
        if (glanceData.metadata) {
          let matcher = new MetaDataMatcher(glanceData.metadata);
          return matcher.match(metadataConditions);
        }
        return false;
      }
      return true;
    }

    return matchMetadata();
  }
};

class ConditionContext {

  static no_match() {
    return false;
  }

  static getEvaluator(condition) {
    var evaluator = Evaluators[condition];
    if (!evaluator) {
      logger.warn(`Unknown condition type: ${condition}`);
      evaluator = ConditionContext.no_match;
    }
    return evaluator;
  }

  constructor() {
    this.context = {};
  }

  withRoom(room) {
    this.context[Context.ROOM] = room;
    return this;
  }

  withUser(user) {
    this.context[Context.USER] = user;
    return this;
  }

  withMessage(message) {
    this.context[Context.MESSAGE] = message;
    return this;
  }

  withGlanceData(glanceData) {
    this.context[Context.GLANCE_DATA] = glanceData;
    return this;
  }

  /**
   * Evaluates conditions based on the context passed in on construction.
   *
   * @param conditions
   *
   * "conditions": [
   *   {
   *     "condition": "user_is_guest"
   *   },
   *   {
   *     "condition": "feature_is_enabled",
   *     "params": {
   *       "feature": "web_client_video_chat"
   *     }
   *   }
   * ]
   *
   * See also: https://extranet.atlassian.com/display/HC/Spec%3A+Capabilities+document+changes+for+pluggable+clients
   */
  evaluate(conditions) {
    try {
      return _.isEmpty(conditions) || this._and(conditions);
    } catch (e) {
      logger.error(e);
      return false;
    }
  }

  canEvaluate(condition) {
    let hasDynamicConditions = traverse(condition).reduce( (acc, obj ) => {
      let result;
      if (obj['condition'] === 'glance_matches') {
        result = true;
      } else {
        result = acc;
      }
      return result;
    }, false);

    return !hasDynamicConditions || !_.isEmpty(this.context[Context.GLANCE_DATA]);
  }


  _evaluateCondition(condition) {
    var conditionType = condition['condition'];

    if (!conditionType) {
      var compositeConditions = condition['conditions'] || [];
      var compositeType = (condition['type'] || 'and').toLowerCase();
      switch (compositeType) {
        case 'and':
          return this._and(compositeConditions);
        case 'or':
          return this._or(compositeConditions);
        default:
          logger.error(`Illegal operator: ${compositeType}`);
          return no_match();
      }
    }

    var evaluator = ConditionContext.getEvaluator(conditionType);
    var result = evaluator(this.context, condition['params'] || {});
    return condition.invert === true ? !result : result;
  }

  _and(conditions) {
    return _.every(conditions, (condition) => {
      return this._evaluateCondition(condition);
    });
  }

  _or(conditions) {
    return _.some(conditions, (condition) => {
      return this._evaluateCondition(condition);
    });
  }
}

module.exports = ConditionContext;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/conditions.js
 **/