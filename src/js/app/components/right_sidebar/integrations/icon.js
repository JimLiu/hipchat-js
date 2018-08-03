/*global HC*/
import AppStore from 'stores/application_store';
import cx from 'classnames';
import PureRenderMixin from 'react-addons-pure-render-mixin';

var mixedValidator = function(props, propName, componentName) {
  if( _.isUndefined(props.aui_icon) && _.isUndefined(props[propName])){
    return new Error(propName + " parameter is mandatory in IntegrationIcon");
  }
};

export default React.createClass({

  displayName: "IntegrationIcon",

  propTypes: {
    icon: React.PropTypes.shape({
      "url": mixedValidator,
      "url@2x": mixedValidator,
      "aui_icon": React.PropTypes.string
    }).isRequired
  },

  mixins: [PureRenderMixin],

  getInitialState: function() {
    return {
      error: false
    };
  },

  componentDidMount: function() {
    $(ReactDOM.findDOMNode(this)).on('error', this._onError);
  },

  componentWillUnmount: function() {
    $(ReactDOM.findDOMNode(this)).off('error', this._onError);
  },

  _onError: function() {
    this.setState({error: true});
  },

  render: function() {

    if (_.get(this.props.icon, "aui_icon")) {
      var auiClasses = cx("aui-icon", this.props.icon.aui_icon);
      return (<span className={auiClasses}></span>);
    }

    let icon;
    if (this.state.error) {
      icon = AppStore.get('asset_base_uri') + `assets/svgs/fail_avatar.svg`;
    } else {
      icon = HC.resolution > 1 ? _.get(this.props.icon, "url@2x") : _.get(this.props.icon, "url");
    }

    return (
      <img className="aui-icon" src={icon}/>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/integrations/icon.js
 **/