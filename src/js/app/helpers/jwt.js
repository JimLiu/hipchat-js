const LEEWAY = 2 * 60; // 2 minutes

function now() {
  return Math.floor(Date.now() / 1000);
}

class JWT {

  static parse(token) {
    let parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error(`Invalid JWT format: ${token}`);
    }
    let jwt = JSON.parse(atob(parts[1]));
    return new JWT(jwt, token);
  }

  constructor(jwt, token) {
    this.jwt = jwt;
    this.token = token;
  }

  isExpired() {
    return now() > this.jwt.exp;
  }

  expiresSoon() {
    return now() + LEEWAY > this.jwt.exp;
  }

  getToken() {
    return this.token;
  }
}

export default JWT;


/** WEBPACK FOOTER **
 ** ./src/js/app/helpers/jwt.js
 **/