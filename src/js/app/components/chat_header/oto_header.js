import OTOHeaderButtons from "./oto_header_buttons";
import PersonAvatar from "components/common/avatars/person_avatar";
import PresenceIcon from "components/common/icon/presence-icon";
import strings from "strings/chat_header_strings";
import utils from "helpers/utils";
import cx from "classnames";
import PureRenderMixin from 'react-addons-pure-render-mixin';

module.exports = React.createClass({

  displayName: "OTOHeader",

  mixins: [PureRenderMixin],

  _getTitle: function () {
    var title;
    if (this.props.title) {
      title = <span className="hc-oto-title">{this.props.title}</span>;
    }
    return title;
  },

  _getStatus: function () {
    var status;
    if (this.props.loading_profile) {
      status = strings.loading;
    } else {
      status = this.props.presence_status || utils.user.chat_header_status(this.props.presence_show);
    }
    return status;
  },

  _getHeaderButtons: function () {
    return <OTOHeaderButtons jid={this.props.jid}
                              name={this.props.name}
                              active_panel={this.props.active_panel}
                              show_sidebar={this.props.show_sidebar}
                              video_enabled={this.props.video_enabled}
                              read_only_mode={this.props.read_only_mode}
                              web_client_enso_video_enabled={this.props.web_client_enso_video_enabled}
                              web_client_addlive_video_enabled={this.props.web_client_addlive_video_enabled}
                              web_client_integrations_enabled={this.props.web_client_integrations_enabled}/>;
  },

  render: function() {
    var hiddenClasses = cx({
          'hidden': this.props.loading_profile
        }),
        mentionClasses = cx({
          'hidden': this.props.loading_profile,
          'mention-name': true
        }),
        title = this._getTitle(),
        headerButtons = this._getHeaderButtons(),
        status = this._getStatus();

    return (
      <div className="aui-page-header-inner hc-priv-chat" key={'oto-header-' + this.props.jid}>
        <PersonAvatar avatar_url={this.props.photo_large}
                   size="large"
                   shouldAnimate={this.props.should_animate_avatar}
                   show_presence={false}/>
        <div className="aui-page-header-main hc-page-header-main">
          <h3>{this.props.name}</h3>&nbsp;<span className={mentionClasses}>{'(@' + this.props.mention_name + ')'}</span>
          <p>
            <PresenceIcon presence={this.props.presence_show} uid={this.props.id}/>
            <span className="hc-oto-status">{status}</span>
            <span className={hiddenClasses}>
              <span className="hc-oto-time">{this.props.time}</span>
              {title}
              <a href={"mailto:" + this.props.email}>{this.props.email}</a>
            </span>
          </p>
        </div>
        {headerButtons}
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_header/oto_header.js
 **/