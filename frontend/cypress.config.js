// cypress.config.js

const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e//*.cy.{js,jsx,ts,tsx}',

    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    // These are defaults you can change for your project
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 5000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    // Custom env variables
    env: {
      apiUrl: 'http://localhost:5000/',
    },
    // Configure retries to make tests more robust
    retries: {
      runMode: 2,
      openMode: 0,
    },
    // Custom folder for storing screenshots
    screenshotsFolder: 'cypress/screenshots',
  },
});