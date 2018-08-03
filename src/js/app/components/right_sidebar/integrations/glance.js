import IntegrationsActions from 'actions/integrations_actions';
import GlanceActions from 'actions/glance_actions';
import GlancesMetadataStore from 'stores/glances_metadata_store';
import Spinner from 'components/common/spinner/spinner';
import Icon from './icon';
import cx from 'classnames';
import strings from 'strings/integrations_strings';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: "RightSideBarGlance",

  propTypes: {
    glance: React.PropTypes.shape({
      name: React.PropTypes.string.isRequired,
      full_key: React.PropTypes.string.isRequired,
      addon_key: React.PropTypes.string.isRequired,
      key: React.PropTypes.string.isRequired,
      icon: React.PropTypes.object,
      query_url: React.PropTypes.string,
      target: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.object
      ]),
      dynamic: React.PropTypes.bool,
      internal: React.PropTypes.bool
    }).isRequired,
    room_id: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number
    ])
  },

  mixins: [PureRenderMixin],

  getInitialState: function() {
    return {
      loading: this._isDynamic(),
      error: null,
      label: {
        value: this.props.glance.name
      },
      room_id: null,
      condition: null,
      status: {
      }
    };
  },

  componentWillMount: function() {
    let cachedData = GlancesMetadataStore.getCachedMetadata(this.props.room_id, this.props.glance.full_key);
    if (!_.isEmpty(cachedData) && !cachedData.loading) {
      this.setState(cachedData);
    }
  },

  componentDidMount: function() {
    if (this._isDynamic()) {
      GlancesMetadataStore.onGlanceMetadataChange(this.props.room_id, this.props.glance.full_key, this._onChange);
    }
  },

  componentWillUpdate(){
    if (this._isDynamic()) {
      GlancesMetadataStore.offGlanceMetadataChange(this.props.room_id, this.props.glance.full_key, this._onChange);
    }
  },

  componentDidUpdate(){
    if (this._isDynamic()) {
      GlancesMetadataStore.onGlanceMetadataChange(this.props.room_id, this.props.glance.full_key, this._onChange);
    }
    if (this.isMounted()) {
      this._onChange();
    }
  },

  componentWillUnmount: function() {
    if (this._isDynamic()) {
      GlancesMetadataStore.offGlanceMetadataChange(this.props.room_id, this.props.glance.full_key, this._onChange);
    }
  },

  _fetchMetadata: function() {
      GlanceActions.fetchGlanceMetadata(this.props.room_id, this.props.glance, true);
  },

  _onChange: function() {
    this.setState(this._getState());
  },

  _getState: function() {
    return GlancesMetadataStore.getCachedMetadata(this.props.room_id, this.props.glance.full_key) || this.getInitialState();
  },

  _onClick: function() {
    IntegrationsActions.open(this.props.glance.addon_key, this.props.glance.key, {}, null, "glance");
  },

  _renderErrorGlance: function() {
    let classes = cx({
      "hc-glance": true,
      "error": true
    });

    return (
      <div className={classes}
          ref={`${this.props.glance.full_key}_link`}>
        <div className="aui-nav-item" aria-label={this.props.glance.name} data-tipsify-ignore>
          {this._renderIcon()}
          <div className="hc-glance-content">
            <div className="hc-glance-label">{this.props.glance.name}</div>
            <div className="hc-glance-status" onClick={this._fetchMetadata}>
              {strings.glance_fetch_error}
              <button className="aui-button aui-button-link">{strings.retry}</button>
            </div>
          </div>

        </div>
      </div>
    );
  },


  _isDynamic: function() {
    return !_.isEmpty(this.props.glance.query_url);
  },

  _renderLabel: function() {
    if (this.state.loading) {
      return <span className="hc-glance-label">{strings.glance_loading}</span>;
    }

    let labelHtml;
    if (this.state.label.type === "safe_html") {
      labelHtml = <span className="hc-glance-label" dangerouslySetInnerHTML={{__html: this.state.label.value}}></span>;
    } else {
      labelHtml = <span className="hc-glance-label">{this.props.glance.name}</span>;
    }

    return labelHtml;
  },

  _renderLozenge: function(lozenge) {
    let classNames = "aui-lozenge aui-lozenge-" + lozenge.type;

    return <span className={classNames} >{lozenge.label}</span>;
  },

  _renderStatusElement: function() {
    switch(this.state.status.type) {
      case "lozenge":
        var lozenge = this.state.status.value;
        return this._renderLozenge(lozenge);
      case "icon":
        return <Icon icon={this.state.status.value} />;
      case "text":
        return <span className={"hc-glance-status-text"}>{this.state.status.value}</span>;
      default:
        return null;
    }
  },

  _renderStatus: function() {
    return (
      <span className="hc-glance-status">
          {this._renderStatusElement()}
      </span>
    );
  },

  _renderChildren: function() {
    return (
      <div className="hc-glance-children">
          {this.props.children}
      </div>
    );
  },

  _renderIcon: function() {
    return this.props.glance.icon ? <Icon icon={this.props.glance.icon}/> : null;
  },

  render: function() {

    if (!_.isNull(this.state.error)) {
      return this._renderErrorGlance();
    }

    let classes = cx({
      "hc-glance": true,
      "loading": this.state.loading,
      "clickable": !_.isUndefined(this.props.glance.target)
    });

    return (
      <div className={classes}
           ref={`${this.props.glance.full_key}_link`}
           onClick={this.props.glance.target ? this._onClick : null}>
        <div className="aui-nav-item" aria-label={this.props.glance.name} data-tipsify-ignore>
          <div className="hc-glance-content">
            {this._renderIcon()}
            {this._renderLabel()}
            {this._renderStatus()}

            <div className="hc-spinner-container">
              <Spinner size="small" spin={this.state.loading} zIndex={1} />
            </div>
          </div>
        </div>
        {this._renderChildren()}
      </div>
    );


  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/integrations/glance.js
 **/