var strings = require('strings/empty_state_strings');

module.exports = React.createClass({

  displayName: "RightSideBarLinksEmptyState",

  render: function(){
    return (
      <div className="hc-tab-es">
        <div className="hc-tab-es-img links"></div>
        <div className="hc-tab-es-title">{strings.no_links}</div>
        <div className="hc-tab-es-msg">{strings.share_a_link}</div>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/links_empty_state.js
 **/