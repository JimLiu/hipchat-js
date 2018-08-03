import ChatWindowStore from 'stores/chat_window_store';
import ClipboardStrings from 'strings/clipboard_strings';
import moment from 'moment';

class ClipboardHelper {

  constructor() {
    this._initialize();
  }

  _initialize() {
    $(document).on('copy', this._doCopy.bind(this));
  }

  _doCopy(e) {
    var activeSelection = window.getSelection(),
        activeRanges = this._getSelectionRanges(activeSelection);

    if (!activeSelection.rangeCount) {
      return;
    }
    // Abort if the target of the copy is not inside the chat panel. Let the system handle it.
    if (!$(e.target).parents('.hc-chat-panel').length) {
      return;
    }

    var copyableElements = this._getCopyableElements(activeRanges);

    // Abort if there are less than 2 copyable elements
    if (copyableElements.length < 2) {
      return;
    }

    var content = this._getFormattedContent(copyableElements);

    var $textarea = $("<textarea>")
      .css({
        'width': '1px',
        'height': '1px',
        'padding': '0px'
      })
      .text(content);

    // this CSS makes it so you can't actually see the textarea when it pops in but
    // it is still "visible" enough to copy from for some browsers that require it
    var $clipboardContainer = $("<div id='clipboard-container'>")
      .css({
        'position': 'fixed',
        'left': '0px',
        'top': '0px',
        'width': '0px',
        'height': '0px',
        'z-index': '100',
        'display': 'block',
        'opacity': '0'
      })
      .append($textarea)
      .appendTo(document.body);

    $textarea.focus().select();
    try {
      // Firefox needs this method
      document.execCommand('copy');
    } catch(err) {
      // do nothing, the browser will pick it up.
    }

    _.defer(() => {
      // return the previous selection
      activeSelection.removeAllRanges();
      activeRanges.forEach((range) => activeSelection.addRange(range));

      $clipboardContainer.remove();
    });
  }

  _getCopyableElements(selectionRanges) {
    var copyableElements = [];

    copyableElements = _.map(selectionRanges, (range) => {
      // go through each range in selectionRanges array
      // get array of document fragments one for each range
      // get array of copyable DOM elements from each doc fragment
      // the '...' is a handy way to convert a nodeList to an array
      let docFragment = range.cloneContents();
      return [...docFragment.querySelectorAll('[data-copyable]')];
    });

    // combine all the DOM elements into a single array
    return _.flatten(copyableElements);
  }

  _getFormattedContent(copyableElements) {
    // get an array of formatted strings for each DOM element
    let formattedElements = _.reduce(copyableElements, (acc, element) => {
        let formattedElement = this._formatElement(element);
        // remove any empties
        if(!_.isEmpty(formattedElement)) {
          acc.push(formattedElement);
        }

        return acc;
    }, []);

    // combine into a string
    return _.join(formattedElements, '\n') || "";
  }

  _getSelectionRanges(selection) {
    // Firefox creats multiple ranges. We'll collect 'em all.
    // https://developer.mozilla.org/en-US/docs/Web/API/Selection#Multiple_ranges_in_a_selection
    var selectionRanges = [];
    for (var i = 0, len = selection.rangeCount; i < len; ++i) {
      selectionRanges.push(selection.getRangeAt(i));
    }
    return selectionRanges;
  }

  _formatElement(el) {
    var message = '',
        time = '',
        senderName = '',
        body = '',
        elementData = JSON.parse(el.dataset.copyable),
        formatStyle = elementData.format;

    // If we included a mid look up the message
    if (elementData.mid) {
      message = this._getMessageByMid(elementData.mid);
      time = moment(message.date).format("h:mm A");
      senderName = message.sender;
    }

    if (formatStyle === "plain-message") {

      body = this._formatBodyText(el);
      return `[${time}] ${senderName}: ${body}`;

    } else if (formatStyle === "notification") {

      body = this._formatBodyText(el);
      return `[${time}] ${senderName}: ${body}`;

    } else if (formatStyle === "info") {

      // this covers /topic, /me, etc.
      body = this._formatBodyText(el);
      body = body.split('\n'); // for multi-line messages
      body = _.transform(body, (result, element) => result.push(`    ${element}`), []);
      body = body.join('\n');
      return `${body}`;

    } else if (formatStyle === "quotation") {

      body = this._formatBodyText(el);
      body = body.split('\n'); // for multi-line messages
      body = _.transform(body, (result, element) => result.push(`    |  ${element}`), []);
      body = body.join('\n');
      return `[${time}] ${senderName}:\n${body}`;

    } else if (formatStyle === "code") {

      let multilineElement = $('li', el);

      if (multilineElement.length > 0) {
        body = [];
        $('li', el).each((i, subElement) => {
          body.push(`    ${subElement.lastElementChild.textContent}`);
        });
        body = body.join('\n');
      } else {
        body = this._formatBodyText(el);
        body = `    ${body}`;
      }

      return `[${time}] ${senderName}:\n${body}`;

    } else if (formatStyle === "file") {

      let fileName = message.file_data.file_name;
      let fileUrl = message.file_data.url;
      body = this._formatBodyText(message.rendered_body);
      return `[${time}] ${senderName}: ${body}\n    ${ClipboardStrings.file_uploaded}: ${fileName}\n    [${fileUrl}]` + ``;

    } else if (formatStyle === "date-divider") {

      body = this._formatBodyText(el);
      return `---- ${body} ----`;

    }

    return el.lastElementChild.textContent;
  }

  _getMessageByMid(mid) {
    let messages = ChatWindowStore.data.chats[ChatWindowStore.data.active_chat].messages;
    return _.find(messages, {'mid': mid});
  }

  _formatBodyText(el) {
    // We get the time stamp and name from ChatWindowStore but not the message body. We retrive the body of the message from
    // the document fragment because it will have exactly the text the user selected, even if they only selected part of line.
    var textString = "",
        nodes = $.parseHTML(el.innerHTML || el);

    if (nodes) {
      nodes.forEach((node) => {
        if (node.nodeName === "BR") {
          textString += "\n";
        } else if (node.nodeName === "IMG" && $(node).hasClass('remoticon')) {
          textString += node.alt;
        } else {
          textString += node.textContent;
        }
      });

      textString = textString.trim();
      textString = textString.replace(/\n\n/g, ''); // Some HTML messages have <br> tags that leave new lines at the end of messages. Clear those.
    }

    return textString;
  }
}

export default new ClipboardHelper();



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/clipboard_helper.js
 **/