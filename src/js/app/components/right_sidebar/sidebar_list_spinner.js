import Spinner from 'components/common/spinner/spinner';
import PureRenderMixin from 'react-addons-pure-render-mixin';

export default React.createClass({

  displayName: 'SidebarListSpinner',

  mixins: [PureRenderMixin],

  render() {
    return <li className="hc-roster-item hc-spinner-item" style={{height: this.props.height}}>
              <Spinner key={this.props.key} size="small" spin={true} zIndex={1} />
           </li>;
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/right_sidebar/sidebar_list_spinner.js
 **/