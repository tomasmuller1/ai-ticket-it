const EntornoExpo = require("jest-expo/src/preset/nativeEnvironment.js");

// El preset de Expo reemplaza fetch por el suyo, que en Jest es un stub sin red. Guardamos el de Node para
// que MSW lo intercepte (ver setup.js): así el código bajo prueba hace requests HTTP reales contra la API
// simulada, sin mockear `api/client`.
class EntornoDeTests extends EntornoExpo {
  constructor(...args) {
    super(...args);
    Object.assign(this.global, { __fetchDeNode: fetch });
  }
}

module.exports = EntornoDeTests;
