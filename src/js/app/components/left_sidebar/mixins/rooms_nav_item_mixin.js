import RoomNavActions from "actions/room_nav_actions";
import utils from 'helpers/utils';

export default {

  _onDragStart: function (e) {
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('application/x-moz-node', e.currentTarget); // Required for Mozilla, breaks IE
    } catch (err) {
      e.dataTransfer.setData('text', 'IE node placeholder'); // IE only accepts 'text' or 'URL' as draggable types (but IE doesn't even care)
    }
    RoomNavActions.dragStart({
      target: e.currentTarget
    });
  },

  _onDragEnd: function () {
    RoomNavActions.dragEnd();
  },

  _onSelectTab: function (e) {
    if (e.nativeEvent.which === utils.mouseButton.middle){
      this._onCloseTab(e);
    } else if (!this.props.active) {
      RoomNavActions.select(this.props.jid, this.props.type);
    }
  },

  _onCloseTab: function () {
    RoomNavActions.close(this.props.jid, this.props.type);
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/components/left_sidebar/mixins/rooms_nav_item_mixin.js
 **/