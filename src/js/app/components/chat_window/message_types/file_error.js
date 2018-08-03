import FileErrorStrings from 'strings/file_error_strings';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import Spinner from 'components/common/spinner/spinner';
import cx from 'classnames';

export default React.createClass({
  displayName: "FileErrorMessageType",

  mixins: [PureRenderMixin],

  propTypes: {
    code: React.PropTypes.number.isRequired,
    title: React.PropTypes.string,
    isLoading: React.PropTypes.bool,
    description: React.PropTypes.string,
    onClick: React.PropTypes.func
  },

  render() {
    let stringObject = FileErrorStrings[this.props.code] || FileErrorStrings.default_error;
    let title = this.props.title || stringObject.title;
    let description = this.props.description || stringObject.description;
    let classNames = cx({
      'file-error-message': true
    });

    return (
      <div className={classNames}>
        <h3>{ title }</h3>
        <div>{ description }</div>
        <div>{ this.props.onClick ? this.renderTryAgainButton() : '' }</div>
      </div>);
  },

  renderTryAgainButton() {
    if (this.props.isLoading) {
      return (
        <div className="file-error-spinner">
          <Spinner size="small" spin={!!this.props.isLoading}></Spinner>
        </div>);
    }
    return (<a onClick={this.props.onClick}>Try again</a>);
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/file_error.js
 **/