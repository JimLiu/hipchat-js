var TooltipActions = require('actions/tooltip_actions'),
    TooltipStrings = require('strings/tooltip_strings'),
    emoticons = require('helpers/emoticons');

module.exports = React.createClass({

  displayName: "TooltipTypeSmileySelector",

  getDefaultProps: function() {
    return {
      data: {
        smileys: {},
        user_is_admin: false
      }
    };
  },

  render: function () {
    var custom_link;
    if (this.props.data.user_is_admin) {
      custom_link = <div className="smiley-custom-link"><a target="_blank" href={`https://${this.props.data.web_server}/admin/emoticons`} onClick={this._onCustomClick}>{TooltipStrings.custom_emoticon_link}</a></div>;
    }

    return (
      <div className="smileys-selection">
        {_.map(this.props.data.smileys, (smiley) => {
          return <span key={smiley.shortcut} onClick={this._onSmileyClick} data-shortcut={smiley.shortcut} dangerouslySetInnerHTML={{__html: emoticons.render(smiley.shortcut === '>:-(' ? _.escape(smiley.shortcut) : smiley.shortcut)}} />;
        })}
        <div className="clear"></div>
        <div className={this.props.data.user_is_admin ? "more-emoticons-link-admin" : "more-emoticons-link"}>
          <a target="_blank" href={`https://${this.props.data.web_server}/emoticons`} onClick={this._onMoreClick}>{TooltipStrings.emoticon_more_link}</a>
        </div>
        {custom_link}
      </div>
    );
  },

  _onSmileyClick: function (e) {
    TooltipActions.smileyChosen({shortcut: e.currentTarget.getAttribute('data-shortcut')});
  },

  _onMoreClick: function () {
    TooltipActions.moreEmoticonsChosen();
  },

  _onCustomClick: function () {
    TooltipActions.customEmoticonsChosen();
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/tooltip/tooltip_types/smiley_selector.js
 **/