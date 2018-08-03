import AppActions from 'actions/app_actions';
import MarkdownLink from './markdown_link';

export default React.createClass({

  displayName: 'ReadOnlyContent',

  _onDismiss() {
    AppActions.dismissReadOnlyModal();
  },

  _getIcon() {
    return <img src={ this.props.icon_url } />;
  },

  _getDownloadButton() {
    return (
      <div className="button-wrapper">
        <a className="aui-button aui-button-primary" href={ this.props.button_url } target="_blank">
          { this.props.button_text }
        </a>
      </div>
    );
  },

  render() {
    const icon = this.props.icon_url ? this._getIcon() : null;
    const downloadBtn = this.props.button_url ? this._getDownloadButton() : null;

    return (
      <div className="hc-read-only-content">
        <h3>{ this.props.title }</h3>
        <p>{ this.props.text }</p>
        { icon }
        { downloadBtn }
        <hr />
        <p>{ this.props.continue_text }</p>
        <div className="button-wrapper">
          <a className="aui-button" onClick={ this._onDismiss }>{ this.props.continue_button }</a>
        </div>
        <p className="help">
          <MarkdownLink>{ this.props.questions_markdown }</MarkdownLink><br />
          <MarkdownLink>{ this.props.contact_markdown }</MarkdownLink>
        </p>
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/read_only/read_only_content.js
 **/