/*global Modernizr*/
export default {

  ieSubmit: (e) => {

    if (!Modernizr.formattribute) {

      e.preventDefault();

      var form = document.getElementById(e.target.getAttribute('form'));

      if (form){
        var button = form.ownerDocument.createElement('input');
        button.style.display = 'none';
        button.type = 'submit';
        form.appendChild(button).click();
        form.removeChild(button);
      }
    }
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/components/mixins/ie_submit_mixin.js
 **/