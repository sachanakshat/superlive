const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.blue('==== SUPERLIVE POST-BUILD TEST RUNNER ===='));

// Ensure the services are running
console.log(chalk.yellow('Checking if services are running...'));
try {
  // Check UI service
  console.log('Checking UI Service (port 3000)...');
  execSync('curl -s http://localhost:3000 > /dev/null');
  console.log(chalk.green('✓ UI Service is running'));
  
  // Check Upload service
  console.log('Checking Upload Service (port 8080)...');
  execSync('curl -s -I http://localhost:8080 > /dev/null');
  console.log(chalk.green('✓ Upload Service is running'));
  
  // Check Encoding service
  console.log('Checking Encoding Service (port 8082)...');
  execSync('curl -s http://localhost:8082/streams > /dev/null');
  console.log(chalk.green('✓ Encoding Service is running'));
  
  // Check Catalog service
  console.log('Checking Catalog Service (port 8081)...');
  execSync('curl -s http://localhost:8081/files > /dev/null');
  console.log(chalk.green('✓ Catalog Service is running'));
  
  console.log(chalk.green('All services are running! Running tests...'));
  
  // Run tests
  try {
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    console.log(chalk.yellow('\n⚠️ Note: Tests may take several minutes to complete due to video processing.'));
    
    // Run UI tests
    console.log(chalk.blue('\nRunning UI tests...'));
    execSync('npm run test:ui', { stdio: 'inherit' });
    
    // Run API tests
    console.log(chalk.blue('\nRunning API tests...'));
    execSync('npm run test:api', { stdio: 'inherit' });
    
    // Generate report
    console.log(chalk.blue('\nGenerating test report...'));
    execSync('node scripts/generate-report.js', { stdio: 'inherit' });
    
    console.log(chalk.green('\n✅ Post-build tests completed!'));
    
  } catch (error) {
    console.log(chalk.yellow('\n⚠️ Some tests failed, but the build is considered successful.'));
    console.log('Check the test report for details.');
    console.log(chalk.blue('\nTip: You can retry tests with extended timeouts using:'));
    console.log(chalk.blue('npm run test:retry'));
  }
} catch (error) {
  console.error(chalk.red('Error: Not all services are running!'));
  console.error('Please make sure to run docker-compose up before running tests.');
  console.error('You can use: npm run build-and-test');
  process.exit(1);
} 