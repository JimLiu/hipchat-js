import NavPanelContent from './nav_panel_content';
import cx from 'classnames';
import strings from 'strings/dialog_strings';
import AnalyticsActions from 'actions/analytics_actions';

export default React.createClass({

  displayName: 'NavPanel',

  propTypes: {
    children: (props, propName) => {
      if (props[propName].length < 2) {
        return new Error('NavPanel component requires more than one tab (child components)');
      }
      if (!_.every(props[propName], (child) => child.props.name)) {
        return new Error('All NavPanel child components *must* have a name attribute');
      }
    }
  },

  _onClick(e) {
    var name = e.target.getAttribute('name');
    if (this.state.activeTab !== name) {
      // Only send analytics event if the activeTab has changed
      this._handleNavPanelAnalytics(name);
    }
    this.setState({
      activeTab: name
    });
  },

  getInitialState() {
    var activeTab = {activeTab: this.props.children[0].props.name};

    if (this.props.defaultTab && _.find(this.props.children, {props: {name: this.props.defaultTab}})) {
      activeTab = {activeTab: this.props.defaultTab};
    }

    return activeTab;
  },

  _handleNavPanelAnalytics(name) {
    switch (name) {
      case strings.general:
        AnalyticsActions.generalSettingsPanelSelected();
        break;
      case strings.notifications:
        AnalyticsActions.notificationsSettingsPanelSelected();
        break;
      case strings.appearance:
        AnalyticsActions.appearanceSettingsPanelSelected();
        break;
    }
  },

  render() {
    var menuItems = React.Children.map(this.props.children, (child) => {
      if (child.type.displayName === 'NavPanelContent') {

        var classes = cx({
          'aui-nav-selected': this.state.activeTab === child.props.name
        });

        return (
          <li role="tab" className={classes} selected={this.state.activeTab === child.props.name} key={_.uniqueId()}>
            <a onClick={this._onClick}
                    name={child.props.name}>{child.props.name}</a>
          </li>
        );
      }
    });
    var tabPanels = React.Children.map(this.props.children, (child) => {
      if (child.type.displayName === 'NavPanelContent') {
        return (
          <NavPanelContent name={child.props.name} selected={this.state.activeTab === child.props.name}
                           key={_.uniqueId()} lozenge_text={child.props.lozenge_text}>{child.props.children}</NavPanelContent>
        );
      }
    });

    return (
      <div {...this.props} className="hc-nav-panel aui-group">
        <div className="aui-item aui-navgroup aui-navgroup-vertical">
          <ul className="aui-nav" data-skate-ignore>
            {menuItems}
          </ul>
        </div>
        <div className="aui-item">
          {tabPanels}
        </div>
      </div>
    );
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/nav_panel/nav_panel.js
 **/