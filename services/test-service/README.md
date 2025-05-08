# SuperLive Test Service

This service contains both UI and API tests for the SuperLive platform.

## Test Types

### UI Tests
UI tests are implemented using Playwright and test the functionality of the UI service. These tests verify:
- The homepage displays correctly
- Video playback works as expected
- File upload functionality works

### API Tests
API tests use Jest with Axios to test the backend services:
- Upload Service: Tests for uploading video files
- Encoding Service: Tests for video encoding and streaming
- Catalog Service: Tests for file cataloging and downloading

## Running Tests

You can run tests from the root directory of the project:

```bash
# Install test dependencies
npm run install:test

# Run all tests
npm test

# Run just UI tests
npm run test:ui

# Run just API tests
npm run test:api

# View the test reports
npm run report
```

## Test Reports

After running tests, reports will be generated in:
- UI Tests: `playwright-report/`
- API Tests: `reports/api-test-report.html`
- Combined: `reports/combined-report.txt`

## Pre-Build Testing

The build script automatically runs tests before building, ensuring that only builds with passing tests are created. To build with tests:

```bash
npm run build:ui
```

## Sample Videos

The tests use sample videos from the `samples/` directory in the project root. Make sure this directory contains at least one video file (mp4 or mov) for tests to run properly. 