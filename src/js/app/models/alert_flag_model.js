
/**
 * @class AlertFlagModel
 *
 * @property {number} id
 * @property {string} color
 * @property {string} title
 * @property {string} body
 * @property {string} image_url (optional)
 * @property {string} link_url
 * @property {string} link_text
 */

/**
 * Example:
 * {
 *     "id": 15,
 *     "color": "[blue|green|yellow|red]"
 *     "title": "Alert Flag Title",
 *     "body": "This is super important and needs your urgent attention",
 *     "image_url": "https://s3.amazonaws.com/some_image.png" (optional),
 *     "link_url": "https://hipchat.com/alert",
 *     "link_text": "Learn more"
 * }
 */

function normalizeAlertFlag (input) {
  const typesMap = {
    'blue': 'info',
    'green': 'success',
    'yellow': 'warning',
    'red': 'error'
  };

  return _.transform(input, (result, val, key) => {
    switch (key) {
      case 'id':
        result.id = !_.isNaN(val) ? parseInt(val, 10) : null;
        break;

      case 'color':
        result.type = typesMap[val] || 'info';
        break;

      case 'title':
      case 'body':
      case 'image_url':
      case 'link_url':
      case 'link_text':
        result[key] = String(val);
        break;
    }
  });
}


export default class AlertFlagModel {
  constructor(input = Object.create(null)) {
    Object.assign(this, normalizeAlertFlag(input));
  }
}



/** WEBPACK FOOTER **
 ** ./src/js/app/models/alert_flag_model.js
 **/