import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: 'RosterMiniExpander',

  mixins: [PureRenderMixin],

  propTypes: {
    size: React.PropTypes.string,
    hide: React.PropTypes.bool,
    total_number_of_people: React.PropTypes.number,
    number_of_people_visible: React.PropTypes.number
  },

  getDefaultProps: function () {
    return {
      size: 'small',
      hide: false,
      total_number_of_people: 0,
      number_of_people_visible: 0
    };
  },

  _getNumberToShow: function() {
    var number_to_show = Math.max(0, this.props.total_number_of_people - this.props.number_of_people_visible);
    return number_to_show > 99 ? '99+' : number_to_show.toString();
  },

  render: function () {
    if (this.props.hide) {
      return false;
    }
    if (this.props.number_of_people_visible === 0 ||
      this.props.total_number_of_people === 0) {
      return false;
    }
    if (this.props.number_of_people_visible >= this.props.total_number_of_people) {
      return false;
    }

    var classes = `aui-avatar aui-avatar-project aui-avatar-${this.props.size}`;
    return (
      <div className="hc-roster-mini-expander" data-order="expander">
        <span className={classes}>
          <span className='aui-avatar-inner'>
            <div className='hc-default-avatar'>
            { this._getNumberToShow() }
            </div>
          </span>
        </span>
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/roster_mini_expander.js
 **/