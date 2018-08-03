import Store from 'lib/core/store';
import AppDispatcher from 'dispatchers/app_dispatcher';
import AppConfig from 'config/app_config';
import AlertFlagModel from 'models/alert_flag_model';
import FlagActions from 'actions/flag_actions';
import utils from 'helpers/utils';
import logger from 'helpers/logger';

export const STORAGE_KEY = 'hc.read-only-dismissed';

class ReadOnlyStore extends Store {

  constructor() {
    super();
    this.local = {};
  }

  getDefaults(){
    return {
      read_only_mode: false,
      read_only_input_markdown: '',
      feature_flag_enabled: false,
      alert_flag: {},
      is_fetching: false,
      is_fetched: false,
      is_visible: false,
      is_dismissed: this.getStorage(),
      is_flag_pending: false,
      title: '',
      text: '',
      icon_url: '',
      button_text: '',
      button_url: '',
      continue_text: '',
      continue_button: 'Continue',
      questions_markdown: '',
      contact_markdown: ''
    };
  }

  registerListeners() {
    AppDispatcher.registerOnce({
      'hc-init': (config) => {
        this.handleConfig(config);
      }
    });

    AppDispatcher.register({
      'updated:config': (config) => {
        this.handleConfig(config);
      },
      'dismiss-alert-flag': () => {
        this.handleDismissAlertFlag();
      },
      'dismiss-read-only-modal': () => {
        this.handleDismissModal();
      },
      'API:fetch-read-only-content-success': (data) => {
        this.handleReadOnlyContentSuccess(data);
      },
      'API:fetch-read-only-content-failure': (error) => {
        this.handleReadOnlyContentFailure(error);
      },
      'API:fetch-alert-flag-success': (data) => {
        this.handleAlertFlagSuccess(data);
      },
      'API:fetch-alert-flag-failed': (error) => {
        this.handleAlertFlagFailure(error);
      }
    });
  }

  handleConfig(config = {}) {
    this.set({
      read_only_mode: utils.coerceBoolean(_.get(config, 'read_only_mode'), false),
      read_only_input_markdown: _.get(config, 'read_only_input_markdown', ''),
      feature_flag_enabled: _.get(config, 'feature_flags.web_client_migration_flags', false)
    });

    const { read_only_mode, is_fetching, is_fetched, is_dismissed } = this.data;
    const shouldFetch = !is_fetching && !is_fetched && !is_dismissed;

    if (read_only_mode && shouldFetch) {
      this.set({
        is_fetching: true,
        is_visible: true
      });
      setTimeout(() => {
        logger.log('[ReadOnly] Fetching interstitial content');
        AppDispatcher.dispatch('API:fetch-read-only-content');
      }, 0);
    }

    this.checkForAlertFlag(1000);
  }

  checkForAlertFlag(interval = AppConfig.alert_flag_poll_interval) {
    const flagVisible = this.data.alert_flag && this.data.alert_flag.id !== undefined;

    if (!this.data.feature_flag_enabled || this.data.is_flag_pending || flagVisible) {
      return;
    }

    logger.log('[ReadOnly] Checking for Alert Flag in %sms', interval);
    clearTimeout(this.local.timer);
    this.set({
      is_flag_pending: true
    });
    this.local.timer = setTimeout(() => {
      AppDispatcher.dispatch('API:fetch-alert-flag');
    }, interval);
  }

  handleAlertFlagSuccess(data) {
    logger.log('[ReadOnly] Alert Flag fetch success', data);

    this.set({
      is_flag_pending: false
    });

    if (!data || data.id === undefined) {
      logger.log('[ReadOnly] Alert Flag response included no or malformed data; will retry...');
      this.checkForAlertFlag();
      return;
    }

    const flagId = this.data.alert_flag ? this.data.alert_flag.id : undefined;
    const flagVisible = flagId !== undefined;
    if (!this.data.feature_flag_enabled || flagVisible) {
      logger.log('[ReadOnly] Alert Flag already displayed. id: %s', flagId);
      return;
    }

    const alert_flag = new AlertFlagModel(data);
    this.set({
      alert_flag
    });
    AppDispatcher.dispatch('show-flag', {
      ...alert_flag,
      close: 'manual',
      onClose: () => {
        FlagActions.dismissAlertFlag();
      }
    });
  }

  handleAlertFlagFailure(error) {
    logger.log('[ReadOnly] Alert Flag fetch failure', error);
    this.set({
      is_flag_pending: false
    });
    this.checkForAlertFlag();
  }

  handleDismissAlertFlag() {
    const { id } = this.data.alert_flag;
    if (id === undefined) {
      return;
    }
    logger.log('[ReadOnly] Dismissing Alert Flag', id);
    AppDispatcher.dispatch('API:dismiss-alert-flag', { id });
    this.set({
      alert_flag: {}
    });
    this.checkForAlertFlag();
  }

  handleReadOnlyContentSuccess(data) {
    logger.log('[ReadOnly] Interstitial content fetch success', data);
    this.set({
      is_fetching: false,
      is_fetched: true,
      is_visible: this.data.is_dismissed ? false : true,
      ...data
    });
  }

  handleReadOnlyContentFailure(error) {
    logger.log('[ReadOnly] Interstitial content fetch failure', error);
    this.set({
      is_fetching: false,
      is_fetched: true,
      is_visible: false
    });
  }

  handleDismissModal() {
    logger.log('[ReadOnly] Dismiss interstitial');
    this.setStorage();
    this.set({
      is_visible: false,
      is_dismissed: true
    });
  }

  getStorage(key) {
    return window.localStorage.getItem(STORAGE_KEY) ? true : false;
  }

  setStorage(key, val) {
    return window.localStorage.setItem(STORAGE_KEY, 1);
  }

}

export default new ReadOnlyStore();



/** WEBPACK FOOTER **
 ** ./src/js/app/stores/read_only_store.js
 **/