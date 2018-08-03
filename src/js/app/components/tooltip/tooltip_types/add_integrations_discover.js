import strings from 'strings/integrations_strings';
import InlineDialog from 'components/common/inline_dialog/inline_dialog';
import AppConfig from 'config/app_config';
import InlineDialogActions from 'actions/inline_dialog_actions';
import AppDispatcher from 'dispatchers/app_dispatcher';

export default React.createClass({

  displayName: "AddIntegrationsDiscoverTooltip",

  componentDidMount: function() {
    $(window).on('resize', this._positionDialog);
    this._positionDialog();
    AppDispatcher.register('set-right-sidebar-visible-width-is-changing', this._closeDialog);
  },

  componentDidUpdate: function () {
    this._positionDialog();
  },

  componentWillUnmount: function () {
    $(window).off('resize', this._positionDialog);
    AppDispatcher.unregister('set-right-sidebar-visible-width-is-changing', this._closeDialog);
  },

  _positionDialog: function () {
    let anchor = this.props.anchor,
      node = ReactDOM.findDOMNode(this),
      rect,
      bottom,
      left;

    if (anchor) {
      _.delay(() => {
        rect = anchor.getBoundingClientRect();
        bottom = 45;
        left = rect.left - rect.width / 2;
        $(node).css({
          bottom: `${bottom}px`,
          left: `${left}px`,
          display: 'block'
        });
      }, AppConfig.notification_banner_slide);
    }
  },

  _closeDialog: function() {
    InlineDialogActions.hideInlineDialog();
  },

  render: function () {
    return <InlineDialog dialogId="add-integrations-discover-tooltip" tooltip_helper="hc-tooltip-helper" arrowLocation="bottom">
      <div className="add-integrations-tooltip">
        <div className="add-integrations-tooltip-title">{strings.install_integrations_tooltip_title}</div>
        <p className="add-integration-tooltip-content">{strings.install_integrations_tooltip_content}</p>
        <p>
          <a className="add-integration-tooltip-close" onClick={this._closeDialog}>{strings.got_it}</a>
        </p>
      </div>
    </InlineDialog>;
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/tooltip/tooltip_types/add_integrations_discover.js
 **/