import IntegrationsActions from 'actions/integrations_actions';
import HCAPI from 'api/api';

export function focus() {
  IntegrationsActions.focusChatText();
}

export function appendMessage(text_value) {
  let text = (typeof text_value === 'string') ? text_value : '';

  HCAPI.appendMessage({
    text: text
  });
}

export function addFileForUploadWithBase64(url, name) {
  HCAPI.addFileForUploadWithBase64(url, name, 'paste');
}


/** WEBPACK FOOTER **
 ** ./src/js/app/api/modules/chat_module.js
 **/