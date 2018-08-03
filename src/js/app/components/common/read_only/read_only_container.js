import ReadOnlyStore from 'stores/read_only_store';
import ReadOnlyContent from './read_only_content';
import Spinner from 'components/common/spinner/spinner';

export default React.createClass({

  displayName: 'ReadOnlyContainer',

  componentDidMount() {
    ReadOnlyStore.on('change', this._onChange);
  },

  componentWillUnmount() {
    ReadOnlyStore.off('change', this._onChange);
  },

  getInitialState() {
    return ReadOnlyStore.getAll();
  },

  _onChange() {
    this.setState(ReadOnlyStore.getAll());
  },

  _getContent() {
    return <ReadOnlyContent {...this.state} />;
  },

  _getSpinner() {
    return <Spinner size="large" spin={ true } />;
  },

  render() {
    const { read_only_mode, is_dismissed, is_visible, is_fetching, is_fetched } = this.state;

    if (!read_only_mode || is_dismissed || !is_visible || (!is_fetching && !is_fetched)) {
      return <div></div>;
    }

    const content = is_fetching ? this._getSpinner() : this._getContent();

    return (
      <div className="hc-read-only-container">
        <div className="hc-read-only-inner">
          { content }
        </div>
      </div>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/read_only/read_only_container.js
 **/