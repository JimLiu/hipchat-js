var AuiFieldSet = require("components/common/aui/form/aui_form_fieldset"),
    strings = require('strings/forms_strings'),
    AuiRadio = require("components/common/aui/form/aui_radio");

module.exports = React.createClass({

  displayName: "RoomPrivacyRadios",

  getDefaultProps: function() {
    return {
      public_desc: strings.description.public_room,
      private_desc: strings.description.private_room
    };
  },

  render: function() {
    return (
      <AuiFieldSet label="Access:">
        <AuiRadio id="public-room" key={_.uniqueId()} name="privacy" defaultChecked={this.props.defaultChecked === "public"} value="public" label={strings.label.public_room} description={this.props.public_desc} />
        <AuiRadio id="private-room" key={_.uniqueId()} name="privacy" defaultChecked={this.props.defaultChecked === "private"} value="private" label={strings.label.private_room} description={this.props.private_desc} />
      </AuiFieldSet>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/forms/room_privacy_radios.js
 **/