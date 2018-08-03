import Header from 'components/app_header/header';
import InlineDialogManagerMixin from 'components/mixins/inline_dialog_manager_mixin';
import InlineDialogContainer from 'components/common/inline_dialog/inline_dialog_container';
import FlagsContainer from 'components/common/flags/flags_container';
import GuestBodyLayout from 'components/layout/guest_body_layout';
import FileViewer from 'components/common/file_viewer/file_viewer';
import Tipsify from 'components/tipsify/tipsify';
import 'stores/window_store';

export default React.createClass({

  displayName: "GuestLayout",

  mixins: [InlineDialogManagerMixin],

  render () {
    return (
      <div id="page">
        <Header is_guest={this.props.is_guest} />
        <GuestBodyLayout is_guest={this.props.is_guest} />
        <InlineDialogContainer is_guest={this.props.is_guest} />
        <FlagsContainer />
        <FileViewer ref="fileViewer" items={this.props.files} />
        <Tipsify />
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/layout/guest_layout.js
 **/