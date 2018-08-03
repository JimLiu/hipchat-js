/*global twttr, HC*/
import AppDispatcher from 'dispatchers/app_dispatcher';
import appConfig from 'config/app_config';
import DeepEqualRenderMixin from 'components/mixins/deep_equal_render_mixin';

export default React.createClass({

  displayName: "TwitterStatusMessageType",

  mixins: [DeepEqualRenderMixin],

  componentWillMount: function () {
    this.onTwitterEmbedRendered = function (evt) {
      AppDispatcher.dispatch('twitter-card-rendered', {element: evt.target});
      twttr.events.unbind('rendered', this.onTwitterEmbedRendered);
    };
    this._isEmbedded = (window.HC && HC.isEmbeddedComponent) ? true : false;
    if (!this._isEmbedded && appConfig.render_twitter_cards) {
      this._debouncedTwttrLoad = _.debounce(twttr.widgets.load, 100, {leading: true, trailing: false});
      twttr.events.bind('rendered', this.onTwitterEmbedRendered);
    }
  },

  componentDidMount: function(){
    if (!this._isEmbedded && appConfig.render_twitter_cards) {
      this._debouncedTwttrLoad();
    }
  },

  componentWillUnmount: function(){
    if (!this._isEmbedded && appConfig.render_twitter_cards) {
      twttr.events.unbind('rendered', this.onTwitterEmbedRendered);
    }
  },

  render: function () {
    var tweet;
    if (this._isEmbedded || !appConfig.render_twitter_cards) {
      tweet = <div data-mid={this.props.msg.mid} className="link-wrap" dangerouslySetInnerHTML={{
        __html: (
        '<a class="linkImage" name="link" target="_blank" href="http://twitter.com/' + (this.props.msg.link_details.screen_name || this.props.msg.link_details.screenName) + '" >' +
        '<img class="twitterAvatar" height="48" width="48" src="' + (this.props.msg.link_details.profile_image_url || this.props.msg.link_details.profileImageUrl) + '" />' +
        '</a><p class="tweet">' + this.props.msg.body + '</p>' +
        '<p class="linkDesc tweet">– ' + this.props.msg.link_details.name + ' (<a target="_blank" href="http://twitter.com/' + (this.props.msg.link_details.screen_name || this.props.msg.link_details.screenName) + '" >@' + (this.props.msg.link_details.screen_name || this.props.msg.link_details.screenName) + '</a>) via ' + this.props.msg.link_details.source + '</p>'
        )
      }} />;
    } else {
      tweet = <blockquote className="twitter-tweet hidden">
        <p>{this.props.msg.body}</p>
        <a href={this.props.msg.link_details.url}>{this.props.msg.link_details.url}</a>
      </blockquote>;
    }
    return <div className="msg-line" data-mid={this.props.msg.mid}>
      {tweet}
    </div>;
  }

});


/** WEBPACK FOOTER **
 ** ./src/js/app/components/chat_window/message_types/twitter_status.js
 **/