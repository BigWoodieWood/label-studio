#!/usr/bin/env node

/**
 * Migration script to help convert CodeceptJS tests to Cypress format
 * 
 * Usage:
 *   node scripts/migrate-codecept-to-cypress.js [input-file] [output-file]
 *   node scripts/migrate-codecept-to-cypress.js --scan-directory [directory]
 */

const fs = require('fs');
const path = require('path');

// Mapping of CodeceptJS patterns to Cypress equivalents
const MIGRATION_PATTERNS = [
  // Basic patterns
  {
    from: /Scenario\(['"`]([^'"`]+)['"`],\s*\(\s*\{\s*I\s*\}\s*\)\s*=>\s*\{/g,
    to: 'describe("$1", () => {\n  it("should work correctly", () => {'
  },
  {
    from: /Scenario\(['"`]([^'"`]+)['"`],\s*async\s*\(\s*\{\s*I\s*\}\s*\)\s*=>\s*\{/g,
    to: 'describe("$1", () => {\n  it("should work correctly", () => {'
  },
  
  // I.amOnPage -> cy.visit or LabelStudio.init
  {
    from: /I\.amOnPage\(['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.visit("$1");'
  },
  
  // I.click -> cy.get().click()
  {
    from: /I\.click\(['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.get("$1").click();'
  },
  
  // I.see -> cy.contains or cy.should
  {
    from: /I\.see\(['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.contains("$1").should("be.visible");'
  },
  
  // I.dontSee -> cy.should('not.exist')
  {
    from: /I\.dontSee\(['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.contains("$1").should("not.exist");'
  },
  
  // I.fillField -> cy.get().type()
  {
    from: /I\.fillField\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.get("$1").clear().type("$2");'
  },
  
  // I.selectOption -> cy.get().select()
  {
    from: /I\.selectOption\(['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.get("$1").select("$2");'
  },
  
  // I.checkOption -> cy.get().check()
  {
    from: /I\.checkOption\(['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.get("$1").check();'
  },
  
  // I.uncheckOption -> cy.get().uncheck()
  {
    from: /I\.uncheckOption\(['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.get("$1").uncheck();'
  },
  
  // I.waitForElement -> cy.get().should('be.visible')
  {
    from: /I\.waitForElement\(['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.get("$1").should("be.visible");'
  },
  
  // I.waitForText -> cy.contains().should('be.visible')
  {
    from: /I\.waitForText\(['"`]([^'"`]+)['"`]\);?/g,
    to: 'cy.contains("$1").should("be.visible");'
  },
  
  // I.executeScript -> cy.window().then()
  {
    from: /I\.executeScript\(([^)]+)\);?/g,
    to: 'cy.window().then((win) => { return $1; });'
  },
  
  // I.wait -> cy.wait (but recommend changing to event-based waiting)
  {
    from: /I\.wait\((\d+)\);?/g,
    to: '// TODO: Replace with event-based waiting\n    cy.wait($1);'
  }
];

// Label Studio specific patterns
const LSF_PATTERNS = [
  {
    from: /I\.executeScript\(\(\)\s*=>\s*\{\s*return\s+window\.Htx/g,
    to: 'cy.window().then((win) => { return win.Htx'
  },
  {
    from: /I\.executeScript\(\(\)\s*=>\s*window\.Htx/g,
    to: 'cy.window().then((win) => win.Htx'
  }
];

function addImports(content) {
  const imports = `import { LabelStudio, ImageView, Sidebar, Labels, Hotkeys } from "@humansignal/frontend-test/helpers/LSF";\n\n`;
  return imports + content;
}

function convertCodeceptJSToCypress(content, filename = '') {
  let converted = content;
  
  console.log(`Converting ${filename}...`);
  
  // Apply basic migration patterns
  MIGRATION_PATTERNS.forEach(pattern => {
    converted = converted.replace(pattern.from, pattern.to);
  });
  
  // Apply Label Studio specific patterns
  LSF_PATTERNS.forEach(pattern => {
    converted = converted.replace(pattern.from, pattern.to);
  });
  
  // Add TypeScript/Cypress imports
  converted = addImports(converted);
  
  // Add helpful comments
  converted = `// Migrated from CodeceptJS - Please review and update as needed
// TODO: Update to use Label Studio helpers (LabelStudio, ImageView, etc.)
// TODO: Replace I.wait() calls with proper event-based waiting
// TODO: Update selectors to use data-testid attributes where possible
// TODO: Add proper TypeScript types

${converted}`;
  
  return converted;
}

function migrateFile(inputPath, outputPath) {
  try {
    const content = fs.readFileSync(inputPath, 'utf8');
    const converted = convertCodeceptJSToCypress(content, path.basename(inputPath));
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Change extension to .cy.ts
    const finalOutputPath = outputPath.replace(/\.(js|ts)$/, '.cy.ts');
    
    fs.writeFileSync(finalOutputPath, converted, 'utf8');
    console.log(`✅ Converted: ${inputPath} -> ${finalOutputPath}`);
    
    return finalOutputPath;
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}: ${error.message}`);
    return null;
  }
}

function scanDirectory(directory) {
  const testFiles = [];
  
  function scanRecursive(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scanRecursive(filePath);
      } else if (file.endsWith('.test.js') || file.endsWith('.test.ts')) {
        testFiles.push(filePath);
      }
    });
  }
  
  scanRecursive(directory);
  return testFiles;
}

function generateMigrationReport(migrations) {
  const report = `
# CodeceptJS to Cypress Migration Report

## Files Migrated: ${migrations.length}

${migrations.map((migration, index) => `
### ${index + 1}. ${path.basename(migration.input)}
- **From:** ${migration.input}
- **To:** ${migration.output}
- **Status:** ${migration.success ? '✅ Success' : '❌ Failed'}
${migration.error ? `- **Error:** ${migration.error}` : ''}
`).join('')}

## Next Steps

1. **Review converted files** - The migration is automated but may need manual adjustments
2. **Update imports** - Add proper imports for Label Studio helpers
3. **Replace I.wait() calls** - Use event-based waiting instead of time-based waiting
4. **Update selectors** - Use data-testid attributes for more reliable selectors
5. **Add TypeScript types** - Ensure proper typing for better development experience
6. **Test the converted files** - Run the tests to ensure they work correctly

## Common Manual Updates Needed

### Replace CodeceptJS patterns with Cypress helpers:

\`\`\`typescript
// OLD (CodeceptJS)
I.amOnPage('/');
I.click('.rectangle-tool');
I.drawRectangle(100, 100, 200, 200);
I.see('1 region');

// NEW (Cypress with Label Studio helpers)
LabelStudio.params()
  .config(imageConfig)
  .data(imageData)
  .init();

LabelStudio.waitForObjectsReady();
ImageView.selectRectangleToolByButton();
ImageView.drawRectRelative(0.1, 0.1, 0.4, 0.4);
Sidebar.hasRegions(1);
\`\`\`

### Update waiting strategies:

\`\`\`typescript
// OLD
I.wait(1000);

// NEW
LabelStudio.waitForObjectsReady();
ImageView.waitForImage();
cy.get('[data-testid="loading"]').should('not.exist');
\`\`\`

## Documentation

See [TESTING.md](./TESTING.md) for the complete testing guide.
`;

  return report;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage:
  node scripts/migrate-codecept-to-cypress.js [input-file] [output-file]
  node scripts/migrate-codecept-to-cypress.js --scan-directory [directory]

Examples:
  node scripts/migrate-codecept-to-cypress.js test.js test.cy.ts
  node scripts/migrate-codecept-to-cypress.js --scan-directory libs/editor/tests/e2e/tests
`);
    return;
  }
  
  if (args[0] === '--scan-directory') {
    const directory = args[1];
    if (!directory) {
      console.error('Please provide a directory to scan');
      return;
    }
    
    if (!fs.existsSync(directory)) {
      console.error(`Directory does not exist: ${directory}`);
      return;
    }
    
    const testFiles = scanDirectory(directory);
    console.log(`Found ${testFiles.length} test files in ${directory}`);
    
    const migrations = [];
    
    testFiles.forEach(inputFile => {
      const relativePath = path.relative('libs/editor/tests/e2e/tests', inputFile);
      const outputFile = path.join('libs/editor/tests/integration/e2e', relativePath);
      
      const result = migrateFile(inputFile, outputFile);
      migrations.push({
        input: inputFile,
        output: result || outputFile,
        success: !!result,
        error: result ? null : 'Migration failed'
      });
    });
    
    // Generate migration report
    const report = generateMigrationReport(migrations);
    fs.writeFileSync('migration-report.md', report, 'utf8');
    console.log('\n📄 Migration report generated: migration-report.md');
    
  } else {
    const inputFile = args[0];
    const outputFile = args[1];
    
    if (!inputFile || !outputFile) {
      console.error('Please provide both input and output file paths');
      return;
    }
    
    if (!fs.existsSync(inputFile)) {
      console.error(`Input file does not exist: ${inputFile}`);
      return;
    }
    
    migrateFile(inputFile, outputFile);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  convertCodeceptJSToCypress,
  migrateFile,
  scanDirectory
};