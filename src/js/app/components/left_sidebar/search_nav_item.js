import PureRenderMixin from 'react-addons-pure-render-mixin';
import RoomNavActions from "actions/room_nav_actions";
import CommonStrings from "strings/common_strings";
import cx from 'classnames';

export default React.createClass({

  displayName: "SearchNavItem",

  mixins: [PureRenderMixin],

  _closeSearch: function () {
    RoomNavActions.closeSearchResults();
  },

  _showSearch: function () {
    RoomNavActions.openSearchResults();
  },

  render: function() {
    var classes = cx({
      'hc-tab': true,
      'aui-nav-selected': this.props.active
    });

    return (
      <ul className="aui-nav hc-sidebar-nav hc-search-results" data-skate-ignore>
        <li className={classes} data-jid="search">
          <a className="aui-nav-item aui-nav-selected" onClick={this._showSearch}>
            <span className="aui-icon hipchat-icon-small icon-search"></span>
            <span className="aui-nav-item-label">{CommonStrings.search_results}</span>
          </a>
          <a className="hc-tab-close" onClick={this._closeSearch}>
            <span className="aui-icon hipchat-icon-xsmall hc-close-icon icon-close"/>
          </a>
        </li>
      </ul>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/search_nav_item.js
 **/