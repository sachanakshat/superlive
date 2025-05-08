module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/api-tests'],
  testMatch: ['**/*.test.ts'],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'api-tests/**/*.ts',
    '!api-tests/**/*.d.ts',
  ],
  coverageReporters: ['text', 'json-summary', 'html'],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    ['./node_modules/jest-html-reporter', {
      pageTitle: 'SuperLive API Test Report',
      outputPath: './reports/api-test-report.html',
    }]
  ]
}; 