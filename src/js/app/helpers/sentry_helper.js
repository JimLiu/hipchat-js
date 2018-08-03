/* Helper used to sanitize Sentry error objects on native */
module.exports = {

  constants: {
    fileKey: "file://",
    splitKey: "/",
    fallback: "Unknown"
  },

  containsKey(string, key) {
    if (!_.isString(string) || !_.isString(key)) {
      return false;
    }
    return string.indexOf(key) !== -1;
  },

  returnLastItem(splitArray, fallback) {
    if (!_.isArray(splitArray) || _.isArray(splitArray) && !splitArray.length) {
      return fallback;
    }
    return splitArray[splitArray.length - 1];
  },

  sanitizePath(string) {
    let splitString,
        key = this.constants.splitKey,
        fallback = this.constants.fallback,
        response;

    if (string && this.containsKey(string, key)) {
      splitString = string.split(key);
      response = this.returnLastItem(splitString, fallback);
    } else {
      response = fallback;
    }
    return response;
  },

  sanitizeStackTrace(data, frames) {
    let key = this.constants.splitKey,
        fileKey = this.constants.fileKey,
        fallback = this.constants.fallback;

    for (var i = 0; i < frames.length; i++) {
      let filename = (frames[i] && frames[i].filename) ? frames[i].filename : false;
      if (filename && this.containsKey(filename, fileKey)) {
        let filenameSplit = filename.split(key);
        data.stacktrace.frames[i].filename = this.returnLastItem(filenameSplit, fallback);
      }
    }
  },

  sanitize(data) {
    if (_.isObject(data)) {
      if (data.culprit) {
        data.culprit = this.sanitizePath(data.culprit);
      }

      if (_.has(data, "request.url")) {
        data.request.url = this.sanitizePath(data.request.url);
      }

      if (_.has(data, "request.headers.Referer")) {
        data.request.headers.Referer = this.sanitizePath(data.request.headers.Referer);
      }

      if (_.has(data, "stacktrace.frames")) {
        this.sanitizeStackTrace(data, data.stacktrace.frames);
      }
    }
    return data;
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/sentry_helper.js
 **/