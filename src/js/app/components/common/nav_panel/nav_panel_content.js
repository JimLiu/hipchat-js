module.exports = React.createClass({

  displayName: "NavPanelContent",

  _getTitle: function () {
    var title;
    if (this.props.lozenge_text) {
      title = (
        <h2>
          {this.props.name}
          <span className="aui-lozenge aui-lozenge-current">{this.props.lozenge_text}</span>
        </h2>
      );
    } else {
      title = <h2>{this.props.name}</h2>;
    }
    return title;
  },

  render: function() {
    var title = this._getTitle();

    return (
      <div className="nav-panel-content" aria-hidden={!this.props.selected} aria-labeledby={this.props.tabId}>
        {title}
        {this.props.children}
      </div>
    );
  }
});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/nav_panel/nav_panel_content.js
 **/