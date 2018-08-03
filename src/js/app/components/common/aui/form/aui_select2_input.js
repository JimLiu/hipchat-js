import AppConfig from 'config/app_config';

export default React.createClass({

  displayName: "AuiSelect2Input",

  propTypes: {
    multiple: React.PropTypes.bool,
    placeholder: React.PropTypes.string,
    data: React.PropTypes.array,
    sortResults: React.PropTypes.func,
    maxDisplayedItems: React.PropTypes.number,
    selected: React.PropTypes.array
  },

  componentDidMount: function () {
    this._setupSelect();
  },

  componentWillUnmount: function() {
    AJS.$(ReactDOM.findDOMNode(this)).auiSelect2("destroy");
    AJS.$("#select2-drop-mask").remove();
    AJS.$(".select2-sizer").remove();
  },

  shouldComponentUpdate: function(nextProps) {
    return !_.isEqual(nextProps, this.props);
  },

  componentDidUpdate(){
    this._setupSelect();
  },

  getDefaultProps: function() {
    return {
      multiple: false,
      placeholder: "",
      data: [],
      sortResults: (results) => results.slice(0, this.maxDisplayedItems),
      maxDisplayedItems: AppConfig.select2_max_displayed_items,
      selected: [],
      formatNoMatches: function() {
        return 'No matches found.';
      }
    };
  },

  _setupSelect: function () {
    var options = this._getSelectOptions();
    AJS.$(ReactDOM.findDOMNode(this)).auiSelect2(options);
    if(options.selected && options.selected.length > 0){
      AJS.$(ReactDOM.findDOMNode(this)).val(options.selected).trigger("change");
    }
  },

  _getSelectOptions: function () {
    return {
      multiple: this.props.multiple,
      placeholder: this.props.placeholder,
      data: this.props.data,
      selected: this.props.selected,
      sortResults: (...args) => this.props.sortResults(...args).slice(0, this.props.maxDisplayedItems),
      formatNoMatches: this.props.formatNoMatches
    };
  },

  render: function () {
    var name = this.props.name || this.props.id,
        classes = (this.props.size) ? "aui-select2 " + this.props.size : "aui-select2";

    return (
      <input type="hidden" id={this.props.id} className={classes} name={name} />
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/aui/form/aui_select2_input.js
 **/