import PureRenderMixin from 'react-addons-pure-render-mixin';
import utils from "helpers/utils";

export default React.createClass({

  displayName: "RightSideBarLink",

  propTypes: {
    url: React.PropTypes.string.isRequired,
    display_url: React.PropTypes.string.isRequired,
    name: React.PropTypes.string.isRequired,
    date: React.PropTypes.instanceOf(Date).isRequired,
    use_24hr_time: React.PropTypes.bool.isRequired
  },

  mixins: [PureRenderMixin],

  render: function(){

    var time = utils.format_time(this.props.date, this.props.use_24hr_time);

    return (
      <li className="hc-roster-item" >
        <div className="aui-nav-item" title={this.props.url}>
          <a className="hc-link" target="_blank" rel="noopener noreferrer" href={this.props.url}>{this.props.display_url}</a>
          <span className="hc-roster-user-name">{this.props.name}</span>
          <span className="hc-roster-date">{time}</span>
        </div>
      </li>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/link.js
 **/