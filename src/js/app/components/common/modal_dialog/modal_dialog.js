import DialogActions from "actions/dialog_actions";
import ModalDialogVisibilityMixin from "components/mixins/modal_dialog_visibility_mixin";
import strings from "strings/dialog_strings";
import Spinner from "components/common/spinner/spinner";
import AppConfig from 'config/app_config';
import utils from "helpers/utils";
import cx from 'classnames';

export default React.createClass({

  displayName: "ModalDialog",

  propTypes: {
    size: React.PropTypes.oneOf(['small', 'medium', 'large', 'xlarge'])
  },

  mixins: [ModalDialogVisibilityMixin],

  componentDidMount: function() {
    document.querySelector("body").addEventListener('keydown', this._onKeyDown);
  },

  componentWillUnmount: function() {
    document.querySelector("body").removeEventListener('keydown', this._onKeyDown);
  },

  getDefaultProps: function() {
    return {
      closeLinkText: strings.close,
      dialogId: "dialog",
      dialogBody: _.noop,
      dialogFooterButton: _.noop,
      dialogFooterLinks: _.noop,
      dialogFilter: false,
      dialogFilterPlaceholder: "",
      dialogFilterCallback: _.noop,
      btnLoading: false,
      size: "medium",
      hint: "",
      isWarning: false,
      showFooter: true
    };
  },

  _getTitle: function () {
    var title;
    if (this.props.lozenge_text) {
      title = (
        <h2 className="aui-dialog2-header-main">
          {this.props.title}
          <span className="aui-lozenge aui-lozenge-current">{this.props.lozenge_text}</span>
        </h2>
      );
    } else {
      title = <h2 className="aui-dialog2-header-main">{this.props.title}</h2>;
    }
    return title;
  },

  _getSecondaryHeader: function() {
    var secondaryHeader = false;
    if (this.props.dialogFilter) {
      secondaryHeader = (
        <div className="aui-dialog2-header-secondary">
          <form className="aui" action="#">
            <input className="text" type="search" name="search"
                   placeholder={this.props.dialogFilterPlaceholder} onChange={this.props.dialogFilterCallback}/>
          </form>
        </div>
      );
    }
    return secondaryHeader;
  },

  _getHint: function () {
    var hint;
    if (this.props.noHint) {
      hint = false;
    } else {
      hint = (
        <div className="aui-dialog2-footer-hint">{this.props.hint}</div>
      );
    }
    return hint;
  },

  _getCloseBtn: function () {
    var btn;
    if (this.props.btnLoading) {
      btn = false;
    } else {
      btn = (
        <a className="aui-dialog2-header-close" onClick={this._onClickClose}>
          <span className="aui-icon aui-icon-small aui-iconfont-close-dialog">{strings.close}</span>
        </a>
      );
    }
    return btn;
  },

  _getCloseLink: function () {
    var link;
    if (this.props.noCloseLink) {
      link = false;
    } else {
      link = (
        <button className="aui-button aui-button-link" aria-disabled={this.props.btnLoading} onClick={this._onClickClose}>
          {this.props.closeLinkText}
        </button>
      );
    }
    return link;
  },

  _getSectionStyle() {
    var style = {};
    if (this.props.customWidth) {
      style = {
        width: this.props.customWidth
      };
    }
    return style;
  },

  _getDialogContentStyle() {
    var style = {};
    if (this.props.customHeight) {
      style = {
        height: this.props.customHeight
      };
    }
    return style;
  },

  close: function() {
    DialogActions.closeDialog();
  },

  _onKeyDown: function (e) {
    var key = (window.Event) ? e.which : e.keyCode;
    if (key === utils.keyCode.Esc && !this.props.btnLoading) {
      this.close();
    }
  },

  _onClickClose: function () {
    if (!this.props.btnLoading) {
      this.close();
    }
  },

  _getFooter: function() {
    let closeLink = this._getCloseLink(),
        hint = this._getHint();

    return (
      <footer className="aui-dialog2-footer">
        <div className="aui-dialog2-footer-actions">
          <div className="hc-dialog-btn-spinner">
            <Spinner spin={this.props.btnLoading} size="small" color={AppConfig.spinner_colors["light"]}/>
          </div>
          {this.props.dialogFooterButton()}
          {this.props.dialogFooterLinks()}
          {closeLink}
        </div>
        {hint}
      </footer>
    );
  },

  render: function() {
    var closeBtn = this._getCloseBtn(),
        footer = this.props.showFooter ? this._getFooter() : null,
        title = this._getTitle(),
        secondaryHeader = this._getSecondaryHeader();

    var classes = cx({
      'aui-layer': true,
      'aui-dialog2': true,
      'aui-dialog2-warning': this.props.isWarning
    }, `aui-dialog2-${this.props.size}`);

    return (
      <section role="dialog" id={this.props.dialogId} className={classes} style={this._getSectionStyle()}
        aria-hidden={!this.state.dialogVisible}>
        <header className="aui-dialog2-header">
          {title}
          {secondaryHeader}
          {closeBtn}
        </header>
        <div className="aui-dialog2-content hc-dialog-content" style={this._getDialogContentStyle()}>
          {this.props.dialogBody()}
        </div>
        {footer}
      </section>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/modal_dialog/modal_dialog.js
 **/