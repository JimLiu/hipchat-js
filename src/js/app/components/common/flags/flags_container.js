import FlagsStore from 'stores/flags_store';
import Flag from './flag';
import VideoPopupBlockedFlag from './video_popup_blocked_flag';
import IncomingCallFlag from './incoming_call_flag';

export default React.createClass({

  displayName: 'FlagsContainer',

  componentDidMount() {
    FlagsStore.on('change', this._onChange);
  },

  componentWillUnmount() {
    FlagsStore.off('change', this._onChange);
  },

  getInitialState() {
    return FlagsStore.getAll();
  },

  _onChange() {
    this.setState(FlagsStore.getAll());
  },

  _getFlag(data, index) {
    let flag;
    switch(data.type) {
      case 'video':
        flag = <IncomingCallFlag
          ref='incoming_call_flag'
          flag_index={index}
          sender={data.sender}
          photo={data.photo}
          message={data.message}
          service={data.service}
          key={index} />;
        break;
      case 'video_popup_blocked':
        flag = <VideoPopupBlockedFlag
          title={data.title}
          body={data.body}
          close={data.close}
          promise={data.promise}
          key={index} />;
        break;
      default:
        flag = <Flag
          flag_index={index}
          {...data}
          key={index} />;
        break;
    }
    return flag;
  },

  render() {
    return (
      <div className='hc-flags-container'>
        {
          _.map(this.state.flags, (flag) => {
            return this._getFlag(flag, _.uniqueId());
          })
        }
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/flags/flags_container.js
 **/