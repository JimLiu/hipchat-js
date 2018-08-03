import moment from 'moment';
import jid_utils from './jid_utils';
import file_types from './file_types';
import mime_types from './mime_types';

var file_utils = {

  file_types: file_types.init(),
  mime_types: mime_types.init(),

  is_gif: function (fileurl) {
    let ext = file_utils.get_extension(fileurl);
    return ext.toLowerCase() === 'gif';
  },

  get_file_name: function (filename) {
    return (_.isString(filename)) ? filename.split("/").pop() : "";
  },

  get_extension: function (filename) {
    var file = file_utils.get_file_name(filename),
        ext = file.split(".").pop();
    return (ext === file) ? "" : ext.toLowerCase();
  },

  get_extension_for_mime_type: function(mimeType) {
    if (file_utils.mime_types[mimeType]) {
      return file_utils.mime_types[mimeType];
    } else if (mimeType.split("/").pop().length === 3) {
      return mimeType.split("/").pop();
    }
  },

  get_file_type: function (filename, return_default) {
    var extension = file_utils.get_extension(filename),
        type;
    _.find(file_utils.file_types, function (extension_list, key) {
      if(_.includes(extension_list, extension)) {
        type = key;
      }
    });
    return return_default ? type || "text" : type;
  },

  get_size_string: function (size) {
    if (!size) {
      return '';
    }

    var precision = (size > 1024 ? 0 : 2),
        sizeString = Number(size / 1024).toFixed(precision),
        magnitude = 'K';

    if (size > 1048576) {
      precision = 1;
      sizeString = Number(size / 1048576).toFixed(precision);
      magnitude = 'MB';
    }

    return sizeString + magnitude;
  },

  get_selected_file_type: function(file) {
    var fileType = {
      major: "unknown",
      minor: "unknown"
    };
    if (file && file.type && file.type.indexOf("/") > -1) {
      var fileTypeSplit = file.type.toLowerCase().split("/");
      fileType.major = fileTypeSplit[0];
      fileType.minor = fileTypeSplit[1];
    }

    return fileType;
  },

  get_icon_class: function (filename) {
    var file_type = file_utils.get_file_type(filename);
    return (file_type) ? "icon-" + file_type : "icon-text";
  },

  clean_base64_type: function (base64_type) {
    var type;

    if (_.isString(base64_type)) {
      type = base64_type.replace("data:", "").replace(";base64", "");
    }
    return type;
  },

  get_base64_type: function (base64) {
    if (_.isString(base64)) {
      return file_utils.clean_base64_type(base64.split(",")[0]);
    }
  },

  get_base64_data: function (base64) {
    if (_.isString(base64)) {
      var base_data = base64.split(",");
      if (_.isArray(base_data) && base_data.length > 1) {
        return base_data[1];
      }
    }
  },

  base64_to_blob: function (base64, fileName = null) {
    var blob,
        content_type,
        base64_data,
        byteChars,
        sliceSize = 512,
        slice,
        byteNums,
        byteArray = [],
        fileType,
        byteCollection = [];

    if (_.isString(base64)) {
      base64_data = file_utils.get_base64_data(base64);
      content_type = file_utils.get_base64_type(base64);
      byteChars = atob(base64_data);

      for (var offset = 0; offset < byteChars.length; offset += sliceSize) {
        slice = byteChars.slice(offset, offset + sliceSize);
        byteNums = new Array(slice.length);

        for (var i = 0; i < slice.length; i++) {
          byteNums[i] = slice.charCodeAt(i);
        }

        byteArray = new Uint8Array(byteNums);
        byteCollection.push(byteArray);
      }

      if (content_type === 'application/octet-stream') {
        fileType = this.get_extension(fileName);

        if (fileType === 'mp4') {
          content_type = 'video/mp4';
        } else if (fileType === 'mov') {
          content_type = 'video/quicktime';
        }
      }

      blob = new Blob(byteCollection, {type: content_type});
    }
    return blob;
  },

  blob_to_file: function (blob, name, date = new Date()) {
    if (blob instanceof Blob) {
      blob.lastModifiedDate = date;
      blob.name = (name) ? name : "";
    }
    return blob;
  },

  create_file_object: function (jid, file, ts, sender_name) {
    var base_id = _.uniqueId();
    return _.assign(file, {
      id: file.id || base_id,
      group_id: jid_utils.group_id(jid),
      user_name: sender_name,
      date: moment.utc(ts * 1000).toDate(),
      icon_class: file_utils.get_icon_class(file.name)
    });
  }
};

export default file_utils;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/file_utils.js
 **/