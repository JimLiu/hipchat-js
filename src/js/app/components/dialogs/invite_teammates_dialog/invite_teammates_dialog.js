import ModalDialogVisibilityMixin from 'components/mixins/modal_dialog_visibility_mixin';
import DialogActions from 'actions/dialog_actions';
import cookies from 'helpers/cookies.js';
import config from 'config/app_config';
import utils from "helpers/utils";
import AnalyticsActions from 'actions/analytics_actions';

export default React.createClass({

  displayName: "InviteTeammatesDialog",

  mixins: [ModalDialogVisibilityMixin],

  componentDidMount() {
    this._setClientCookie();
    this._getIframe().on("load", this._onIframeLoad);
    this.spinTimer = _.delay(() => {
      if (!this._getIframe().hasClass('loaded')) {
        AJS.$("#invite-teammates-dialog >.aui-dialog2-content").spin('large');
      }
    }, config.modal_transition_allowance);
    $(window).on('beforeunload', this._removeClientCookie);
  },

  componentWillUnmount() {
    this._removeClientCookie();
    clearTimeout(this.spinTimer);
    this._getIframe().off("load", this._onIframeLoad);
    $(window).off('beforeunload', this._removeClientCookie);
  },

  _setClientCookie: function () {
    cookies.setItem("client", "web");
  },

  _removeClientCookie: function () {
    cookies.removeItem("client", "web");
  },

  _onIframeLoad() {
    AJS.$("#invite-teammates-dialog >.aui-dialog2-content").spinStop();
    this._getIframe().addClass("loaded");
    var $body = $(this._getIframeBody());
    $body.find("#btn_copy_invite_link").remove();
    $body.find(".external-link").click((e) => {
      var $target = $(e.target);
      $target.attr("target", "_blank");
      $target.attr("href", this._getExternalUrl($target.attr("href")));
    });
    $body.find("a[href='#hcnative:close']").click(this._close);
    $body.on('keydown', this._onKeyDown);
    $body.find("#btn_send_invites").click((e) => {
      if ($(e.target).attr('aria-disabled') !== 'true'){
        let number = $(e.target).text().replace(/\D/g,'');
        if (this.state.dialogData && this.state.dialogData.type){
          AnalyticsActions.inviteTeamSent(this.state.dialogData.type, number);
        }
      }
    });
  },

  _getExternalUrl: function(href) {
    var url;

    var key = "#hcnative:externalLinkClicked:";

    var keyIndex = href.indexOf(key);
    if (keyIndex > -1) {
      var uri = decodeURIComponent(href.substr(keyIndex + key.length));
      try {
        var data = JSON.parse(uri);
        url = data.url;
      } catch (e) {
        url = null;
      }
    }

    return url;
  },

  _getIframe() {
    return $(ReactDOM.findDOMNode(this.refs.inviteUsersIframe));
  },

  _getIframeBody() {
    return _.get(this._getIframe().get(0), 'contentWindow.document.body');
  },

  _close() {
    DialogActions.closeDialog();
  },

  _onKeyDown: function (e) {
    var key = (window.Event) ? e.which : e.keyCode;
    if (key === utils.keyCode.Esc) {
      this._close();
    }
  },

  _dialogBody: function () {
    return <iframe ref="inviteUsersIframe" id="invite-users-frame" src={`https://${this.props.web_server}/native/invite?default_text=${this.props.default_text || ''}`}></iframe>;
  },

  render: function () {
    return (
      <section role="dialog" id="invite-teammates-dialog" className="aui-layer aui-dialog2 aui-dialog2-medium"
        aria-hidden={!this.state.dialogVisible}>
        <div className="aui-dialog2-content">
          {this._dialogBody()}
        </div>
      </section>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/invite_teammates_dialog/invite_teammates_dialog.js
 **/