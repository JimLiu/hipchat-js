import ModalDialog from 'components/common/modal_dialog/modal_dialog';
import strings from 'strings/dialog_strings';
import DialogVisibilityMixin from 'components/mixins/modal_dialog_visibility_mixin';
import WelcomeStore from 'stores/welcome_store';
import utils from 'helpers/utils';
import WelcomePeopleItem from 'components/dialogs/welcome_dialog/welcome_people_item';
import WelcomeRoomsItem from 'components/dialogs/welcome_dialog/welcome_rooms_item';
import WelcomeActions from 'actions/welcome_actions';
import Spinner from 'components/common/spinner/spinner';
import Tooltip from 'components/tooltip/tooltip';
import ChatInputStore from 'stores/chat_input_store';

export default React.createClass({

  displayName: "WelcomeDialog",

  mixins: [DialogVisibilityMixin],

  componentDidMount: function () {
    WelcomeStore.on(['change'], this._onStoreChange);
    WelcomeActions.dialogRendered();
  },

  componentWillUnmount: function () {
    WelcomeStore.off(['change'], this._onStoreChange);
  },

  componentDidUpdate: function(prevProps, prevState){
    if (this.state.new_forced_caret_position) {
      utils.setCaretPosition(ReactDOM.findDOMNode(this).querySelector(".textarea"), this.state.new_forced_caret_position);
      WelcomeActions.resetNewForcedCaretPosition();
    }
  },

  getInitialState: function () {
    return this._getState();
  },

  _getState: function () {
    return WelcomeStore.getAll();
  },

  _onStoreChange: function () {
    this.setState(this._getState());
  },

  _getStarIcon: function () {
    return <span className="aui-icon aui-icon-small aui-iconfont-star"></span>;
  },

  _getInfoIcon: function () {
    return <span className="aui-icon aui-icon-small aui-iconfont-info"></span>;
  },

  _dialogTitle: function () {
    let title = '';

    switch (this.state.current_step) {
      case 'welcome':
        title = strings.welcome_to_hipchat;
        break;
      case 'people':
        title = strings.choose_people_to_chat;
        break;
      case 'rooms':
        title = strings.join_some_rooms;
        break;
      case 'message':
        title = strings.introduce_yourself;
        break;
    }

    return (
      <div className={this.state.current_step === 'welcome' ? 'hc-welcome-dialog-title-center' : null}>
        {title}
      </div>
    );
  },

  _dialogBody: function () {
    let content = null;

    switch (this.state.current_step) {
      case 'welcome':
        content = this._getWelcomeStep();
        break;
      case 'people':
        content = this._getPeopleStep();
        break;
      case 'rooms':
        content = this._getRoomsStep();
        break;
      case 'message':
        content = this._getMessageStep();
        break;
    }

    return (
      <div className='hc-welcome-dialog-content'>
        {content}
      </div>
    );
  },

  _dialogFooterButton: function () {
    let buttons = [],
        spinner = this._getSpinner();

    switch (this.state.current_step) {
      case 'welcome':
        if (this._isFirstPeopleItemExist()) {
          buttons = [
            this._getStartButton(),
            this._getSkipDialogButton()
          ];
        } else {
          buttons = spinner;
        }
        break;
      case 'people':
        buttons = [
          this._getNextButton(),
          this._getSkipThisStepButton()
        ];
        break;
      case 'rooms':
        buttons = [
          this._getNextButton(),
          this._getSkipThisStepButton()
        ];
        break;
      case 'message':
        buttons = [
          this._getFinishButton(),
          this._getSkipThisStepButton()
        ];
        break;
    }

    return (
      <div className="hc-welcome-footer-buttons">
        {buttons}
      </div>
    );
  },

  _getWelcomeStep: function () {
    return (
      <div>
        <div className="hc-welcome-welcome-img"></div>
        <div className="hc-welcome-welcome-text">
          <p>{strings.we_ll_help_you}</p>
          <p>{strings.this_won_t_take_long}</p>
        </div>
      </div>
    );
  },

  _getPeopleStep: function () {
    let peopleArr = _.toArray(this.state.people);

    return (
      <div>
        <p>{strings.lets_put_together_a_list_of_people}</p>
        <h6>{strings.suggestions}</h6>
        <ReactList
          itemRenderer={this._renderPeopleItem}
          length={peopleArr.length}
          selected={this.state.selected_people.length}
          people={peopleArr}
          threshold={0}
          pageSize={20}
          type='simple' />
      </div>
    );
  },

  _getRoomsStep: function () {
    let roomsArr = _.toArray(this.state.rooms),
        selectedPeopleLength = this.state.selected_people.length,
        starPhrase = selectedPeopleLength === 1 ? strings.got_that_person_down : strings.got_those_people_down(selectedPeopleLength),
        starTip = selectedPeopleLength ? <p>{this._getStarIcon()} {starPhrase}</p> : null;

    return (
      <div>
        {starTip}
        <p>{strings.weve_got_a_few_sugg_on_rooms}</p>
        <h6>{strings.suggestions}</h6>
        <ReactList
          itemRenderer={this._renderRoomsItem}
          length={roomsArr.length}
          selected={this.state.selected_rooms.length}
          rooms={roomsArr}
          threshold={0}
          pageSize={20}
          type='simple' />
      </div>
    );
  },

  _getMessageStep: function () {
    let selectedRoomsLength = this.state.selected_rooms.length,
        starPhrase = selectedRoomsLength === 1 ? strings.that_is_a_good_roome_choice : strings.those_are_some_good_roome_choices,
        starTip = selectedRoomsLength ? <p>{this._getStarIcon()} {starPhrase}</p> : null,
        infoTip = <p>{this._getInfoIcon()} {strings.use_here_in_tour_message}</p>,
        lengthError = this.state.is_welcome_message_too_long ? <p className="error">{strings.welcome_message_err(this.state.max_length_of_welcome_message)}</p> : null;

    return (
      <div>
        {starTip}
        <p>{strings.you_are_all_set}</p>
        {infoTip}
        <h6>{strings.message}</h6>
        <div className="hc-welcome-message">
          <textarea
            rows="2"
            className="textarea"
            onChange={this._onValueChange}
            value={this.state.welcome_message} />
          <div className={"hc-welcome-smiley-icon" + (selectedRoomsLength ? " star-toggled" : "")} onClick={this._onSmileyClick}>
            <span className="aui-icon hipchat-icon-small icon-emoticon">Emoticons</span>
            <Tooltip type="smiley_selector"/>
          </div>
        </div>
        {lengthError}
      </div>
    );
  },

  _onSmileyClick: function (evt) {
    var className = evt.currentTarget.className;
    if (!~className.indexOf(' selected')) {
      evt.currentTarget.className += ' selected';
    } else {
      evt.currentTarget.className = className.replace(' selected', '');
    }
    WelcomeActions.toggleTooltip({
      type: 'smiley_selector',
      data: {
        smileys: this.state.smileys
      }
    });
  },

  _renderPeopleItem: function (index, key){
    let item = _.toArray(this.state.people)[index];
    if (item.jid) {
      return <WelcomePeopleItem
                key={item.jid}
                jid={item.jid}
                name={item.name}
                title={item.title}
                user_id={item.id}
                item_index={index}
                is_selected={this.state.selected_people.indexOf(item.jid) !== -1}
                is_first_selection={this.state.is_first_selection}
                photo_url={item.photo_small}
                presence_show={item.presence.show}/>;
    }
  },

  _renderRoomsItem: function (index, key){
    let item = _.toArray(this.state.rooms)[index];
    if (item.jid) {
      return <WelcomeRoomsItem
                key={item.jid}
                jid={item.jid}
                name={item.name}
                topic={item.topic}
                privacy={item.privacy}
                type={utils.room.detect_chat_type(item.jid)}
                is_selected={this.state.selected_rooms.indexOf(item.jid) !== -1}
                avatar_url={item.avatar_url}
                all_participants = {item.participants_fetched}
                roster={this.state.roster}
                current_user_jid={this.state.current_user_jid}
                max_amount_of_people_icons={this.state.max_amount_of_people_icons}/>;
    }
  },

  _onValueChange: function (evt) {
    let maxLength = this.state.max_length_of_welcome_message;

    if (evt.target.value.length < maxLength) {
      WelcomeActions.changeWelcomeMessage(evt.target.value);
      if (this.state.is_welcome_message_too_long) {
        WelcomeActions.setIsWelcomeMessageTooLong(false);
      }
    } else {
      WelcomeActions.changeWelcomeMessage(evt.target.value.slice(0, maxLength));
      WelcomeActions.setIsWelcomeMessageTooLong(true);
    }
  },

  _getStartButton: function () {
    return (
      <button key="start_button" className="aui-button aui-button-primary" onClick={this._nextStep}>{strings.start_button}</button>
    );
  },

  _getSkipDialogButton: function () {
    return (
      <button key="skip_button" className="aui-button aui-button-link" onClick={this._skipDialog}>{strings.skip_dialog_button}</button>
    );
  },

  _getNextButton: function () {
    let nothingIsSelected = null;

    switch (this.state.current_step) {
      case 'people':
        nothingIsSelected = (this.state.selected_people.length === 0);
        break;
      case 'rooms':
        nothingIsSelected = (this.state.selected_rooms.length === 0);
        break;
    }

    return (
      <button key="next_button" className="aui-button aui-button-primary" disabled={nothingIsSelected} onClick={this._nextStep}>{strings.next_button}</button>
    );
  },

  _getSkipThisStepButton: function () {
    return (
      <button key="skip_button" className="aui-button aui-button-link" onClick={this._skipThisStep}>{strings.skip_this_step_button}</button>
    );
  },

  _getFinishButton: function () {
    let nothingIsSelected = ((this.state.selected_people.length + this.state.selected_rooms.length) === 0),
        welcomeMessageIsEmpty = (this.state.welcome_message.trim() === '');

    return (
      <button key="finish_button" className="aui-button aui-button-primary" disabled={nothingIsSelected || welcomeMessageIsEmpty} onClick={this._createChats}>{strings.finish_and_send_button}</button>
    );
  },

  _getSpinner: function () {
    return (
      <Spinner spin={true} size={"small"} spinner_class="hc-loading-spinner"/>
    );
  },

  _skipDialog: function () {
    WelcomeActions.skipDialog();
  },

  _nextStep: function () {
    let currentStepIndex = this.state.steps.indexOf(this.state.current_step),
        nextStepIndex = currentStepIndex + 1;

    WelcomeActions.nextStep(this.state.steps[nextStepIndex]);
  },

  _skipThisStep: function () {
    let currentStep = this.state.current_step,
        currentStepIndex = this.state.steps.indexOf(currentStep),
        nextStepIndex = currentStepIndex + 1;

    switch (currentStep) {
      case 'people':
        WelcomeActions.clearPeopleSelection();
        WelcomeActions.skipThisStep(this.state.steps[nextStepIndex]);
        break;
      case 'rooms':
        WelcomeActions.clearRoomsSelection();
        WelcomeActions.skipThisStep(this.state.steps[nextStepIndex]);
        break;
      case 'message':
        this._createChats(false);
        break;
    }
  },

  _createChats: function (sendMessage = true) {
    let welcomeMessage = utils.strings.stripHiddenCharacters(this.state.welcome_message.trim());

    this.state.selected_people.forEach((jid) => {
      WelcomeActions.createChats({
        jid: this.state.people[jid].jid,
        name: this.state.people[jid].name,
        type: this.state.people[jid].type
      });
      if (sendMessage) {
        WelcomeActions.sendMessage({
          text: welcomeMessage,
          jid: this.state.people[jid].jid,
          id: ChatInputStore.get('message_id'),
          active_chat_id: this.state.people[jid].id,
          chat_type: this.state.people[jid].type
        });
      }
    });

    this.state.selected_rooms.forEach((jid) => {
      WelcomeActions.createChats({
        jid: this.state.rooms[jid].jid,
        name: this.state.rooms[jid].name,
        type: this.state.rooms[jid].type
      });
      if (sendMessage) {
        WelcomeActions.sendMessage({
          text: welcomeMessage,
          jid: this.state.rooms[jid].jid,
          id: ChatInputStore.get('message_id'),
          active_chat_id: this.state.rooms[jid].id,
          chat_type: this.state.rooms[jid].type
        });
      }
    });

    WelcomeActions.closeDialog();
  },

  _isFirstPeopleItemExist: function() {
    let peopleArr = _.toArray(this.state.people);

    return peopleArr[0] && peopleArr[0].jid ? true : false;
  },

  render: function () {
    return (
      <ModalDialog dialogId="welcome-dialog"
                   title={this._dialogTitle()}
                   dialogBody={this._dialogBody}
                   dialogFooterButton={this._dialogFooterButton}
                   noCloseLink />
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/dialogs/welcome_dialog/welcome_dialog.js
 **/