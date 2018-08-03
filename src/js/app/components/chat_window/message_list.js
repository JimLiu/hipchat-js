import EmptyState from 'components/chat_window/empty_state';
import ChatWindowActions from 'actions/chat_window_actions';
import appConfig from 'config/app_config';
import AppDispatcher from 'dispatchers/app_dispatcher';
import PreferencesStore from "stores/preferences_store";
import IntegrationsStore from "stores/integrations_store";
import ClientPreferencesKeys from "keys/client_preferences_keys";
import PreferencesKeys from "keys/preferences_keys";
import cx from 'classnames';
import scrollEvents from 'helpers/scroll_events';
import Spinner from 'components/common/spinner/spinner';
import HistorySpinner from 'components/chat_window/history_spinner';
import ChatWindowMessages from 'components/chat_window/messages';
import utils from 'helpers/utils';
import logger from 'helpers/logger';

scrollEvents();

var PREFS_CHANGE_KEYS = [
  `change:${ClientPreferencesKeys.HIDE_GIFS_BY_DEFAULT}`,
  `change:${ClientPreferencesKeys.HIDE_ATTACHED_CARDS_BY_DEFAULT}`,
  `change:${ClientPreferencesKeys.SHOW_UNREAD_DIVIDER}`,
  `change:${PreferencesKeys.CHAT_VIEW}`,
  `change:${PreferencesKeys.THEME}`,
  `change:${PreferencesKeys.HIDE_PRESENCE_MESSAGES}`,
  `change:${PreferencesKeys.USE_24_HR_FORMAT}`,
  `change:${PreferencesKeys.NAME_DISPLAY}`,
  `change:${ClientPreferencesKeys.ANIMATED_AVATARS}`
];

export default React.createClass({

  displayName: "ChatWindowMessageList",

  getInitialState() {
    return {
      initialized: false,
      use24hrTime: PreferencesStore.shouldUse24HrTime(),
      shouldHideGifs: PreferencesStore.shouldHideGifsByDefault(),
      shouldHideAttachedCards: PreferencesStore.shouldHideAttachedCardsByDefault(),
      should_animate_avatar: PreferencesStore.shouldAnimateAvatars(),
      show_join_leave_messages: !PreferencesStore.getHidePresenceMessages(),
      chat_view: PreferencesStore.getChatView(),
      theme: PreferencesStore.getTheme(),
      showUnreadDivider: PreferencesStore.shouldShowUnreadMessageDivider(),
      nameDisplay: PreferencesStore.getNameDisplay(),
      has_scrolled_initial: false
    };
  },

  componentWillMount() {
    this._createDebounced();
  },

  componentDidUpdate() {
    if (!this.is_scrolling
      && !this.props.chat.scroll_frozen
      && !this._isHistoryEmpty()
      && !this.will_freeze
      && this.state.has_scrolled_initial) {
      this._setScroll();
    }
    else if (this.props.chat.scroll_frozen
      || this.props.chat.ancient_history_is_empty
      || this.will_freeze) {
      this.debouncedUnfreezeAbove();
    }
  },

  componentDidMount() {
    this.props.chat.isScrolledToBottom = false;
    this.should_interrupt_autoscroll = false;
    this.scroll_is_bound = false;
    this.is_animating = false;
    this.will_freeze = false;
    this.is_scrolling = false;
    this.scrollbox = ReactDOM.findDOMNode(this.refs.scrollbox);
    this.$scrollbox = $(this.scrollbox);
    this._throttledShouldSetScroll = _.throttle(this._shouldSetScroll, 100);

    AppDispatcher.register('add-chat-state-message', this._changeChatStateMessage);
    AppDispatcher.register('remove-chat-state-message', this._changeChatStateMessage);
    AppDispatcher.register('preserve-scroll-value', this._throttledShouldSetScroll);
    AppDispatcher.register('update-scroll-position', this._updateScrollPosition);
    AppDispatcher.register('select-panel', this.debouncedResize);
    AppDispatcher.register('left-column-width-updated', this.debouncedResize);
    AppDispatcher.register('right-column-width-updated', this.debouncedResize);
    AppDispatcher.register('scroll-down-on-zoom', this._onZoom); // for Mac App
    PreferencesStore.on(PREFS_CHANGE_KEYS, this._prefsChanged);
    this._handleScrollPosition();
    this._handleFrozenScroll();
    _.forEach(['click', 'mousewheel', 'DOMMouseScroll'], (event) => {
      this.scrollbox.addEventListener(event, this.debouncedOnUserAction);
    });

    $(window).on('resize', this.debouncedResize);
    $(document).on('keydown', this.debouncedKeyDown);
  },

  componentWillUnmount() {
    ChatWindowActions.setScrollValue({
      scrollTop: ReactDOM.findDOMNode(this).scrollTop,
      should_scroll_to_bottom: this.props.chat.should_scroll_to_bottom,
      isScrolledToBottom: this._isScrolledToBottom(),
      jid: this.props.chat.jid
    });
    AppDispatcher.unregister('add-chat-state-message', this._changeChatStateMessage);
    AppDispatcher.unregister('remove-chat-state-message', this._changeChatStateMessage);
    AppDispatcher.unregister('preserve-scroll-value', this._throttledShouldSetScroll);
    AppDispatcher.unregister('update-scroll-position', this._updateScrollPosition);
    AppDispatcher.unregister('select-panel', this.debouncedResize);
    AppDispatcher.unregister('left-column-width-updated', this.debouncedResize);
    AppDispatcher.unregister('right-column-width-updated', this.debouncedResize);
    AppDispatcher.unregister('scroll-down-on-zoom', this._onZoom);
    PreferencesStore.off(PREFS_CHANGE_KEYS, this._prefsChanged);
    ChatWindowActions.chatStoppedScroll(this.props.chat.jid);
    _.forEach(['click', 'mousewheel', 'DOMMouseScroll'], (event) => {
      this.scrollbox.removeEventListener(event, this.debouncedOnUserAction);
    });
    $(window).off('resize', this.debouncedResize);
    $(document).off('keydown', this.debouncedKeyDown);
    if (this.imageLoad) {
      clearTimeout(this.imageLoad);
    }
    this.debouncedUnfreezeAbove.cancel();
    this.debouncedUnfreezeBelow.cancel();
    this.debouncedFreezeAbove.cancel();
    this.debouncedFreezeBelow.cancel();
    this.debouncedResize.cancel();
    this.debouncedOnUserAction.cancel();
    this.throttledSetScrollPosition.cancel();
    this._unbindScroll();
    clearTimeout(this.imageLoadTimeout);
  },

  _onKeyDown(e){
    if (this.is_scrolling ||
      this.props.chat.scroll_frozen){
      return;
    }

    let node = this.scrollbox,
        delta;

    if (e.keyCode === utils.keyCode.PageUp && node.scrollTop > 0){
      delta = -node.offsetHeight;
    }

    if (e.keyCode === utils.keyCode.PageDown && node.scrollHeight > node.scrollTop + node.offsetHeight){
      delta = node.offsetHeight;
    }
    // Home and End buttons should be Mac specific features
    if (utils.platform.isMac()){
      if (e.keyCode === utils.keyCode.Home && node.scrollTop > 0){
        delta = -node.scrollTop;
      }

      if (e.keyCode === utils.keyCode.End && node.scrollHeight > node.scrollTop + node.offsetHeight){
        delta = node.scrollHeight - node.offsetHeight - node.scrollTop;
      }
    }

    if (delta){
      this._animationPromise(delta);
    }
  },

  _animationPromise(delta){
    logger.type('animate-scroll-position').log('delta:', delta);
    let node = this.scrollbox;

    return new Promise((resolve) => {
      this._unbindScroll();
      let duration = appConfig.chat_scroll_duration,
        originalScollTop = node.scrollTop,
        start,
        incrementValue;

      this.interruptAutoscroll();
      this.is_animating = true;

      let step = (timestamp) => {
        if (!start) {
          start = timestamp;
        }
        let progress = Math.floor(timestamp - start);
        if (progress <= duration) {
          incrementValue = (Math.cos((Math.PI * progress) / duration - Math.PI) + 1);
          node.scrollTop = originalScollTop + delta / 2 * incrementValue;
          requestAnimationFrame(step);
        } else {
          this.should_interrupt_autoscroll = false;
          this.is_animating = false;
          resolve();
        }
      };
      requestAnimationFrame(step);
    }).then(() => {
      this._checkScrollForHistoryFetch();
      this._checkScrollForScrolledToBottom();
      this._setScrollPosition();
      _.debounce(this._bindScroll, 300, {leading: false, trailing: true});
    });
  },

  _handleFrozenScroll(){
    if (this.props.chat.scroll_frozen &&
      this.props.chat.oldest_mid_before_fetch &&
      !this.props.chat.scrollTop){

      this.props.chat.scroll_frozen = false;
      this.state.has_scrolled_initial = true;

      let row = $(`[data-mid=${this.props.chat.oldest_mid_before_fetch}]`).parents('.hc-chat-row')[0];
      if (row){
        let node = ReactDOM.findDOMNode(this),
          scrollWrap = $(node).find('.scroll-wrap')[0];
        this.props.chat.scrollTop = row.getBoundingClientRect().top - scrollWrap.getBoundingClientRect().top - appConfig.frozen_scroll_offset;
        logger.type('message-list').log('Scroll to oldest element before fetch. mid:', this.props.chat.oldest_mid_before_fetch, this.props.chat.scrollTop);
      }
    }
  },

  _prefsChanged() {
    this.setState({
      shouldHideGifs: PreferencesStore.shouldHideGifsByDefault(),
      shouldHideAttachedCards: PreferencesStore.shouldHideAttachedCardsByDefault(),
      chat_view: PreferencesStore.getChatView(),
      show_join_leave_messages: !PreferencesStore.getHidePresenceMessages(),
      should_animate_avatar: PreferencesStore.shouldAnimateAvatars(),
      use24hrTime: PreferencesStore.shouldUse24HrTime(),
      nameDisplay: PreferencesStore.getNameDisplay()
    });
  },

  _handleScrollPosition() {
    if (this.isMounted()) {
      if (!this.is_scrolling && !this.is_animating) {
        if (this.props.chat.should_scroll_to_bottom) {
          this._scrollToWithoutTrigger();
        } else {
          this._setScroll();
          this._bindScroll();
        }
      }
    }
  },

  _onResize() {
    if (!this.is_scrolling && !this.is_animating) {
      if (!this._isScrolledToBottom()) {
        this._scrollToWithoutTrigger();
      } else {
        this._setScroll();
        this._bindScroll();
      }
    } else {
      this._onZoom();
    }
  },

  _onZoom() {
    this.is_scrolling = false;
    this._scrollToWithoutTrigger();
  },

  _getFirstName(){
    if (this.props.chat.name){
      return this.props.chat.name.split(' ')[0];
    }
  },

  render() {
    let composingMessageClasses = cx({
          'hidden': !this.props.chat.is_composing,
          'hc-composing-message': true,
          'hc-classic-neue': (this.state.chat_view === "classic_neue")
        }),
        showSpinner = _.isEmpty(this.props.chat.messages) && this.props.chat.fetching_ancient,
        historySpinner = this.props.chat.ancient_history_is_empty ? false : this._getHistorySpinner(),
        showEmptyState = (this.props.chat.has_no_message_history ||
            (!_.isEmpty(this.props.chat.messages) &&
            _.every(this.props.chat.messages, 'is_presence_message') && !this.state.show_join_leave_messages)) && !this.props.chat.has_been_cleared,
        panel;

    if (showSpinner) {
      panel = <div className="spinwrap">
                <Spinner spin={true} spinner_class="hc-loading-spinner medium-spinner"/>
              </div>;
    } else if (showEmptyState) {
      panel = <EmptyState jid={this.props.chat.jid}
                          type={this.props.chat.type}
                          chatName={this.props.chat.name}
                          firstName={this._getFirstName()}
                          web_server={this.props.web_server} />;
    } else {
      panel = <div className="scroll-wrap">
                  { historySpinner }

                <ChatWindowMessages
                    messages={this.props.chat.messages}
                    show_join_leave_messages={this.state.show_join_leave_messages}
                    should_animate_avatar={this.state.should_animate_avatar}
                    shouldHideGifs={this.state.shouldHideGifs}
                    shouldHideAttachedCards={this.state.shouldHideAttachedCards}
                    use24hrTime={this.state.use24hrTime}
                    showUnreadDivider={this.state.showUnreadDivider}
                    nameDisplay={this.state.nameDisplay}
                    chat_view={this.state.chat_view}
                    chat_type={this.props.chat.type}
                    chat_id={this.props.chat.id}
                    is_guest={this.props.is_guest}
                    integrationsEnabled={IntegrationsStore.get("enabled")}
                    addon_avatars={this.props.addon_avatars} />
                <div className={composingMessageClasses} ref="composing_msg">
                  {this.props.chat.name + ' is typing...'}
                </div>
              </div>;
    }

    return (
      <div className="hc-chat-scrollbox message-list" ref="scrollbox" >
        {panel}
      </div>
    );
  },

  _getHistorySpinner(){
    return (
      <div style={{display: 'none'}} ref="historySpinnerWrapper">
        <HistorySpinner />
      </div>
    );
  },

  _checkScrollForHistoryFetch() {
    if (!this.props.chat.ancient_history_is_empty && ReactDOM.findDOMNode(this).scrollTop <= 0 && !this.props.is_guest && !this.props.chat.has_been_cleared) {
      this.fetchHistory();
      return true;
    }
  },

  _checkScrollForScrolledToBottom() {
    this.props.chat.should_scroll_to_bottom = this._isScrolledToBottom();
  },

  _isScrolledToBottom() {
    var node = ReactDOM.findDOMNode(this);
    var scrollPosition = node.scrollTop + node.offsetHeight;
    return node.scrollHeight > scrollPosition - appConfig.scroll_to_bottom_offset &&
           node.scrollHeight < scrollPosition + appConfig.scroll_to_bottom_offset;
  },

  _updateScrollPosition(data){
    if (!this.props.chat.should_scroll_to_bottom && this.props.chat.scrollTop > data.offsetTop){
      this.$scrollbox.data('skipScrollStartEvent', true);
      this.props.chat.scrollTop += data.heightDiff;
    }
  },

  _setScrollPosition() {
    if (!this.props.chat.message_action_active) {
      this._checkScrollForScrolledToBottom();
    }

    var node = ReactDOM.findDOMNode(this),
        scrollVal = this.props.chat.should_scroll_to_bottom ? node.scrollHeight : node.scrollTop;
    if (!this.is_animating && !this.props.chat.scroll_frozen && this.state.has_scrolled_initial) {
      ChatWindowActions.setScrollValue({
        scrollTop: scrollVal,
        isScrolledToBottom: this._isScrolledToBottom(),
        oldestVisibleMessageMid: this._getOldestVisibleMessageMid(),
        should_scroll_to_bottom: this.props.chat.should_scroll_to_bottom,
        jid: this.props.chat.jid
      });
    }
  },

  _getOldestVisibleMessageMid() {
    return $(".msg-line:visible:first").data("mid");
  },

  _maintainScrollPosition(action, position, should_scroll_to_bottom) {
    if (!this.isMounted()) {
      return;
    } else if (should_scroll_to_bottom && action === 'unfreeze') {
      this._unbindScroll();
      $(ReactDOM.findDOMNode(this)).find('.scroll-wrap').css({
            position: 'relative',
            bottom: '',
            top: ''
          }).parent('.message-list')
            .css({
              overflowY: 'auto'
            });
      this._scrollToWithoutTrigger();
      this.props.chat.scroll_frozen = false;
      return;
    }
    var node = ReactDOM.findDOMNode(this);
    this._unbindScroll();
    var top,
        scrollWrap = $(node).find('.scroll-wrap')[0],
        bottom = scrollWrap.getBoundingClientRect().bottom - node.getBoundingClientRect().bottom;
    switch (action) {
      case 'freeze':
        if (!this.props.chat.scroll_frozen) {
          this.$scrollbox.off('scrollstart');
          this.$scrollbox.off('scrollstop');
          this.props.chat.scroll_frozen = true;
          top = node.getBoundingClientRect().top - scrollWrap.getBoundingClientRect().top;
          switch (position) {
            case 'above':
              node.scrollTop = 0;
              $(scrollWrap).css({
                position: 'absolute',
                top: '',
                bottom: -bottom
              }).parent('.message-list')
                .css({
                  overflowY: 'hidden'
                });
              break;
            case 'below':
              node.scrollTop = 0;
              $(scrollWrap).css({
                position: 'absolute',
                top: -top,
                bottom: ''
              }).parent('.message-list')
                .css({
                  overflowY: 'hidden'
                });
              break;
          }
        }
        break;
      case 'unfreeze':
        if (this.props.chat.scroll_frozen && !this.props.chat.fetching_ancient) {
          $(ReactDOM.findDOMNode(this.refs.historySpinnerWrapper)).hide();
          this.props.chat.scroll_frozen = false;
          top = scrollWrap.getBoundingClientRect().top - node.getBoundingClientRect().top;
          $(scrollWrap).css({
            position: 'relative',
            bottom: '',
            top: ''
          }).parent('.message-list')
            .css({
              overflowY: 'auto'
            });
          this._checkScrollForScrolledToBottom();
          this._scrollToWithoutTrigger(-top);
          this.props.chat.scrollTop = -top;
          this._bindScroll();
        }
        break;
    }
  },

  _createDebounced(){
    function unfreezeAbove() {
      this._maintainScrollPosition('unfreeze', 'above', this.props.chat.should_scroll_to_bottom);
    }
    function unfreezeBelow() {
      this._maintainScrollPosition('unfreeze', 'below', this.props.chat.should_scroll_to_bottom);
    }
    function freezeAbove() {
      this._maintainScrollPosition('freeze', 'above', this.props.chat.should_scroll_to_bottom);
    }
    function freezeBelow() {
      this._maintainScrollPosition('freeze', 'below', this.props.chat.should_scroll_to_bottom);
    }
    this.debouncedBindScroll = _.debounce(this._bindScroll, 300, {'leading': false, 'trailing': true});
    this.debouncedUnfreezeAbove = _.debounce(unfreezeAbove, 600, {'leading': false, 'trailing': true});
    this.debouncedUnfreezeBelow = _.debounce(unfreezeBelow, 600, {'leading': false, 'trailing': true});
    this.debouncedFreezeAbove = _.debounce(freezeAbove, 500, {'leading': true, 'trailing': false});
    this.debouncedFreezeBelow = _.debounce(freezeBelow, 500, {'leading': true, 'trailing': false});
    this.debouncedResize = _.debounce(this._onResize, 200, {leading: false, trailing: true});
    this.debouncedKeyDown = _.debounce(this._onKeyDown, 20, {leading: true, trailing: false});
    this.throttledSetScrollPosition = _.throttle(this._setScrollPosition, 50, {leading: false, trailing: true});
    this.debouncedOnUserAction = _.throttle(this._onUserAction, 200, {leading: true, trailing: true});
    this.initialized = true;
  },

  _shouldSetScroll(opts = {}) {
    if (this.isMounted()
      && !this.is_scrolling
      && !this.props.chat.scroll_frozen
      && !this._isHistoryEmpty()
      && !this.will_freeze
      && this.props.chat.should_scroll_to_bottom
      && !this._isScrolledToBottom()) {
      this._setScroll(opts);
    }
  },

  _isHistoryEmpty(){
    return this.props.chat.ancient_history_is_empty && this.props.chat.messages.length === 0;
  },

  _setScroll(opts = {}) {
    var node = ReactDOM.findDOMNode(this);
    if (!this.is_scrolling) {
      if (!this.props.chat.scroll_frozen && !this.is_animating && !this.props.chat.message_action_active) {
        if (this.props.chat.should_scroll_to_bottom) {
          if (this.state.has_scrolled_initial && opts.animation) {
            this._animateScroll();
          }
          else {
            this._scrollToWithoutTrigger();
            if (!this.state.has_scrolled_initial) {
              this.state.has_scrolled_initial = true;
              this._setScrollPosition();
            }
          }
        } else {
          this._bindScroll();
          if (!this.state.has_scrolled_initial) {
            this.state.has_scrolled_initial = true;
          }
          node.scrollTop = this.props.chat.scrollTop;
          this._setScrollPosition();
        }
      }
    }
  },

  _animateScroll(val) {
    var node = ReactDOM.findDOMNode(this);
    if (val || (this.scrollbox.scrollHeight - node.offsetHeight - node.scrollTop) > 2) {
      var promise = new Promise((resolve) => {
        this._unbindScroll();
        var duration = appConfig.chat_scroll_duration,
            scrollTo = (val || this.scrollbox.scrollHeight) - node.offsetHeight;
        this.interruptAutoscroll();
        var originalScollTop = node.scrollTop,
            delta = scrollTo - originalScollTop,
            count = 0,
            start,
            incrementValue;
        this.is_animating = true;
        var step = (timestamp) => {
          if (!start) {
            start = timestamp;
          }
          var progress = timestamp - start;
          if (progress < duration && !this.should_interrupt_autoscroll) {
            count = count + 1;
            //Ease-in-out trig function here
            incrementValue = (Math.cos((Math.PI * progress) / duration - Math.PI) + 1);
            node.scrollTop = originalScollTop + delta / 2 * incrementValue;
            requestAnimationFrame(step);
          } else {
            if (!this.should_interrupt_autoscroll && this.props.chat.should_scroll_to_bottom) {
              this._scrollToWithoutTrigger();
            }
            this.should_interrupt_autoscroll = false;
            node.scrollTop = node.scrollHeight;
            this.props.chat.should_scroll_to_bottom = true;
            this.is_animating = false;
            resolve();
          }
        };
        requestAnimationFrame(step);

      });
      promise.then(() => {
        _.debounce(this._bindScroll, 300, {leading: false, trailing: true});
      });
    }
  },

  _changeChatStateMessage(data) {
    if (this.props.chat.should_scroll_to_bottom && this.props.chat.jid === data.jid && this.props.chat.is_composing) {
      var composing_height = ReactDOM.findDOMNode(this).getBoundingClientRect().bottom - ReactDOM.findDOMNode(this.refs.composing_msg).getBoundingClientRect().top;
      if (composing_height) {
        this._animateScroll(ReactDOM.findDOMNode(this).scrollHeight - composing_height);
      }
    }
  },

  _scrollToWithoutTrigger(val) {
    if (!this.is_scrolling) {
      this._unbindScroll();
      try {
        let node = ReactDOM.findDOMNode(this);
        node.scrollTop = val || node.scrollHeight;
        this.props.chat.scrollTop = node.scrollTop;

        if(!val) {
          this.props.chat.should_scroll_to_bottom = true;
          this.props.chat.isScrolledToBottom = true;
        }

        this.$scrollbox.bind('scroll.resolver', () => {
          this.$scrollbox.unbind('scroll.resolver');
        });
      } finally {
        this.debouncedBindScroll();
      }
    }
  },

  interruptAutoscroll() {
    if (this.is_animating) {
      this.should_interrupt_autoscroll = true;
    }
  },

  _onUserAction() {
    this.should_interrupt_autoscroll = true;
    this._bindScroll();
  },

  fetchHistory() {
    if (!this.props.chat.ancient_history_is_empty) {
      this._unbindScroll();
      var spinWrap = ReactDOM.findDOMNode(this.refs.historySpinnerWrapper);
      this.props.chat.should_scroll_to_bottom = false;
      this.props.chat.scrollTop = 0;
      this.should_interrupt_autoscroll = true;
      this.will_freeze = true;
      ChatWindowActions.requestAncientHistory({
        jid: this.props.chat.jid
      });
      $(spinWrap).slideDown(200, () => {
        if (!this.props.chat.ancient_history_is_empty) {
          this.will_freeze = false;
          this.debouncedFreezeAbove();
        }
      });
    }
  },

  _chatIsScrolling() {
    ChatWindowActions.chatStartedScroll(this.props.chat.jid);
    this.is_scrolling = true;
  },

  _scrollStop() {
    logger.type('message-list').log('Scroll stop');
    this.should_interrupt_autoscroll = false;
    this.is_animating = false;
    this.is_scrolling = false;
    ChatWindowActions.chatStoppedScroll(this.props.chat.jid);
    this._checkScrollForHistoryFetch();
    this._checkScrollForScrolledToBottom();
    this._setScrollPosition();
  },

  _unbindScroll() {
    this.$scrollbox.unbind('scroll.resolver');
    if (this.scroll_is_bound) {
      this.$scrollbox.off();
      this.is_scrolling = false;
      this.scroll_is_bound = false;
    }
  },

  _bindScroll() {
    if (!this.scroll_is_bound) {
      logger.type('message-list').log('Bind scroll');
      this.$scrollbox.on('scrollstart', this._chatIsScrolling);
      this.$scrollbox.on('scrollstop', this._scrollStop);
      this.$scrollbox.on('scroll', this.throttledSetScrollPosition);
      this.scroll_is_bound = true;
    }
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_list.js
 **/