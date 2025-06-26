import { defineConfig } from "cypress";
import { addMatchImageSnapshotPlugin } from "cypress-image-snapshot/plugin";
import { nxE2EPreset } from "@nx/cypress/plugins/cypress-preset";

const COLLECT_COVERAGE = process.env.COLLECT_COVERAGE === "true" || process.env.COLLECT_COVERAGE === "1";

// Coverage plugin setup
function setupCoverage(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  if (COLLECT_COVERAGE) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("@cypress/code-coverage/task")(on, config);
    } catch (error) {
      console.warn("Coverage task setup failed:", error);
    }
  }
  
  return config;
}

export default defineConfig({
  // Global configuration
  viewportWidth: 1600,
  viewportHeight: 900,
  video: false,
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: false,
  numTestsKeptInMemory: 1,
  defaultCommandTimeout: 10000,
  requestTimeout: 15000,
  responseTimeout: 15000,
  
  // Environment variables
  env: {
    coverage: COLLECT_COVERAGE,
    codeCoverage: {
      exclude: [
        "cypress/**/*",
        "**/*.cy.ts",
        "**/*.spec.ts",
        "**/tests/**/*",
        "**/node_modules/**/*",
        "**/coverage/**/*"
      ]
    }
  },
  
  // E2E configuration
  e2e: {
    ...nxE2EPreset(__filename),
    
    // Base URL for the application
    baseUrl: 'http://localhost:3000',
    
    // Test patterns
    specPattern: [
      "libs/editor/tests/integration/e2e/**/*.cy.ts",
      "libs/datamanager/tests/e2e/**/*.cy.ts",
      "apps/labelstudio/tests/e2e/**/*.cy.ts",
      "apps/labelstudio-e2e/src/e2e/**/*.cy.ts"
    ],
    
    // Support and fixtures
    supportFile: "libs/frontend-test/src/cypress/support/e2e.ts",
    fixturesFolder: "libs/frontend-test/src/cypress/fixtures",
    
    // Output directories
    videosFolder: "dist/cypress/videos",
    screenshotsFolder: "dist/cypress/screenshots",
    downloadsFolder: "dist/cypress/downloads",
    
    setupNodeEvents(on, config) {
      // Screenshot plugin
      addMatchImageSnapshotPlugin(on, config);
      
      // Terminal logging
      require('cypress-terminal-report/src/installLogsPrinter')(on, {
        outputVerbose: false,
        includeSuccessfulHookLogs: false,
        outputRoot: config.projectRoot,
        outputTarget: {
          "cypress-logs.txt": "txt",
          "cypress-logs.json": "json"
        }
      });
      
      // Coverage setup
      setupCoverage(on, config);
      
      // Browser launch modifications
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.name === "chrome") {
          // Force sRGB color profile for consistent screenshots
          launchOptions.args.push("--force-color-profile=srgb");
          
          // Disable GPU in headless mode for CI
          if (process.env.CI) {
            launchOptions.args.push("--disable-gpu");
            launchOptions.args.push("--disable-dev-shm-usage");
            launchOptions.args.push("--no-sandbox");
          }
        }
        
        return launchOptions;
      });
      
      // Custom tasks
      on("task", {
        log(message: string) {
          console.log(message);
          return null;
        },
        
        // Task to start application servers
        startServer: async ({ command, port, timeout = 60000 }: { command: string; port: number; timeout?: number }) => {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { spawn } = require("child_process");
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const axios = require("axios");
          
          return new Promise((resolve, reject) => {
            const child = spawn("bash", ["-c", command], {
              stdio: "pipe",
              detached: true
            });
            
            let isResolved = false;
            const timeoutId = setTimeout(() => {
              if (!isResolved) {
                isResolved = true;
                child.kill("SIGTERM");
                reject(new Error(`Server failed to start within ${timeout}ms`));
              }
            }, timeout);
            
            // Check if server is ready
            const checkServer = async () => {
              try {
                await axios.get(`http://localhost:${port}`, { timeout: 1000 });
                if (!isResolved) {
                  isResolved = true;
                  clearTimeout(timeoutId);
                  resolve({ pid: child.pid });
                }
              } catch (error) {
                if (!isResolved) {
                  setTimeout(checkServer, 1000);
                }
              }
            };
            
            child.on("spawn", () => {
              setTimeout(checkServer, 2000);
            });
            
            child.on("error", (error) => {
              if (!isResolved) {
                isResolved = true;
                clearTimeout(timeoutId);
                reject(error);
              }
            });
          });
        },
        
        // Task to stop servers
        stopServer: async ({ pid }: { pid?: number }) => {
          if (pid) {
            try {
              process.kill(pid, "SIGTERM");
              return { success: true };
            } catch (error: any) {
              console.warn(`Failed to kill process ${pid}:`, error.message);
              return { success: false, error: error.message };
            }
          }
          return { success: true };
        }
      });
      
      return config;
    }
  },
  
  // Component testing (for future use)
  component: {
    devServer: {
      framework: "react",
      bundler: "webpack"
    },
    specPattern: "libs/*/src/**/*.cy.ts"
  }
});