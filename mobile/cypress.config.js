const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8081",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    // Ancho de celular: la app es mobile y Expo web es solo el lugar donde se la puede automatizar.
    viewportWidth: 375,
    viewportHeight: 812,
    defaultCommandTimeout: 10_000,
    video: false,
  },
  expose: { apiUrl: "http://localhost:3000/api" },
});
