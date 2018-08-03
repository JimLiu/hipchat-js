import appConfig from 'config/app_config';

export default {
  file_too_large: `This file is too large. Try a file that's ${appConfig.max_upload_size} MB or smaller.`,
  file_is_folder: `This looks like a folder; zip it up and try again.`,
  unable_to_upload: `Couldn't upload the file`,
  unable_to_upload_image: 'This image is too large',
  service_unavailable: `The service for uploading files is unavailable. Try again later.`
};


/** WEBPACK FOOTER **
 ** ./src/js/app/strings/file_input_errors.js
 **/