import ModalDialogAlt from "components/common/modal_dialog/modal_dialog_alternate";
import strings from "strings/dialog_strings";
import DialogActions from "actions/dialog_actions";
import spi from "spi";

export default React.createClass({

  displayName: "Desktop4Dialog",

  componentDidMount() {
    spi.onDesktop4DialogShown();
  },

  getDefaultProps() {
    return {
      content: {}
    };
  },

  _onClick() {
    DialogActions.closeDialog();
  },

  _getTitle() {
    let title = _.get(this.props.content, "title");

    if (_.isString(title)) {
      return (
        <h2>{title}</h2>
      );
    }
  },

  _getIntro() {
    let intro = _.get(this.props.content, "intro");

    if (_.isString(intro)) {
      return (
        <p>{intro}</p>
      );
    }
  },

  _getBullets() {
    let bullets = _.get(this.props.content, "bullets");

    if (_.isArray(bullets) && bullets.length) {
      return (
        <ul>
          {bullets.map(function(bullet) {
            return (
              <li>{bullet}</li>
            );
          })}
        </ul>
      );
    }
  },

  _getOutro() {
    let outro = _.get(this.props.content, "outro");

    if (_.isString(outro)) {
      return (
        <p>{outro}</p>
      );
    }
  },

  _getCTA() {
    let cta = _.get(this.props.content, "cta", strings.close);

    if (_.isString(cta)) {
      return (
        <button className="aui-button aui-button-primary" onClick={this._onClick}>{cta}</button>
      );
    }
  },

  _dialogBody() {
    let title = this._getTitle(),
        intro = this._getIntro(),
        bullets = this._getBullets(),
        outro = this._getOutro(),
        cta = this._getCTA();

    return (
      <div>
        <div className="img" />
        {title}
        <div className="inner-content">
          {intro}
          {bullets}
          {outro}
        </div>
        {cta}
      </div>
    );
  },

  render() {
    return (
      <ModalDialogAlt dialogId="desktop-4-dialog"
        dialogBody={this._dialogBody}
        size="small"/>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/desktop_4_dialog/desktop_4_dialog.js
 **/