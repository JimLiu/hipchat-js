import logger from 'helpers/logger';

const X = Symbol('X');
const Y = Symbol('Y');
const REAL_X = Symbol('realX');
const REAL_Y = Symbol('realY');

export default {

  track(){
    const debouncedSave = _.debounce(this._save.bind(this), 20, {leading: true, trailing: true});
    document.addEventListener("mouseover", debouncedSave);
    document.addEventListener("mousemove", debouncedSave);
  },

  _save({ pageX, pageY }){
    this[REAL_X] = pageX;
    this[REAL_Y] = pageY;
    logger.type('mouse-position').withFilter().info('Real mouse position has changed:', pageX, pageY);
  },

  useLatest(){
    this[X] = this[REAL_X];
    this[Y] = this[REAL_Y];
  },

  hasChanged({ pageX, pageY }){
    if (this[X] !== pageX || this[Y] !== pageY){
      this[X] = pageX;
      this[Y] = pageY;
      logger.type('mouse-position').withFilter().info('Mouse position has changed:', pageX, pageY);
      return true;
    }
    return false;
  },

  get x(){
    return this[X];
  },

  get y(){
    return this[Y];
  },

  get realX(){
    return this[REAL_X];
  },

  get realY(){
    return this[REAL_Y];
  }
};


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/mouse_position.js
 **/