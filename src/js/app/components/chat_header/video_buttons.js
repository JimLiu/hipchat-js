import strings from 'strings/chat_header_strings';
import ChatHeaderActions from 'actions/chat_header_actions';
import cx from 'classnames';
import AUIDropdown from 'components/common/aui/dropdown2/aui_dropdown2';
import AUIDropdownTrigger from 'components/common/aui/dropdown2/aui_dropdown2_trigger';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import VideoServiceKeys from 'keys/video_service_keys';
export default React.createClass({

  displayName: "OTOHeaderVideoButtons",

  mixins: [PureRenderMixin],

  _startAddliveVideoCall: function () {
    ChatHeaderActions.startCall({
      jid: this.props.jid,
      name: this.props.name,
      service: 'addlive',
      audio_only: false
    });
  },

  _startEnsoVideoCall: function () {
    ChatHeaderActions.startCall({
      jid: this.props.jid,
      name: this.props.name,
      service: 'enso',
      audio_only: false
    });
  },

  _getVideoSelectButton: function () {
    return (
      <AUIDropdownTrigger className="hc-video-call-btn-link aui-button aui-button-light"
                          dropdownID="video-chat-service-menu"
                          title={strings.video_call}
                          data-no-focus="true">
        <span className="aui-icon hipchat-icon-small icon-camera-no-slash">
          {strings.video_call}
        </span>
      </AUIDropdownTrigger>
    );
  },

  _getStandardVideoButton: function (service) {
    return (
      <button ref="video_btn"
              className="hc-video-call-btn-link aui-button aui-button-light"
              onClick={
                service === VideoServiceKeys.ENSO
                ? this._startEnsoVideoCall
                : this._startAddliveVideoCall
              }
              title={strings.video_call}
              disabled={this.props.read_only_mode}
              data-no-focus="true">
        <span className="aui-icon hipchat-icon-small icon-camera-no-slash">
          {strings.video_call}
        </span>
      </button>
    );
  },

  _getVideoChatButton: function () {
    let video_service_enabled = [
      this.props.web_client_addlive_video_enabled,
      this.props.web_client_enso_video_enabled
    ];

    let button;

    switch(video_service_enabled.indexOf(false)) {
      case -1:
        button = this._getVideoSelectButton();
        break;
      case 0:
        button = this._getStandardVideoButton(VideoServiceKeys.ENSO);
        break;
      case 1:
        button = this._getStandardVideoButton(VideoServiceKeys.ADDLIVE);
        break;
    }

    return button;
  },

  _getVideoChatExpandMenu: function () {
      return (
        <AUIDropdown dropdownID="video-chat-service-menu">
          <div className="aui-dropdown2-section">
            <ul>
              <li>
                <a ref="menu_enso_video_btn"
                   className="hc-enso-service"
                   target="_blank"
                   onClick={this._startEnsoVideoCall}>
                  {strings.enso_video}
                  <span className="aui-lozenge aui-lozenge-current hc-video-service-lozenge">
                    Beta
                  </span>
                </a>
              </li>
              <li>
                <a ref="menu_video_btn"
                   className="hc-video-service"
                   target="_blank"
                   onClick={this._startAddliveVideoCall}>
                  {strings.hipchat_video}
                </a>
              </li>
            </ul>
          </div>
        </AUIDropdown>
      );
  },

  render: function () {
    let provide_select_menu = this.props.web_client_enso_video_enabled && this.props.web_client_addlive_video_enabled;
    let menu;

    if (provide_select_menu) {
      menu = this._getVideoChatExpandMenu();
    }
    var classes = cx({
      'aui-buttons': true,
      'hc-video-btn-expands': provide_select_menu
    });
    return (
      <div className={classes}>
        <div>
          {this._getVideoChatButton()}
        </div>
        {menu}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/video_buttons.js
 **/