import GeneralErrorsStore from 'stores/general_errors_store';
import LayoutStore from 'stores/layout_store';
import PreferencesStore from 'stores/preferences_store';
import LeftSidebar from 'components/left_sidebar/sidebar';
import MainCol from 'components/main_column/main_col';
import appConfig from 'config/app_config';
import LayoutActions from 'actions/layout_actions';

export default React.createClass({

  displayName: "MainBodyLayout",

  getInitialState: function() {
    return this.getState();
  },

  getState: function() {
    return {
      errors: GeneralErrorsStore.get('errors'),
      ready: LayoutStore.get('ready'),
      leftColumnWidth: PreferencesStore.get('leftColumnWidth'),
      leftColumnVisible: PreferencesStore.get('showNavigationSidebar')
    };
  },

  componentDidMount: function() {
    GeneralErrorsStore.on('change:errors', this._onChange);
    LayoutStore.on('change:ready', this._onChange);
    PreferencesStore.on(['change:leftColumnWidth', 'change:showNavigationSidebar'], this._onChange);
    this._resizeColumns(this.state.leftColumnWidth);
  },

  componentDidUpdate: function() {
    if (this.state.leftColumnVisible) {
      this._resizeColumns(this.state.leftColumnWidth);
    }
  },

  componentWillUnmount: function() {
    GeneralErrorsStore.off('change:errors', this._onChange);
    LayoutStore.off('change:ready', this._onChange);
    PreferencesStore.off(['change:leftColumnWidth', 'change:showNavigationSidebar'], this._onChange);
  },

  _onChange: function () {
    this.setState(this.getState());
  },

  _getSidebar: function () {
    var retVal = null;
    if (this.state.leftColumnVisible) {
      retVal = (
        <div className="hc-left-sidebar-col" ref="left_column">
          <LeftSidebar />
          <div className="resize-handle" onMouseDown={this._onResizeStart}></div>
        </div>
      );
    }
    return retVal;
  },

  render: function () {
    var body,
      sidebar = this._getSidebar();
    body = (
      <div className="hc-layout">
        {sidebar}
        <MainCol ref="main_column" is_guest={this.props.is_guest}/>
      </div>
    );

    return body;
  },

  _resizeColumns: function(width) {
    if (this.state.ready && !this.state.errors.length) {
      $('.hc-unread-scroller').width(width);
      this.refs.left_column.style.width = `${width}px`;
    }
  },

  _onResizeStart: function(e) {
    e.preventDefault();
    this.beginX = e.pageX;
    this.beginWidth = this.state.leftColumnWidth;
    document.addEventListener('mouseup', this._onResizeEnd);
    document.addEventListener('mousemove', this._onHandleDrag);
  },

  _onHandleDrag(e) {
    var diff = e.pageX - this.beginX;
    if (this.beginWidth + diff >= appConfig.column_width_limits['left'].min && this.beginWidth + diff <= appConfig.column_width_limits['left'].max) {
      var width = Math.floor(this.beginWidth) + Math.floor(diff);
      this._resizeColumns(width);
      this.setState({
        leftColumnWidth: width
      });
    }
  },

  _onResizeEnd: function(e) {
    e.preventDefault();
    document.removeEventListener('mouseup', this._onResizeEnd);
    document.removeEventListener('mousemove', this._onHandleDrag);
    LayoutActions.saveLeftColumnWidth(this.state.leftColumnWidth);
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/layout/main_body_layout.js
 **/