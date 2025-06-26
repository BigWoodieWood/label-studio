// Custom commands can be executed with `cy.[command_name]`
import "./commands";

import "@cypress/code-coverage/support";

// Output spec steps
require("cypress-terminal-report/src/installLogsCollector")();

// Import commands.js using ES2015 syntax:
import './commands';

// Import coverage collection
import '@cypress/code-coverage/support';

// Import image snapshot commands
import 'cypress-image-snapshot/command';

// Import terminal report commands
import 'cypress-terminal-report/src/installLogsCollector';

// Add global types for better TypeScript support
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to select DOM element by data-testid attribute.
       * @example cy.getByTestId('greeting')
       */
      getByTestId(dataTestId: string): Chainable;
      
      /**
       * Custom command to set feature flags
       * @example cy.setFeatureFlags({ flag1: true, flag2: false })
       */
      setFeatureFlags(flags: Record<string, boolean>): Chainable;
      
      /**
       * Custom command to wait for Label Studio initialization
       * @example cy.waitForLabelStudio()
       */
      waitForLabelStudio(): Chainable;
      
      /**
       * Custom command to capture screenshot for visual testing
       * @example cy.captureScreenshot('button-state')
       */
      captureScreenshot(name: string): Chainable<Subject>;
      
      /**
       * Custom command to compare screenshot with threshold
       * @example cy.compareScreenshot('button-state', 'shouldChange', { threshold: 0.1 })
       */
      compareScreenshot(name: string, type: 'shouldMatch' | 'shouldChange', options?: { threshold?: number }): Chainable<Subject>;
    }
  }
}

// Global configuration
Cypress.config('defaultCommandTimeout', 10000);
Cypress.config('requestTimeout', 15000);
Cypress.config('responseTimeout', 15000);

// Handle uncaught exceptions that shouldn't fail tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // Add specific error patterns that are known and acceptable
  const acceptableErrors = [
    /ResizeObserver loop limit exceeded/,
    /Non-Error promise rejection captured/,
    /Script error/,
    /Network request failed/,
    /Loading chunk \d+ failed/,
    /ChunkLoadError/
  ];
  
  const errorMessage = err.message || err.toString();
  
  for (const pattern of acceptableErrors) {
    if (pattern.test(errorMessage)) {
      console.warn('Suppressed known acceptable error:', errorMessage);
      return false;
    }
  }
  
  // Log the error for debugging but don't fail the test for certain types
  if (err.name === 'ChunkLoadError' || errorMessage.includes('Loading CSS chunk')) {
    console.warn('Suppressed chunk loading error:', errorMessage);
    return false;
  }
  
  // Allow the error to fail the test for unexpected errors
  return true;
});

// Set up code coverage collection
beforeEach(() => {
  // Reset coverage collection for each test
  if (Cypress.env('coverage')) {
    cy.task('resetCoverage', null, { log: false }).then(() => {
      cy.task('seedCoverage', null, { log: false });
    });
  }
});

// After each test, save coverage
afterEach(() => {
  if (Cypress.env('coverage')) {
    cy.task('saveCoverage', null, { log: false });
  }
});

// Global test setup
beforeEach(() => {
  // Set up common viewport
  cy.viewport(1600, 900);
  
  // Set up common configuration
  if (Cypress.env('coverage')) {
    // Ensure coverage is instrumented
    cy.window().then((win) => {
      if (win.__coverage__) {
        cy.task('saveCoverage', win.__coverage__, { log: false });
      }
    });
  }
});

// Add support for running tests with feature flags
Cypress.Commands.add('setFeatureFlags', (flags: Record<string, boolean>) => {
  cy.window().then((win) => {
    if (win.APP_SETTINGS) {
      win.APP_SETTINGS.feature_flags = { ...win.APP_SETTINGS.feature_flags, ...flags };
    }
  });
});

// Add custom commands for better test writing
Cypress.Commands.add('getByTestId', (dataTestId: string) => {
  return cy.get(`[data-testid="${dataTestId}"]`);
});

Cypress.Commands.add('captureScreenshot', (name: string) => {
  return cy.matchImageSnapshot(name, {
    capture: 'viewport',
    threshold: 0.1,
    thresholdType: 'percent'
  });
});

Cypress.Commands.add('compareScreenshot', (name: string, type: 'shouldMatch' | 'shouldChange', options = {}) => {
  const defaultOptions = {
    threshold: 0.1,
    thresholdType: 'percent',
    capture: 'viewport'
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  if (type === 'shouldChange') {
    return cy.matchImageSnapshot(name, {
      ...finalOptions,
      failureThreshold: finalOptions.threshold,
      failureThresholdType: finalOptions.thresholdType
    });
  } else {
    return cy.matchImageSnapshot(name, finalOptions);
  }
});

// Additional global setup for Label Studio specific testing
Cypress.Commands.add('waitForLabelStudio', () => {
  cy.window().then((win) => {
    // Wait for Label Studio to be fully initialized
    if (win.Htx) {
      cy.wrap(null).should(() => {
        expect(win.Htx.annotationStore).to.exist;
      });
    }
  });
});

// Export types for use in tests
export {};
