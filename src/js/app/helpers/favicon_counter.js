import utils from 'helpers/utils';

class FaviconCounter {

  constructor(opt) {
    this.def = {
      bgColor: '#d00',
      textColor: '#fff',
      fontFamily: 'sans-serif', //Arial,Verdana,Times New Roman,serif,sans-serif,...
      fontStyle: 'lighter', //normal,italic,oblique,bold,bolder,lighter,100,200,300,400,500,600,700,800,900
      elementId: false
    };

    this.browser = {};
    this.browser.ff = typeof InstallTrigger !== 'undefined';
    this.browser.opera = !!window.opera || navigator.userAgent.indexOf('Opera') >= 0;

    this.readyCb = function () {
    };
    this.ready = false;

    this.opt = _.merge(this.def, opt);
    this.opt.textColor = this.hexToRgb(this.opt.textColor);

    try {
      this.orig = this.getIcon();
      this.canvas = document.createElement('canvas');
      this.img = document.createElement('img');
      if (this.orig.hasAttribute('href')) {
        this.img.onload = () => {
          this.h = (this.img.height > 0) ? this.img.height : 32;
          this.w = (this.img.width > 0) ? this.img.width : 32;
          this.canvas.height = this.h;
          this.canvas.width = this.w;
          this.context = this.canvas.getContext('2d');
          this.setReady();
        };
        this.img.setAttribute('src', this.orig.getAttribute('href'));
      } else {
        this.img.setAttribute('src', '');
        this.h = 32;
        this.w = 32;
        this.img.height = this.h;
        this.img.width = this.w;
        this.canvas.height = this.h;
        this.canvas.width = this.w;
        this.context = this.canvas.getContext('2d');
        this.setReady();
      }
    } catch (e) {
      throw 'Error initializing favico. Message: ' + e.message;
    }
  }

  setReady() {
    this.ready = true;
    this.reset();
    this.readyCb();
  }

  reset() {
    if (!this.ready || !this.context) {
      return;
    }
    this.context.clearRect(0, 0, this.w, this.h);
    this.context.drawImage(this.img, 0, 0, this.w, this.h);
    this.setIcon(this.canvas);
  }

  draw(opt) {

    if (utils.browser.is.ie() || utils.browser.is.ie_edge()){
        return;
    }

    this.ready = false;
    var img = new Image();
    img.onload = () => {
      if (!this.context) {
        return;
      }
      opt.n = (( typeof opt.n) === 'number') ? Math.abs(opt.n | 0) : opt.n;
      opt.w = this.w;
      opt.h = this.h;
      opt.len = ("" + opt.n).length;
      this.context.clearRect(0, 0, this.w, this.h);
      this.context.drawImage(img, 0, 0);
      this.context.beginPath();
      this.context.font = this.opt.fontStyle + " " + Math.floor((opt.n > 99 ? opt.h * 1.2 : opt.h * 0.55)) + "px " + this.opt.fontFamily;
      this.context.textAlign = 'center';
      this.context.fillStyle = 'rgb(' + this.opt.textColor.r + ',' + this.opt.textColor.g + ',' + this.opt.textColor.b + ')';
      if (typeof opt.n === 'number' && opt.n > this.opt.maxCount) {
        this.context.font = "bold " + Math.floor(opt.h * 0.5) + "px " + this.opt.fontFamily;
        this.context.fillText('•••', Math.floor(opt.w / 2), Math.floor(opt.h * 0.67));
      } else {
        this.context.fillText(opt.n, Math.floor(opt.w / 2), Math.floor(opt.h - opt.h * 0.34));
      }
      this.context.closePath();
      this.setIcon(this.canvas);
    };
    var svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}"><g><path fill="${opt.bgColor}" d="M29.1,28.9c-1.1-0.6-2.2-1.7-2.6-3.2c-0.1-0.3,0-0.5,0.2-0.7c3.2-2.5,5.2-6.1,5.2-10.2c0-7.5-7-13.6-15.8-13.6c-8.7,0-15.7,6.1-15.7,13.6c0,7.5,7,13.6,15.7,13.6c1.1,0,2.2-0.1,3.3-0.3c0.3-0.1,0.5,0,0.7,0.1c2.2,1.3,5.4,2.4,8.2,2.4c0.9,0,1.3-0.6,1.3-1.1C28.6,29.3-209.8,29.1,28.9z"/></g></svg>`;
    img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  badge(number, opts) {
    try {
      if (typeof (number) === 'number' ? (number > 0) : (number !== '')) {
        var q = {
          type: 'badge',
          options: {
            n: number,
            bgColor: opts.bgColor || this.opt.bgColor
          }
        };
        ['textColor'].forEach((o) => {
          if (o in opts) {
            q.options[o] = this.hexToRgb(opts[o]);
          }
        });
        ['fontStyle', 'fontFamily'].forEach(function (o) {
          if (o in opts) {
            q.options[o] = opts[o];
          }
        });
        this.draw(q.options);
      } else {
        this.reset();
      }
    } catch (e) {
      throw 'Error setting badge. Message: ' + e.message;
    }
  }

  getIcon() {
    var elm = false;
    var url = '';
    var getLink = function () {
      var link = document.getElementsByTagName('head')[0].getElementsByTagName('link');
      for (var l = link.length, i = (l - 1); i >= 0; i--) {
        if ((/(^|\s)icon(\s|$)/i).test(link[i].getAttribute('rel'))) {
          return link[i];
        }
      }
      return false;
    };
    if (this.opt.elementId) {
      elm = document.getElementById(this.opt.elementId);
      elm.setAttribute('href', elm.getAttribute('src'));
    } else {
      elm = getLink();
      if (elm === false) {
        elm = document.createElement('link');
        elm.setAttribute('rel', 'icon');
        document.getElementsByTagName('head')[0].appendChild(elm);
      }
    }
    url = (this.opt.elementId) ? elm.src : elm.href;
    if (url.substr(0, 5) !== 'data:' && url.indexOf(document.location.hostname) === -1) {
      throw new Error('Error setting favicon. Favicon image is on different domain (Icon: ' + url + ', Domain: ' + document.location.hostname + ')');
    }
    elm.setAttribute('type', 'image/png');
    return elm;
  }

  setIcon(canvas) {
    var url = canvas.toDataURL('image/png');
    if (this.opt.elementId) {
      document.getElementById(this.opt.elementId).setAttribute('src', url);
    } else {
      if (this.browser.ff || this.browser.opera) {
        var old = this.orig;
        this.orig = document.createElement('link');
        if (this.browser.opera) {
          this.orig.setAttribute('rel', 'icon');
        }
        this.orig.setAttribute('rel', 'icon');
        this.orig.setAttribute('type', 'image/png');
        document.getElementsByTagName('head')[0].appendChild(this.orig);
        this.orig.setAttribute('href', url);
        if (old.parentNode) {
          old.parentNode.removeChild(old);
        }
      } else {
        //This is because of a Chrome bug where batched repaints prevent the favicon from changing
        _.defer(() => {
          this.orig.setAttribute('href', url);
        });
      }
    }
    this.ready = true;
  }

  //http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb#answer-5624139
  //HEX to RGB convertor
  hexToRgb(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : false;
  }
}

module.exports = FaviconCounter;



/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/favicon_counter.js
 **/