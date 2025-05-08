const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('==== SUPERLIVE EXTENDED TIMEOUT TEST RUNNER ===='));
console.log(chalk.yellow('Running tests with extended timeouts...'));

try {
  console.log(chalk.blue('\nRunning API tests with extended timeouts...'));
  process.env.JEST_TIMEOUT = '60000'; // Set extended timeouts for Jest
  execSync('npm run test:api', { stdio: 'inherit', env: {...process.env} });
  
  console.log(chalk.blue('\nRunning UI tests with extended timeouts...'));
  process.env.PLAYWRIGHT_TIMEOUT = '120000'; // Set extended timeouts for Playwright
  execSync('npm run test:ui', { stdio: 'inherit', env: {...process.env} });
  
  console.log(chalk.green('\n✅ Extended timeout tests completed!'));
} catch (error) {
  console.log(chalk.red('\n❌ Some tests still failed even with extended timeouts.'));
  console.log('Check the test report for details or examine your services for performance issues.');
  process.exit(1);
} 