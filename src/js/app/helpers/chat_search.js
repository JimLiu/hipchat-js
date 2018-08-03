import utils from 'helpers/utils';

function getContainsMultipartQueryRegExp(query) {
  var split_query = query.replace(/\s/g, '|');
  return new RegExp(`${split_query}`, 'gi');
}

function getStartsWithRegExp(query) {
  return new RegExp(`^${query}`, 'i');
}

function getOtherWordsStartWithRegExp(query) {
  return new RegExp(`\\s${query}`, 'i');
}

function getAnyWordStartsWithRegExp(query) {
  return new RegExp(`^${query}|\\s${query}`, 'i');
}

function getMentionStartsWithRegExp(query) {
  if (query.indexOf('@') === 0){
    query = query.slice(1);
  }
  return new RegExp(`^${query}`, 'i');
}

function getMentionContainsRegExp(query) {
  if (query.indexOf('@') === 0){
    query = query.slice(1);
  }
  return new RegExp(`${query}`, 'i');
}

function getContainsRegExp(query) {
  return new RegExp(`${query}`, 'i');
}

function lowerCaseMentionHelper(item) {
  return _.isString(item.mention_name) ? item.mention_name.toLocaleLowerCase() : null;
}

function isValidChat(item) {
  // If a room or person, has a valid name, and if-is-a-person-then-has-a-mention-name
  return (utils.jid.is_private_chat(item.jid) || utils.jid.is_room(item.jid))
    && _.isString(item.name)
    && (utils.jid.is_private_chat(item.jid) === _.isString(item.mention_name));
}

function containsAllMatches(name, queries) {
  return queries.split(' ').every(query => {
    var query_re = getContainsRegExp(query);
    return query_re.test(name);
  });
}

function getMatches(chats, query) {
  var number_of_query_parts = query ? _.size(query.match(/\s/g)) + 1 : 0,
      multipart_query = number_of_query_parts > 1,
      any_word_starts_with = getAnyWordStartsWithRegExp(query),
      contains = getContainsRegExp(query),
      global_contains = getContainsMultipartQueryRegExp(query),
      mention_starts_with = getMentionStartsWithRegExp(query),
      mention_contains = getMentionContainsRegExp(query);

  return _.reduce(chats, function (matches, chat_item) {
    if (!isValidChat(chat_item)) {
      // Continues to next item
      return matches;
    }

    let default_name_match_markup = _.escape(chat_item.name),
        default_mention_match_markup = _.escape(chat_item.mention_name);

    if (!query) {
      // If no query, we want to update each item's markup to its default (the actual name/mention_name)
      //  and send all chats along to sort
      if (chat_item.mention_name) {
        chat_item.mention_match_markup = default_mention_match_markup;
      }
      chat_item.name_match_markup = default_name_match_markup;
      matches.push(chat_item);
      return matches;
    }
    let name_match,
        mention_match,
        name_match_origin,
        mention_match_origin;

    if (chat_item.mention_name) {
        chat_item.mention_name = chat_item.mention_name;
      }

    if (multipart_query) {
      // If multipart query, chats must matches all parts of query
      let all_matches = chat_item.name.match(global_contains);

      if (all_matches && all_matches.length >= number_of_query_parts) {
        // No need to check further if chat doesn't have at least as many matches as parts of query

        // Check if name contains every part of query, even if queries are equal or have some equal part
        if (containsAllMatches(chat_item.name, query)) {
          name_match = all_matches;
        }

      }
    } else if (query.length === 1) {
      // If query is only one letter, only match on word starts with for name and mention
      name_match = chat_item.name.match(any_word_starts_with);

      if (chat_item.mention_name) {
        mention_match = chat_item.mention_name.match(mention_starts_with);
      }
    } else {
      // If single-part query longer than one letter, match on word starts with or contains
      name_match = chat_item.name.match(any_word_starts_with) || chat_item.name.match(contains);

      // "starts_with" matches take priority in match markup

      if (chat_item.mention_name) {
        mention_match = chat_item.mention_name.match(mention_contains);
      }
    }

    if (name_match) {
      name_match_origin = name_match.map(item => {
        var idx = chat_item.name.indexOf(item);
        return chat_item.name.slice(idx, idx + item.length);
      });
    }
    if (mention_match) {
      mention_match_origin = mention_match.map(item => {
        var idx = chat_item.mention_name.indexOf(item);
        return chat_item.mention_name.slice(idx, idx + item.length);
      });
    }
    // We want all chats regardless of match to get updated markup
    chat_item.name_match_markup = name_match ? utils.highlight_matches(chat_item.name, name_match_origin) : default_name_match_markup;
    chat_item.mention_match_markup = mention_match ? utils.highlight_matches(chat_item.mention_name, mention_match_origin) : default_mention_match_markup;

    if (name_match || mention_match) {
      matches.push(chat_item);
    }

    return matches;
  }, []);
}

function priorityCompare(lhs, rhs, priorities) {
  var rhs_is_priority = _.includes(priorities, rhs.jid);

  if (_.includes(priorities, lhs.jid) === rhs_is_priority) {
    // If both active or both not active
    return 0;
  }
  return rhs_is_priority ? 1 : -1;
}

function nameCompare(lhs, rhs, query) {
  var lhs_name = lhs.name.toLocaleLowerCase(),
      rhs_name = rhs.name.toLocaleLowerCase(),
      lhs_mention = lowerCaseMentionHelper(lhs),
      rhs_mention = lowerCaseMentionHelper(rhs),

      starts_with = getStartsWithRegExp(query),
      other_word_starts_with = getOtherWordsStartWithRegExp(query),
      mention_starts_with = getMentionStartsWithRegExp(query),

      lhs_full_name_equals = query === lhs_name,
      rhs_full_name_equals = query === rhs_name,
      lhs_first_word_starts_with = starts_with.test(lhs_name),
      rhs_first_word_starts_with = starts_with.test(rhs_name),
      lhs_other_word_starts_with = other_word_starts_with.test(lhs_name),
      rhs_other_word_starts_with = other_word_starts_with.test(rhs_name),

      equal_comparsion_query = (query.indexOf('@') === 0) ? query.slice(1) : query,
      lhs_mention_equals = equal_comparsion_query === lhs_mention,
      rhs_mention_equals = equal_comparsion_query === rhs_mention,
      lhs_mention_starts_with = lhs_mention ? mention_starts_with.test(lhs_mention) : false,
      rhs_mention_starts_with = rhs_mention ? mention_starts_with.test(rhs_mention) : false;

  if (lhs_full_name_equals === rhs_full_name_equals) {
    // If both first words equal to query or both do not

    if (lhs_mention_equals === rhs_mention_equals) {
        // If both mentions equal to with query or both do not

        if (lhs_first_word_starts_with === rhs_first_word_starts_with) {
          // If both first words start with query or both do not

          if (lhs_other_word_starts_with === rhs_other_word_starts_with) {

            if (lhs_mention && rhs_mention) {

                if (lhs_mention_starts_with === rhs_mention_starts_with) {
                  // If both mentions start with query or both do not
                  return 0;
                }
                // If only one mention starts with query
                return rhs_mention_starts_with ? 1 : -1;
              }
            // If both have other words that start with the query or both do not
            return 0;
          }
          // If only one item's other name starts with query
          return rhs_other_word_starts_with ? 1 : -1;
        }
        // If only one item's name starts with query
        // First word prioritized over others
        return rhs_first_word_starts_with ? 1 : -1;
    }

    return rhs_mention_equals ? 1 : -1;
  }

  return rhs_full_name_equals ? 1 : -1;
}

function alphaCompare(lhs, rhs) {
  var lhs_name = lhs.name.toLocaleLowerCase(),
      rhs_name = rhs.name.toLocaleLowerCase();

  return lhs_name.localeCompare(rhs_name);
}

function sortMatches(matches, priorities, query) {
  // All chats are separated into two groups: priorities and non-priority.
  // Within these groups, names and mention names are compared for "starts with,"
  //  "other words start with," and "contains" matches.
  // If two chats match the query equally, they are then sorted alphabetically by name.

  function comparator(lhs, rhs) {
    if (!query) {
      // If no query, no need to sort based on name matches
      return alphaCompare(lhs, rhs);
    }

    let comparison = priorities.length ? priorityCompare(lhs, rhs, priorities) : 0;

    if (comparison === 0) {
      comparison = nameCompare(lhs, rhs, query);
    }

    if (comparison === 0) {
      comparison = alphaCompare(lhs, rhs);
    }

    return comparison;
  }

  // This is where we finally kick off the sort
  return matches.sort(comparator);
}


/**
 * Filters and sorts chats using search string
 * @param {array|object} all_chats - List of chats (rooms and users)
 * @param {string} query - User input
 * @param {array|object} priorities - List of chats (rooms and users) to prioritize
 * @returns {array} Filtered and sorted list of chats
 */
export function chatSearch(all_chats = [], query = '', priorities = []) {
  if (_.isEmpty(all_chats)) {
    return [];
  }

  query = utils.escapeRegEx(query.trim().toLocaleLowerCase()).replace(/\s+/g, ' ');

  try {
    /*eslint-disable */
    var regex_test = new RegExp(query);
    /*eslint-enable */
  }
  catch (e) {
    return [];
  }

  // Filter and return sorted list of chats
  let matches = getMatches(all_chats, query);
  return sortMatches(matches, priorities, query);
}



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/chat_search.js
 **/