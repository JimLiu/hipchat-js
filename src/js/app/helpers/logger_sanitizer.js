import { HC_FILES, HC_AUTHENTICATED_FILE } from 'core/xmpp/lib/namespaces';

const SANITIZE_TOKEN_KEYS = [
  "token",
  "auth_nonce",
  "oauth_token",
  "oauth2_token",
  "access_token",
  "apiv1_token",
  "nonce"
];
const SANITIZE_MESSAGE_KEYS = [
  "message",
  "text"
];
const REMOVE_TEXT_NODE_TAGS = [
  'body',
  'desc'
];
const REDACT_TEXT_NODE_TAGS = [
  'name',
  'thumb',
  'thumbnail',
  'thumb_url',
  'file_url'
];
const FUNC_STRING = "[function call]";

function cleanTag(tag) {
  tag.textContent = 'REDACTED';
}
function redactTag(tag) {
  let textContent = tag.textContent;

  tag.textContent = textContent.replace(/([\s\S]+\/)[\S]+(\.[\w]+)$/, "$1REDACTED$2");
}
function cleanTags(tags) {
  let tagName;

  Array.from(tags).forEach((tag) => {
    tagName = tag.nodeName;
    if (REMOVE_TEXT_NODE_TAGS.indexOf(tagName) >= 0){
      cleanTag(tag);
    } else if (REDACT_TEXT_NODE_TAGS.indexOf(tagName) >= 0){
      redactTag(tag);
    }
  });
}

export default {
  sanitize(val) {
    if (_.isFunction(val)) {
      return this.sanitizeFunc(val);
    }
    let returnVal = _.cloneDeep(val);
    if (_.isObject(returnVal)) {
      return this.iterateObj(returnVal);
    }
    return returnVal;
  },

  sanitizeXML(el) {
    let localName = _.get(el, "localName");

    if (!_.isString(localName)) {
      return el;
    }
    switch (localName.toLowerCase()) {
      case "auth":
        return this.cleanStanza(el);
      case "success":
        return this.cleanStanza(el);
      case "message":
        return this.cleanMessageStanza(el);
      case "iq":
        return this.cleanIqStanza(el);
    }

    return el;
  },

  cleanStanza(node) {
    let cloneNode = this.cloneXMLNode(node);

    if (!cloneNode) {
      return node;
    }

    cloneNode = this.cleanNodeContent(cloneNode);
    cloneNode = this.cleanNodeAttrs(cloneNode);

    return cloneNode;
  },

  cleanMessageStanza(node) {
    let cloneNode = this.cloneXMLNode(node);
    let allNodes;

    if (!cloneNode) {
      return node;
    }
    allNodes = cloneNode.getElementsByTagName('*');
    if (allNodes.length) {
      cleanTags(allNodes);
    }

    return cloneNode;
  },

  cleanIqStanza(node) {
    let cloneNode = this.cloneXMLNode(node);
    let query = cloneNode.getElementsByTagName('query');
    let attribute;

    if (query.length) {
      attribute = query[0].getAttribute('xmlns');
      if (attribute === HC_FILES || attribute === HC_AUTHENTICATED_FILE){
        this.cleanFilesStanza(cloneNode);
      }
    }

    return cloneNode;
  },

  cleanFilesStanza(node) {
    let allNodes = node.getElementsByTagName('*');

    if (allNodes.length) {
      cleanTags(allNodes);
    }
  },

  cloneXMLNode(node) {
    return node.cloneNode(true);
  },

  cleanNodeContent(node) {
    node.textContent = this.cleanToken(node.textContent);
    return node;
  },

  cleanNodeAttrs(node, attrKeys = SANITIZE_TOKEN_KEYS) {
    _.each(attrKeys, (attr) => {
      let val = node.getAttribute(attr);
      if (node && val) {
        node.setAttribute(attr, this.cleanToken(val));
      }
    });
    return node;
  },

  cleanToken(val) {
    let string = val.toString();
    return `${string.slice(0, 8)}...`;
  },

  cleanMessage(val) {
    return 'REDACTED';
  },

  iterateObj(val) {
    for (let prop in val) {
      if (val.hasOwnProperty(prop)) {
        let curVal = val[prop];
        if (_.isObject(curVal) && !_.isFunction(curVal)) {
          this.iterateObj(curVal);
        } else {
          val[prop] = this.sanitizeVal(prop, curVal);
        }
      }
    }
    return val;
  },

  sanitizeVal(key, val) {
    if (!val) {
      return val;
    }

    if (_.isFunction(val)) {
      return this.sanitizeFunc(val);
    }
    if (SANITIZE_TOKEN_KEYS.indexOf(key) !== -1) {
      return this.cleanToken(val);
    }
    if (SANITIZE_MESSAGE_KEYS.indexOf(key) !== -1) {
      return this.cleanMessage(val);
    }
    return val;
  },

  sanitizeFunc(val) {
    return FUNC_STRING;
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/logger_sanitizer.js
 **/