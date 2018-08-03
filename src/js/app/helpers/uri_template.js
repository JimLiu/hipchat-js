const URL_TEMPLATE_RE = new RegExp("{[^}]*}", "g");

function getReplacement(parameters, variable) {
  var value = _.get(parameters, variable, "");
  if (_.isObject(value)) {
    value = JSON.stringify(value);
  } else {
    value = String(value);
  }
  return value;
}

class URITemplate {

  constructor(template) {
    this.template = template;
  }

  getTemplateVariables() {
    let matches = this.template.match(URL_TEMPLATE_RE);
    return _.uniq(_.map(matches, match => match.slice(1, -1)));
  }

  replaceVariables(parameters) {
    let uri = this.template;
    let variables = this.getTemplateVariables();
    _.each(variables, variable => {
      uri = uri.replace(`{${variable}}`, encodeURIComponent(getReplacement(parameters, variable)));
    });
    return uri;
  }

  getTemplateValuesFromParameters(parameters) {
    let variables = this.getTemplateVariables();
    return _.reduce(variables, (accumulator, variable) => {
      accumulator[variable] = getReplacement(parameters, variable);
      return accumulator;
    }, {});
  }

}

export default URITemplate;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/uri_template.js
 **/