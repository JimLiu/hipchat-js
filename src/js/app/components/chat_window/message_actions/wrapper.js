import cx from 'classnames';
import ChatWindowActions from 'actions/chat_window_actions';
import AppDispatcher from 'dispatchers/app_dispatcher';
import IntegrationsStore from 'stores/integrations_store';
import strings from 'strings/integrations_strings';
import DropDown from 'components/common/actions_dropdown/actions_dropdown';
import DropDownAction from 'components/common/actions_dropdown/integration_dropdown_action';
import IntegrationsHelper from 'helpers/integration_helper';
import EditMessage from './edit_message';
import DeleteMessage from './delete_message';

export default React.createClass({

  displayName: "ActionableMessageWrapper",

  propTypes: {
    msg: React.PropTypes.shape({
      mid: React.PropTypes.string,
      room: React.PropTypes.string
    }),
    onActive: React.PropTypes.func,
    onInactive: React.PropTypes.func
  },

  getInitialState() {
    return {
      "active": false
    };
  },

  componentWillUnmount() {
    AppDispatcher.unregister('chat-is-scrolling', this._dismiss);
  },

  _onShow() {
    ChatWindowActions.displayMessageAction({jid: this.props.msg.room});
    AppDispatcher.registerOnce('chat-is-scrolling', this._dismiss);
    this.setState({"active": true});
  },

  _onDismiss() {
    ChatWindowActions.hideMessageAction({jid: this.props.msg.room});
    AppDispatcher.unregister('chat-is-scrolling', this._dismiss);
    this.setState({"active": false});
  },

  render() {
    let classes = cx({
      "actionable-msg-container": true,
      "msg-line": true,
      "hc-message-actions-active": this.state.active
    });

    let dropdown = <DropDown icon="aui-iconfont-more"
                             dropdown_id={"message-actions-" + this.props.msg.mid}
                             lazy_options={this._renderOptions}
                             location_horizontal="left"
                             onShow={this._onShow}
                             onHide={this._onDismiss}/>;

    return <div className={classes} key={this.props.msg.mid}>
      {dropdown}
      {this.props.children}
    </div>;
  },

  _renderOptions() {
    let extensions = IntegrationsStore.getExtensionsByLocationAndContext("hipchat.message.action", {message: this.props.msg});

    let options = [], editControls;

    if (extensions.length > 0) {
      options = _.map(extensions, action => <DropDownAction action={action}
                                                          msg={this.props.msg}
                                                          key={IntegrationsHelper.to_full_key(action.addon_key + ":" + action.key)}/>);
    } else if (!this.props.is_editable || !this.props.message_editing_enabled) {
      options = [<li key={this.props.msg.mid}>
        <a className="disabled" title={strings.empty_message_actions_title}>{strings.empty_message_actions}</a>
      </li>];
    }

    if (this.props.message_editing_enabled && this.props.is_editable) {
      editControls = <div className="aui-dropdown2-section">
          <ul>
            <EditMessage msg={this.props.msg} />
            <DeleteMessage msg={this.props.msg} />
          </ul>
        </div>;
    }

    let optionsSection;
    if (this.props.message_editing_enabled && editControls && options.length > 0) {
      optionsSection = <div className="aui-dropdown2-section">
        <ul className="aui-list-truncate">
          {options}
        </ul>
      </div>;
    } else {
      optionsSection = <ul className="aui-list-truncate">
        {options}
      </ul>;
    }

    return <div>
      {editControls}
      {optionsSection}
    </div>;
  },

  _dismiss() {
    ChatWindowActions.dismissActionsDropDown();
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_actions/wrapper.js
 **/