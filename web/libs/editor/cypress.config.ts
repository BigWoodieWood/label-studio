import configure from "@humansignal/frontend-test/configure";

export default configure((defaultConfig) => ({
  ...defaultConfig,
  e2e: {
    ...defaultConfig.e2e,
    specPattern: "tests/integration/**/*.only.cy.{js,jsx,ts,tsx}",
  },
}));
