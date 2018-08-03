import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';
import Card from './card';

export default React.createClass({

  displayName: "LinkMessageType",

  mixins: [DeepEqualRenderMixin],

  render: function () {

    var data = _.clone(this.props.msg.link_details);
    data.icon = data.favicon_url || (data.icon && data.icon.url);
    data.description = data.desc || data.description;
    data.url = data.id = data.full_url || data.url;
    data.title = data.header_text || data.title;
    data.style = 'link';

    return <Card {...data} show_always="true"/>;
  },

  _getHostname: function(url) {
    var link = document.createElement('a');
    link.href = url;
    return link.hostname;
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/link.js
 **/