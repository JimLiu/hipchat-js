import utils from 'helpers/utils';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';

export default React.createClass({

  displayName: "TwitterUserMessageType",

  mixins: [DeepEqualRenderMixin],

  render: function () {
    return <div className="msg-line" data-mid={this.props.msg.mid}>
      <div data-mid={this.props.msg.mid} className="link-wrap" dangerouslySetInnerHTML={{
        __html: (
        '<a class="linkImage" name="link" target="_blank" href="http://twitter.com/' + (this.props.msg.link_details.screen_name || this.props.msg.link_details.screenName) + '" >' +
        '<img class="twitterAvatar" height="48" width="48" src="' + (this.props.msg.link_details.profile_image_url || this.props.msg.link_details.profileImageUrl) + '" />' +
        '</a><p class="linkDesc tweet">' + this.props.msg.link_details.name + ' (<a target="_blank" href="http://twitter.com/' + (this.props.msg.link_details.screen_name || this.props.msg.link_details.screenName) + '" >@' + (this.props.msg.link_details.screen_name || this.props.msg.link_details.screenName) + '</a>)</p>' +
        '<p class="followers">' + utils.formatNumber(this.props.msg.link_details.followers) + ' followers</p>'
        )
      }} />
    </div>;
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/twitter_user.js
 **/