const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const outputFile = path.join(reportsDir, 'combined-report.txt');

// Read API test results
try {
  const apiCoveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
  const uiReportPath = path.join(__dirname, '..', 'playwright-report', 'results.json');
  
  let apiTestsPassed = true;
  let apiTestResults = {};
  let uiTestResults = { passed: 0, failed: 0, tests: [] };
  
  // Check if API test results exist
  if (fs.existsSync(apiCoveragePath)) {
    const apiCoverage = JSON.parse(fs.readFileSync(apiCoveragePath, 'utf8'));
    apiTestResults = {
      total: apiCoverage.total.lines.total,
      covered: apiCoverage.total.lines.covered,
      percentage: apiCoverage.total.lines.pct
    };
  } else {
    console.warn(chalk.yellow('API coverage report not found. API tests may have failed.'));
    apiTestsPassed = false;
  }
  
  // Check if UI test results exist
  if (fs.existsSync(uiReportPath)) {
    const uiReport = JSON.parse(fs.readFileSync(uiReportPath, 'utf8'));
    
    if (uiReport.suites && uiReport.suites.length > 0) {
      // Process Playwright report data
      uiReport.suites.forEach(suite => {
        if (suite.specs) {
          suite.specs.forEach(spec => {
            spec.tests.forEach(test => {
              const passed = test.results.every(result => result.status === 'passed');
              uiTestResults.tests.push({
                name: test.title,
                status: passed ? 'PASS' : 'FAIL',
                suiteName: suite.title
              });
              
              if (passed) {
                uiTestResults.passed++;
              } else {
                uiTestResults.failed++;
              }
            });
          });
        }
      });
    }
  } else {
    console.warn(chalk.yellow('UI test report not found. UI tests may have failed.'));
  }
  
  // Generate combined report
  let report = '===== SUPERLIVE TEST REPORT (POST-BUILD) =====\n\n';
  
  report += '🧪 API TESTS\n';
  report += '-------------\n';
  if (apiTestsPassed) {
    report += `Coverage: ${apiTestResults.covered}/${apiTestResults.total} lines (${apiTestResults.percentage}%)\n\n`;
  } else {
    report += 'API tests failed or did not run successfully.\n\n';
  }
  
  report += '🖥️ UI TESTS\n';
  report += '------------\n';
  report += `Total: ${uiTestResults.passed + uiTestResults.failed}\n`;
  report += `Passed: ${uiTestResults.passed}\n`;
  report += `Failed: ${uiTestResults.failed}\n\n`;
  
  if (uiTestResults.tests.length > 0) {
    report += 'Test Results:\n';
    
    // Group tests by suite
    const testsBySuite = {};
    uiTestResults.tests.forEach(test => {
      if (!testsBySuite[test.suiteName]) {
        testsBySuite[test.suiteName] = [];
      }
      testsBySuite[test.suiteName].push(test);
    });
    
    // Output grouped tests
    Object.keys(testsBySuite).forEach(suiteName => {
      report += `\n  ${suiteName}:\n`;
      testsBySuite[suiteName].forEach(test => {
        const statusColor = test.status === 'PASS' ? chalk.green(test.status) : chalk.red(test.status);
        report += `    ${statusColor} | ${test.name}\n`;
      });
    });
  }
  
  // Write report to file
  fs.writeFileSync(outputFile, report);
  console.log(chalk.green('Post-build test report generated:'), outputFile);
  console.log(report);
  
  // Return appropriate exit code but don't fail the build
  if (apiTestsPassed && uiTestResults.failed === 0) {
    console.log(chalk.green('All tests passed after build!'));
  } else {
    console.log(chalk.yellow('Some tests failed after build. Check the report for details.'));
  }
  process.exit(0); // Always exit with success so build isn't affected
} catch (error) {
  console.error(chalk.red('Error generating test report:'), error);
  process.exit(0); // Exit with success to not fail the build
} 