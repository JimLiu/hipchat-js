import AnalyticsActions from 'actions/analytics_actions';
import PreferencesActions from 'actions/preferences_actions';
import cx from 'classnames';
import API from 'api/api';
import strings from 'strings/integrations_strings';
import InlineDialogActions from 'actions/inline_dialog_actions';

export default React.createClass({

  displayName: 'AddIntegrationsGlance',

  _dismissAction(event) {
    event.stopPropagation();
    AnalyticsActions.roomIntegrationsGlanceDismissed();
    PreferencesActions.addRoomToIntegrationDiscoveryIgnoreList(this.props.room_id);

    InlineDialogActions.showAddIntegrationsHelperDialog({
      anchor: document.getElementById('hc-integrations-link')
    });
  },

  _openIntegrationsPage() {
    AnalyticsActions.roomIntegrationsGlanceClicked();
    API.openIntegrationsWindow();
  },

  render: function() {
    let classes = cx({
      "hc-integration-advertisement": true,
      "hc-glance": true,
      "clickable": true
    });

    return (
      <div className={classes}>
        <div className="aui-nav-item" onClick={this._openIntegrationsPage}>
          <div className="hc-glance-content">
            <span className="aui-icon aui-icon-small aui-iconfont-add"/>
            <div className="hc-glance-label">{strings.add_integrations}
              <a data-aui-trigger onClick={this._dismissAction}
                    className="hc-discovery-glance-close aui-icon aui-icon-small aui-iconfont-remove"/>
            </div>
            <div className="hc-glance-status"/>
          </div>
        </div>
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/integrations/add_integrations_glance.js
 **/