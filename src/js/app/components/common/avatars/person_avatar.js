import AppConfig from 'config/app_config';
import PresenceIcon from 'components/common/icon/presence-icon';
import utils from 'helpers/utils';
import ConfigStore from 'stores/configuration_store';
import AvatarHelper from 'helpers/avatar_helper';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: 'PersonAvatar',

  mixins: [PureRenderMixin],

  propTypes: {
    active: React.PropTypes.bool,
    show_presence: React.PropTypes.bool,
    size: React.PropTypes.string,
    avatar_url: React.PropTypes.string,
    avatar_bg_color: React.PropTypes.string,
    text: React.PropTypes.string,
    name: React.PropTypes.string,
    uid: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]),
    shouldAnimate: React.PropTypes.bool
  },

  getDefaultProps: function () {
    return {
      active: true,
      show_presence: true,
      size: 'xsmall',
      avatar_url: '',
      avatar_bg_color: AppConfig.default_group_avatar_bg,
      text: '',
      name: '',
      uid: '',
      shouldAnimate: true,
      onClick: () => {}
    };
  },

  getInitialState() {
    return {
      src: null,
      asset_base_uri: ConfigStore.get('asset_base_uri'),
      force_default_avatar: false
    };
  },

  /*
   * NOTE: The _isMounted code here is an anti-pattern. Do not emulate this code.
   *       The utils.image.load promise below can't be cancelled when it unmounts
   *       so this is a workaround.
   */
  _isMounted: false,

  componentDidMount() {
    this._isMounted = true;
    if (this.props.avatar_url){
      utils.image.load(this.props.avatar_url, AppConfig.avatar_loading_timeout)
        .then((image) => {
          if (this._isMounted) {
            if (this.state.src !== image) {
              this.setState({
                src: image
              });
            }
            this._drawCanvas();
          }
        })
        .catch(() => {
          if (this._isMounted) {
            this.setState({
              force_default_avatar: true
            });
          }
        });
    }
  },

  componentDidUpdate() {
    this._drawCanvas();
  },

  componentWillUnmount() {
    this._isMounted = false;
  },

  _getAvatar: function () {
    if (!this.props.shouldAnimate && utils.file.is_gif(this.props.avatar_url)) {
      return <canvas className='aui-avatar-img' ref='canvas'></canvas>;
    }

    let style = {
      backgroundImage: `url(${this.props.avatar_url})`
    };

    return <span className='aui-avatar-img' style={style} />;
  },

  _drawCanvas: function () {
    let image = this.state.src;
    let canvas = this.refs.canvas;

    if (image && canvas) {
      let w = image.width;
      let h = image.height;
      let min = w;
      let x = 0;
      let y = 0;

      // maintaining aspect ratio and centering image in canvas
      if (w < h) {
        min = w;
        y = (h - min) / 2;
      } else if (h < w) {
        min = h;
        x = (w - min) / 2;
      }

      canvas.height = canvas.width = min;
      canvas.getContext('2d').drawImage(image, x, y, min, min, 0, 0, min, min);
    }
  },

  _getDefaultAvatar: function () {
    let style = {
          backgroundColor: this.props.avatar_bg_color
        },
        text = this.props.text.toUpperCase();

    if (this.props.name && !text) {
      text = AvatarHelper.getAvatarInitialsFromName(this.props.name);
    }

    if (this.state.asset_base_uri && !text){
      style.backgroundImage = `url(${this.state.asset_base_uri}assets/img/user-avatar-blue-48${(window.HC.resolution > 1) ? `@2x` : ``}.png)`;
    }

    return (
      <div className='hc-default-avatar' style={style}>
        {text}
      </div>
    );
  },

  _getStatus: function () {
    if (!this.props.show_presence) {
      return false;
    }

    return <PresenceIcon presence={this.props.presence}
                         mobile={this.props.mobile}
                         active={this.props.active}
                         uid={this.props.uid}/>;
  },

  render: function () {
    let avatar = this.props.avatar_url && !this.state.force_default_avatar ? this._getAvatar() : this._getDefaultAvatar(),
        status = this._getStatus(),
        classes = `aui-avatar aui-avatar-project aui-avatar-${this.props.size}`;

    return (
      <span className={classes} onClick={this.props.onClick}>
        <span className='aui-avatar-inner'>
          {avatar}
        </span>
        {status}
      </span>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/avatars/person_avatar.js
 **/