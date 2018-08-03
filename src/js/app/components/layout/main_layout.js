import Header from 'components/app_header/header';
import InlineDialogManagerMixin from 'components/mixins/inline_dialog_manager_mixin';
import ModalDialogContainer from 'components/common/modal_dialog/modal_dialog_container';
import InlineDialogContainer from 'components/common/inline_dialog/inline_dialog_container';
import ReadOnlyContainer from 'components/common/read_only/read_only_container';
import FlagsContainer from 'components/common/flags/flags_container';
import MainBodyLayout from 'components/layout/main_body_layout';
import FileViewer from 'components/common/file_viewer/file_viewer';
import Tipsify from 'components/tipsify/tipsify';
import 'stores/window_store';

export default React.createClass({

  displayName: "MainLayout",

  mixins: [InlineDialogManagerMixin],

  render () {
    return (
      <div id="page">
        <Header is_guest={this.props.is_guest} />
        <MainBodyLayout is_guest={this.props.is_guest} />
        <ModalDialogContainer />
        <InlineDialogContainer />
        <FlagsContainer />
        <FileViewer ref="fileViewer" items={this.props.files} />
        <ReadOnlyContainer />
        <Tipsify />
      </div>
    );
  }
});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/layout/main_layout.js
 **/