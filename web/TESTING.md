# Frontend Testing Framework

This document describes the unified frontend testing framework for Label Studio, which consolidates all testing approaches into a single, coherent system.

## Overview

The testing framework has been reorganized to provide:

1. **Single execution entry point** - All tests run through unified commands
2. **Consistent test format** - Standardized on Cypress for all e2e/integration tests
3. **Proper coverage collection** - Coverage reports generated for all components
4. **Clear organization** - Logical separation of test types and components

## Test Types

### Unit Tests
- **Location**: `libs/*/src/**/*.spec.ts`
- **Framework**: Jest with React Testing Library
- **Purpose**: Component logic, utilities, and isolated functionality

### Integration/E2E Tests
- **Location**: `libs/*/tests/integration/e2e/**/*.cy.ts`
- **Framework**: Cypress with custom helpers
- **Purpose**: User workflows, component interactions, and full application testing

## Quick Start

### Running All Tests
```bash
# Run all tests (unit + e2e)
yarn test:all

# Run all tests with coverage
yarn test:all:coverage

# Run tests for CI (includes coverage and parallel execution)
yarn test:ci
```

### Running Specific Test Types

#### Unit Tests
```bash
# Run all unit tests
yarn test:unit

# Run unit tests with coverage
yarn test:unit:coverage

# Run unit tests in watch mode
yarn test:unit:watch

# Run unit tests for affected projects only
yarn test:unit:affected
```

#### Integration/E2E Tests
```bash
# Run all e2e tests (headless)
yarn test:e2e

# Run e2e tests with coverage
yarn test:e2e:coverage

# Open Cypress test runner (interactive)
yarn test:e2e:open

# Run e2e tests in headed mode (see browser)
yarn test:e2e:headed

# Run e2e tests in parallel (faster for CI)
yarn test:e2e:parallel
```

#### Component-Specific Tests
```bash
# Editor component tests
yarn lsf:unit              # Unit tests
yarn test:e2e --spec "libs/editor/**"  # E2E tests

# Data Manager tests
yarn dm:unit               # Unit tests
yarn test:e2e --spec "libs/datamanager/**"  # E2E tests

# Label Studio app tests
yarn ls:unit               # Unit tests
yarn test:e2e --spec "apps/labelstudio/**"  # E2E tests
```

## Test Organization

### Directory Structure
```
web/
├── cypress.config.ts              # Unified Cypress configuration
├── libs/
│   ├── editor/
│   │   ├── src/**/*.spec.ts       # Unit tests
│   │   └── tests/
│   │       └── integration/
│   │           ├── e2e/           # Cypress e2e tests
│   │           └── data/          # Test data
│   ├── datamanager/
│   │   ├── src/**/*.spec.ts       # Unit tests
│   │   └── tests/
│   │       └── e2e/               # Cypress e2e tests
│   └── frontend-test/             # Shared test utilities
│       └── src/
│           ├── helpers/           # Cypress helpers
│           └── cypress/           # Cypress support files
└── apps/
    ├── labelstudio/
    │   └── tests/
    │       └── e2e/               # App-level e2e tests
    └── labelstudio-e2e/           # Legacy e2e tests
```

### File Naming Conventions
- Unit tests: `*.spec.ts` or `*.test.ts`
- E2E tests: `*.cy.ts`
- Test data: `*.data.ts` or `*.fixture.ts`
- Page objects: `*.page.ts`

## Writing Tests

### Unit Tests (Jest)
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

### E2E Tests (Cypress)
```typescript
import { LabelStudio, ImageView, Labels } from "@humansignal/frontend-test/helpers/LSF";

describe("Image Labeling", () => {
  it("should create rectangle annotation", () => {
    LabelStudio.params()
      .config(imageConfig)
      .data(imageData)
      .withResult([])
      .init();

    LabelStudio.waitForObjectsReady();
    ImageView.waitForImage();
    
    Labels.select("Person");
    ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.4);
    
    Sidebar.hasRegions(1);
  });
});
```

## Test Configuration

### Environment Variables
- `COLLECT_COVERAGE=true` - Enable coverage collection
- `CI=true` - Enable CI optimizations
- `HEADLESS=true` - Run in headless mode (legacy)

### Coverage Configuration
Coverage is automatically collected for:
- All TypeScript/JavaScript source files
- Excludes test files, node_modules, and build artifacts
- Generates reports in multiple formats (JSON, LCOV, HTML)

### Browser Configuration
- Default browser: Chrome
- Viewport: 1600x900
- Optimized for CI environments
- Screenshot capture on failures

## CI/CD Integration

### GitHub Actions
The framework integrates with existing GitHub Actions workflows:

1. **Unit Tests** (`tests-yarn-unit.yml`)
   - Runs all unit tests with coverage
   - Uploads coverage artifacts

2. **Integration Tests** (`tests-yarn-integration.yml`)
   - Runs Cypress tests against local server
   - Collects and uploads coverage

3. **E2E Tests** (`tests-yarn-e2e.yml`)
   - Runs full e2e tests against Label Studio backend
   - Parallel execution for performance

### Coverage Reporting
- Coverage reports are collected from all test types
- Reports are merged and uploaded to Codecov
- XML format for CI integration
- HTML reports for local development

## Migration Guide

### From CodeceptJS to Cypress

The old CodeceptJS-based e2e tests have been replaced with Cypress. Key differences:

#### Old (CodeceptJS)
```javascript
// In codecept.conf.js
Scenario('Draw rectangle', ({ I }) => {
  I.amOnPage('/');
  I.click('.rectangle-tool');
  I.drawRectangle(100, 100, 200, 200);
  I.see('1 region');
});
```

#### New (Cypress)
```typescript
// In *.cy.ts file
describe("Drawing", () => {
  it("should draw rectangle", () => {
    LabelStudio.init({ config, data });
    LabelStudio.waitForObjectsReady();
    
    ImageView.selectRectangleToolByButton();
    ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.4);
    
    Sidebar.hasRegions(1);
  });
});
```

### Command Mapping
| Old Command | New Command |
|-------------|-------------|
| `yarn lsf:e2e` | `yarn test:e2e --spec "libs/editor/**"` |
| `yarn lsf:e2e:parallel` | `yarn test:e2e:parallel` |
| `yarn lsf:integration` | `yarn test:integration` |
| `yarn test:e2e` (old) | `yarn test:all` |

## Debugging

### Local Development
```bash
# Open Cypress test runner
yarn test:e2e:open

# Run specific test file
yarn test:e2e --spec "libs/editor/tests/integration/e2e/image-labeling.cy.ts"

# Run with debug logs
DEBUG=cypress:* yarn test:e2e

# Run in headed mode to see browser
yarn test:e2e:headed
```

### CI Debugging
- Check uploaded artifacts for screenshots and videos
- Review coverage reports for missing instrumentation
- Use `cy.log()` for additional debugging output

## Best Practices

### Test Writing
1. Use descriptive test names
2. Follow the AAA pattern (Arrange, Act, Assert)
3. Use page objects and helpers for reusability
4. Keep tests independent and isolated
5. Use data-testid attributes for reliable selectors

### Performance
1. Use `cy.intercept()` to mock API calls when possible
2. Avoid `cy.wait(time)` - use state-based waiting
3. Use parallel execution for large test suites
4. Group related tests in describe blocks

### Maintenance
1. Update helpers when UI changes
2. Use shared test data and fixtures
3. Regular review and cleanup of obsolete tests
4. Monitor test execution times and flakiness

## Troubleshooting

### Common Issues

#### Coverage Not Generated
- Ensure `COLLECT_COVERAGE=true` is set
- Check that source files are properly instrumented
- Verify coverage configuration in jest/cypress configs

#### Tests Failing in CI but Passing Locally
- Check for timing issues - use proper waiting strategies
- Verify browser/environment differences
- Review CI-specific configuration

#### Slow Test Execution
- Use parallel execution where possible
- Mock external dependencies
- Optimize test setup and teardown

### Getting Help
- Check existing issues in the repository
- Review test logs and artifacts
- Consult team members familiar with the testing framework

## Contributing

When adding new tests:
1. Follow the established patterns and conventions
2. Add appropriate documentation
3. Ensure tests pass in both local and CI environments
4. Update this documentation if adding new patterns or tools