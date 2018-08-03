import strings from 'strings/chat_header_strings';
import ChatHeaderActions from 'actions/chat_header_actions';
import VideoButtons from './video_buttons';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: "OTOHeaderButtons",

  mixins: [PureRenderMixin],

  _selectPanel: function(type) {
    this._clearButtonFocus();
    ChatHeaderActions.handlePanelSelect({
      type: type,
      room: this.props.jid
    });
  },

  _clearButtonFocus: function () {
    var buttons = ReactDOM.findDOMNode(this).querySelectorAll(".aui-button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].blur();
    }
  },

  _getVideoButton: function () {
    return (
      <VideoButtons
        jid={this.props.jid}
        name={this.props.name}
        read_only_mode={this.props.read_only_mode}
        web_client_enso_video_enabled={this.props.web_client_enso_video_enabled}
        web_client_addlive_video_enabled={this.props.web_client_addlive_video_enabled} />
    );
  },

  _getButtonTitle: function(ref, tooltip) {
    if(this.props.show_sidebar && this.props.active_panel === ref) {
      return strings[`hide_${tooltip}`];
    }

    return strings[`show_${tooltip}`];
  },

  _renderButton: function(tooltip, ref, icons) {
    var active = (this.props.active_panel === ref && this.props.show_sidebar) ? 'active' : '',
        title = this._getButtonTitle(ref, tooltip);
    return (
      <button
        ref={`${ref}_btn`}
        className={`hc-${ref}-btn-link aui-button aui-button-light ${active}`}
        onClick={this._selectPanel.bind(null, ref)}
        aria-label={title}>
          <span className={"aui-icon " + icons}>{strings[ref]}</span>
      </button>
    );
  },

  render: function () {
    var videoButton = this.props.video_enabled ? this._getVideoButton() : null,
        filesButton = !this.props.web_client_integrations_enabled ? this._renderButton("files", "files", "hipchat-icon-small icon-file") : null,
        linksButton = !this.props.web_client_integrations_enabled ? this._renderButton("links", "links", "hipchat-icon-small icon-link") : null,
        sidePanelButton = this.props.web_client_integrations_enabled ? this._renderButton("sidebar", "integrations", "hipchat-icon-small icon-integrations") : null;

    return (
      <div className="aui-page-header-actions hc-chat-header-actions" ref="actions">
        {videoButton}
        <div className="aui-buttons">
          {filesButton}
          {linksButton}
          {sidePanelButton}
        </div>
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/oto_header_buttons.js
 **/