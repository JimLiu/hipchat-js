var TextareaCaretMirror = require("./textarea_caret_mirror");
var MentionAutoCompleteRow = require("components/chat_input/mention_autocomplete_row");
var EmoticonAutoCompleteItem = require("components/chat_input/emoticon_autocomplete_item");
var SlashCommandAutoCompleteItem = require("components/chat_input/slash_command_autocomplete_item");
var emoticons = require('helpers/emoticons');
var cx = require('classnames');

module.exports = React.createClass({

  displayName: "AutoCompleteBox",

  getDefaultProps: function() {
    return {
      list: []
    };
  },

  _boxParams: {
    boxArrowType: "left",
    arrow_offsets: {
      left: 30,
      top: 10
    },
    offset_left: 30,
    offset_top: 10,
    offset_left_shift: 200//boxWidth - 30px - 30px
  },

  componentDidMount: function(){
    this._positionAutoComplete();
  },

  componentDidUpdate: function() {
    this._positionAutoComplete();
  },

  _positionAutoComplete: function () {
    if (!this.refs.caret) {
      return;
    }
    var arrowOffsets = this._boxParams.arrow_offsets;
    var $acBox = $(ReactDOM.findDOMNode(this.refs.acBox));
    var $caret = $(ReactDOM.findDOMNode(this.refs.caret)).find(".hc-textarea-caret");
    var $textarea = $(ReactDOM.findDOMNode(this.props.textarea_ref));
    var textareaWidth = $textarea.width();
    var caretLeftPosition = $caret.position().left;

    let css = {};
    let left;
    let top;
    const isRightBox = this._isRightBoxType(textareaWidth, caretLeftPosition);

    if ($caret.length){
      left = $caret.position().left - arrowOffsets.left;
      top = $caret.position().top - $textarea.scrollTop() - $(ReactDOM.findDOMNode(this.refs.container)).height() - arrowOffsets.top;

      if (isRightBox){
        this._boxParams.boxArrowType = 'right';
        left -= this._boxParams.offset_left_shift;
      } else {
        this._boxParams.boxArrowType = 'left';
      }
      css.left = left + 'px';
      css.top = top + 'px';
    } else {
      top = $textarea.scrollTop() - $(ReactDOM.findDOMNode(this.refs.container)).height() - arrowOffsets.top;
      css.top = top + 'px';
    }

    $acBox.css(css);
  },

  _isRightBoxType: function (textareaWidth, caretLeftPosition) {
    return textareaWidth / 2 < caretLeftPosition;
  },

  _getMentionAutoCompleteContent: function () {
    var results = this.props.list.map((user, idx) => {
      var isSelected = false,
          mention_match_markup = `@${user.mention_match_markup}`;
      if (idx === this.props.selected_item) {
        isSelected = true;
      }
      return <MentionAutoCompleteRow show={user.presence.show}
                                     hidden_presence={user.hidden_presence}
                                     photo_url={user.photo_url}
                                     name_match_markup={user.name_match_markup}
                                     mention_match_markup={mention_match_markup}
                                     selected={isSelected}
                                     should_animate_avatar={this.props.should_animate_avatar}
                                     key={idx}
                                     idx={idx}
                                     user_id={user.id}/>;
    });
    return results;
  },

  _getEmoticonAutoCompleteContent: function () {
    var results = this.props.list.map((emoticon, idx) => {
      var isSelected = false;
      if (idx === this.props.selected_item) {
        isSelected = true;
      }
      return <EmoticonAutoCompleteItem src={_.get(emoticons._getEmoticonInfo(emoticon.shortcut), 'src')}
                                        match_markup={emoticon.match_markup}
                                        shortcut={emoticon.shortcut}
                                        selected={isSelected}
                                        key={idx}
                                        idx={idx}/>;
    });
    return results;
  },

  _getSlashCommandAutoCompleteContent(){
    var results = this.props.list.map((command, idx) => {
      var isSelected = false;
      if (idx === this.props.selected_item) {
        isSelected = true;
      }
      return <SlashCommandAutoCompleteItem
                                       name={command.name}
                                       description={command.description}
                                       usage={command.usage}
                                       selected={isSelected}
                                       key={idx}
                                       idx={idx}/>;
    });
    return results;
  },

  _getAutoCompleteContent: function () {
    var content;
    if (this.props.type) {
      switch (this.props.type) {
        case "mention":
          content = this._getMentionAutoCompleteContent();
          break;
        case "emoticon":
          content = this._getEmoticonAutoCompleteContent();
          break;
        case "slash_command":
          content = this._getSlashCommandAutoCompleteContent();
          break;
      }
    }
    return content;
  },

  render: function() {
    var content = this._getAutoCompleteContent(),
      isRight = (this._boxParams.boxArrowType === 'right'),
      classes = cx({
        'aui-inline-dialog': true,
        'show': this.props.list.length > 0
      }),
      arrowClasses = cx(
        'aui-inline-dialog-arrow', 'arrow', 'aui-css-arrow', 'aui-bottom-arrow',
        {
          'right': isRight
        });

    return (
      <div>
        <div className={classes} ref="acBox">
          <div className="aui-inline-dialog-contents contents" ref="container">
            <ul>
            {content}
            </ul>
          </div>
          <div className={arrowClasses}></div>
        </div>
        <TextareaCaretMirror ref="caret" textarea_ref={this.props.textarea_ref} />
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/autocomplete/auto_complete_box.js
 **/