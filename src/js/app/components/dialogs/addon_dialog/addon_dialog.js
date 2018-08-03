import ConnectAddonHelper from 'helpers/connect_addon';
import RoomsNavStore from 'stores/rooms_nav_store';
import AppConfig from 'config/app_config';
import DialogActions from 'actions/dialog_actions';
import AnalyticsActions from 'actions/analytics_actions';
import SimpleXDM from 'simple-xdm/host';
import ModalDialog from 'components/common/modal_dialog/modal_dialog';
import strings from 'strings/dialog_strings';

let REACT_CONTAINER_ID = "connect-dialog-container";
module.exports = React.createClass({

  displayName: "AddonDialog",

  _getAddonOptions: function() {
    let addonOptions = $.extend({}, this.props.addon_options);
    if(addonOptions.chrome === undefined) {
      addonOptions.chrome = true;
    }

    if(addonOptions.resize === undefined && (this.props.addon_options.width || this.props.addon_options.height)){
        addonOptions.resize = false;
    }

    addonOptions.width = this._getWidth(addonOptions.width || AppConfig.default_connect_dialog_width);
    addonOptions.height = this._getHeight(addonOptions.height || AppConfig.default_connect_dialog_height, addonOptions.chrome);
    return addonOptions;
  },

  _getDimension: function(dimension, value){
    this.max_width = ConnectAddonHelper.dialog.getMaxWidth();
    this.max_height = ConnectAddonHelper.dialog.getMaxHeight();

    if(!value || parseInt(value, 10) > this['max_' + dimension]){
      return this['max_' + dimension];
    } else if(value) {
      return parseInt(value, 10);
    }

    return AppConfig['default_connect_dialog_' + dimension];
  },
  _getWidth: function(width) {
    if(width === undefined){
      width = parseInt(this.props.addon_options.width, 10) || AppConfig.default_connect_dialog_width;
    }
    return this._getDimension('width', width);
  },
  _getHeight: function(height, chrome){
    if(height === undefined){
      height = parseInt(this.props.addon_options.height, 10) || AppConfig.default_connect_dialog_height;
    }
    height = this._getDimension('height', height);
    let chromeMaxHeight = ConnectAddonHelper.dialog.getMaxHeight() - AppConfig.connect_aui_dialog_chrome_height;

    if(chrome && height > chromeMaxHeight) {
      return chromeMaxHeight;
    }

    return height;
  },
  _getOptions: function(){
    return $.extend(true, this._getAddonOptions(), {
      capabilities: ConnectAddonHelper.dialog.capabilities
    });
  },
  _createDialog: function () {
    let options = this._getOptions(),
        containerDiv = AJS.$(ReactDOM.findDOMNode(this.refs.connectDialog));

    containerDiv.css({
      width: this._getWidth(),
      height: this._getHeight(undefined, options.chrome)
    });
    this.resize(this._getWidth(), this._getHeight(undefined, options.chrome));

    containerDiv.find('.ap-dialog-submit').hide();
    containerDiv.on("ra.iframe.destroy", function(){
      DialogActions.closeDialog();
    });

  },
  componentDidMount: function () {
    ConnectAddonHelper.bindAnalyticsIntercept();
    RoomsNavStore.on(['change'], this._onChange);
    this._createDialog();
  },
  componentWillUnmount: function () {
    ConnectAddonHelper.unbindAnalyticsIntercept();
    RoomsNavStore.off(['change'], this._onChange);
    var addon_key = this.props.addon_key;
    AnalyticsActions.connectDialogClosedEvent(addon_key);
  },

  getInitialState: function () {
    return this._getActiveChatState();
  },

  _getActiveChatState: function () {
    return {
      active_chat: RoomsNavStore.get("active_chat"),
      rooms: RoomsNavStore.get("rooms")
    };
  },

  _onChange: function () {
    this.setState(this._getActiveChatState());
  },

  _resized: function (width, height) {
      this.resize(width, height);
  },
  _dimensions: function (width, height) {
    var max_height = ConnectAddonHelper.dialog.getMaxHeight(),
        max_width = ConnectAddonHelper.dialog.getMaxWidth();

    return {
      height: Math.min(parseInt(height, 10), max_height),
      width: Math.min(parseInt(width, 10), max_width)
    };
  },
  resize: function (width, height) {
    var top, dimensions = this._dimensions(width, height);
    top = ($(document).height() - dimensions.height) / 2;
    let $el = $('#' + REACT_CONTAINER_ID).css('top', top);
    AJS.layer($el).changeSize(dimensions.width, dimensions.height);
  },
  dialogBody: function () {
    var xdm = SimpleXDM.create({
      addon_key: this.props.addon_key,
      key: this.props.module_key
    });
    var ns = ConnectAddonHelper.getNamespace(this.props.addon_key, this.props.module_key),
      options = this._getOptions(),
      src = ConnectAddonHelper.getIframeUrl(this.props.addon_url, ns, options);

    return (<iframe className="hc-addon-iframe" id={xdm.id} name={xdm.name} src={src}
                    onLoad={this._onLoad}/>);
  },

  render: function () {
    var options = this._getOptions(),
      dimensions = this._dimensions(this._getWidth(), this._getHeight(undefined, options.chrome));
    return (
      <ModalDialog ref="connectDialog" dialogId={REACT_CONTAINER_ID}
        title={this.props.addon_options.header}
        dialogBody={this.dialogBody}
        closeLinkText={strings.close}
        customWidth={dimensions.width}
        customHeight={dimensions.height} />
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/addon_dialog/addon_dialog.js
 **/