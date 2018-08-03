import utils from "helpers/utils";
import LayoutStore from 'stores/layout_store';
import PreferencesStore from 'stores/preferences_store';
import RosterStore from 'stores/roster_store';
import ConfigStore from 'stores/configuration_store';
import RosterMiniExpander from './roster_mini_expander';
import RosterMiniItem from './roster_mini_item';
import cx from 'classnames';

module.exports = React.createClass({

  displayName: "RightSideBarRosterMini",

  propTypes: {
    max_items_to_render: React.PropTypes.number,
    force_update: React.PropTypes.bool
  },

  getDefaultProps: function () {
    return {
      max_items_to_render: 32,
      force_update: false
    };
  },

  getInitialState: function () {
    return _.assign(this._getState(), {
      hide_expander: false,
      capacity: 0
    });
  },

  _getContainerWidth: function () {
    var container = this.refs.roster_mini_container;
    if (!container) {
      return 0;
    }
    return container.offsetWidth;
  },

  _getItemWidth: function () {
    var domNode = this.refs.roster_mini_container;
    if (!domNode || domNode.childNodes.length < 1) {
      return 0;
    }
    return domNode.childNodes[0].offsetWidth;
  },

  _getCapacity: function () {
    var container_width = this._getContainerWidth();
    if (container_width === 0) {
      return undefined;
    }
    var item_width = this._getItemWidth();
    if (item_width === 0) {
      return undefined;
    }
    var numbers_in_each_row = Math.max(1, Math.floor(container_width / item_width));
    return numbers_in_each_row * 2;
  },

  _getNumberOfPeopleToShow: function () {
    if (!this.state.capacity) {
      return 0;
    }
    var number_of_positions = (this.props.max_items_to_render < this.state.capacity) ?
      this.props.max_items_to_render : this.state.capacity;
    return Math.max(0, (this.state.total_number_of_people <= number_of_positions) ?
      this.state.total_number_of_people : number_of_positions - 1);
  },

  _shouldTheListBeTrimmed: function () {
    // We need to cut the list short if we are showing less than we have space for.
    if (!this.state.capacity) {
      return false;
    }
    return this.props.max_items_to_render < this.state.capacity &&
      this.props.max_items_to_render < this.state.total_number_of_people;
  },

  _isRightSideBarWidthChanging: function () {
    return LayoutStore.get('rightSidebarVisibleWidthIsChanging');
  },

  _reOrderExpander: function () {
    var capacity = this._getCapacity();
    var is_changing = this._isRightSideBarWidthChanging();
    this.setState(_.assign(this._getState(), {
      hide_expander: is_changing,
      capacity: capacity
    }));
  },

  componentDidMount: function () {
    RosterStore.on(['change:participants', 'change:admins'], this._onChange);
    PreferencesStore.on(['change:rightColumnWidth'], this._reOrderExpander);
    LayoutStore.on(['change:rightSidebarVisibleWidthIsChanging'], this._reOrderExpander);
    this._reOrderExpander();
  },

  componentDidUpdate: function () {
    this._reOrderExpander();
  },

  componentWillUnmount: function () {
    RosterStore.off(['change:participants', 'change:admins'], this._onChange);
    PreferencesStore.off(['change:rightColumnWidth'], this._reOrderExpander);
    LayoutStore.off(['change:rightSidebarVisibleWidthIsChanging'], this._reOrderExpander);
  },

  shouldComponentUpdate: function (nextProps, nextState) {
    return this.props.force_update ||
      nextProps.max_items_to_render !== this.props.max_items_to_render || !_.isEqual(nextState.admins, this.state.admins) || !_.isEqual(nextState.all_people_to_show, this.state.all_people_to_show) ||
      nextState.total_number_of_people !== this.state.total_number_of_people ||
      nextState.hide_expander !== this.state.hide_expander ||
      nextState.capacity !== this.state.capacity;
  },

  _getState: function () {
    return {
      admins: RosterStore.get('admins'),
      should_animate_gif_avatars: !ConfigStore.get('feature_flags').web_client_freeze_gifs,
      all_people_to_show: this.getAllPeopleFromStore(),
      total_number_of_people: this.getNumberOfPeopleFromStore()
    };
  },

  _onChange: function () {
    this.setState(this._getState());
  },

  _isAdmin: function (user) {
    return utils.user.is_admin(this.state.admins, false, user);
  },

  _copyUser: function (user) {
    return {
      id: user.id,
      user_id: user.user_id,
      jid: user.jid,
      presence: {
        show: user.presence ? user.presence.show : undefined,
        status: user.presence ? user.presence.status : undefined
      },
      name: user.name,
      mention_name: user.mention_name,
      photo_url: user.photo_url,
      subscription: user.subscription
    };
  },

  getAllPeopleFromStore: function () {
    return RosterStore.getSortedRosterByPresenceAndName(['members', 'guests']).slice(0, this.props.max_items_to_render).map(this._copyUser);
  },

  getNumberOfPeopleFromStore: function () {
    return RosterStore.getRosterCount(['members', 'guests']).total;
  },

  render: function () {
    var rosterWrapClasses = cx({
      'roster-wrap': true
    });

    var rosterClasses = cx({
      'hc-roster-mini': true,
      'hc-sidebar-noscroll': true
    });

    var number_of_people_visible = this._getNumberOfPeopleToShow();
    var trim_the_list = this._shouldTheListBeTrimmed();
    var index = 0;
    return (
      <div className={rosterWrapClasses}>
        <div className={rosterClasses}>
          <div ref="roster_mini_container" className="roster-mini-flex-list roster_mini_container" data-skate-ignore>
            {
              _.map(this.state.all_people_to_show, (user) => {
                // We need to cut the list short if we are showing less than we have space for.
                if (trim_the_list && index >= number_of_people_visible) {
                  return false;
                }
                var order = (index < number_of_people_visible) ? "show" : "overflow";
                index++;
                return <RosterMiniItem size="small"
                                       order={order}
                                       key={index}
                                       user_is_admin={this._isAdmin(user)}
                                       user_name={user.name}
                                       user_mention_name={user.mention_name}
                                       user_presence_show={user.presence.show}
                                       user_presence_status={user.presence.status}
                                       user_photo_url={user.photo_url}
                                       user_jid={user.jid}
                                       user_id={user.id}
                                       shouldAnimate={this.state.should_animate_gif_avatars}/>;
              })
              }
            <RosterMiniExpander size="small" total_number_of_people={this.state.total_number_of_people}
              number_of_people_visible={number_of_people_visible} hide={this.state.hide_expander} />
          </div>
        </div>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/roster_mini.js
 **/