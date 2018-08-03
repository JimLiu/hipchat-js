module.exports = React.createClass({

  displayName: "TooltipTypeUploadPreview",

  getDefaultProps: function() {
    return {
      data: {
        file: {
          src: '',
          file_type: ''
        }
      }
    };
  },

  render: function () {
    var previewMarkup = {
      image: <img className="file-preview" src={this.props.data.file.src_processed} />,
      text: <iframe className="file-preview" src={this.props.data.file.src} />,
      video: <video className="file-preview" src={this.props.data.file.src} autoPlay muted/>,
      audio: <audio className="file-preview" src={this.props.data.file.src} controls/>
    };

    return previewMarkup[this.props.data.file.file_type] || <div></div>;
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/tooltip/tooltip_types/upload_preview.js
 **/