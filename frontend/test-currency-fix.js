/**
 * Manual Test Script for Currency Conversion Bug Fix
 *
 * Tests the fix where VND account with 100 input should display as ₫100 (not ₫1,678,700)
 *
 * Run with: node test-currency-fix.js
 */

const puppeteer = require('puppeteer');

// Test configuration
const BASE_URL = 'http://localhost:5175';
const ACCOUNTS_URL = `${BASE_URL}/accounts`;

// Test results
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '   ',
    success: '✓',
    error: '✗',
    warning: '⚠'
  }[type];

  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCase1_VND_Account(page) {
  log('Test Case 1: VND Account Creation', 'info');

  try {
    // Navigate to accounts page
    await page.goto(ACCOUNTS_URL, { waitUntil: 'networkidle2' });
    await delay(1000);

    // Click "Create Account" button
    const createButton = await page.waitForSelector('button:has-text("Create Account"), button:has-text("create"), button:has-text("Add")');
    if (!createButton) {
      throw new Error('Create Account button not found');
    }
    await createButton.click();
    await delay(500);

    // Fill in account details
    await page.type('input#name', 'Test VND Account');

    // Select VND currency
    const currencySelect = await page.waitForSelector('select#currency');
    await currencySelect.select('VND');

    // Input initial balance: 100 (expecting display of ₫100)
    const balanceInput = await page.waitForSelector('input#initialBalance');
    await balanceInput.click({ clickCount: 3 }); // Select all
    await balanceInput.type('100');

    // Set initial balance date
    const dateInput = await page.waitForSelector('input#initialBalanceDate');
    await dateInput.type('2025-11-19');

    // Submit form
    const submitButton = await page.waitForSelector('button[type="submit"]');
    await submitButton.click();

    // Wait for modal to close and account to be created
    await delay(2000);

    // Find the newly created account card
    const accountCards = await page.$$('[class*="Card"]');
    let foundCorrectDisplay = false;
    let actualDisplay = null;

    for (const card of accountCards) {
      const text = await card.evaluate(el => el.textContent);
      if (text.includes('Test VND Account')) {
        actualDisplay = text;
        // Check if display shows ₫100 (correct) and not ₫1,678,700 or similar (incorrect)
        if (text.includes('₫100') && !text.includes('₫1,678,700') && !text.includes('₫16,000')) {
          foundCorrectDisplay = true;
          log('✓ VND account displays correct amount: ₫100', 'success');
          testResults.passed.push('Test Case 1: VND Account shows ₫100 correctly');
        }
        break;
      }
    }

    if (!foundCorrectDisplay) {
      throw new Error(`VND account shows incorrect amount. Actual display: ${actualDisplay}`);
    }

    return true;
  } catch (error) {
    log(`✗ Test Case 1 Failed: ${error.message}`, 'error');
    testResults.failed.push(`Test Case 1: ${error.message}`);
    return false;
  }
}

async function testCase2_USD_Account(page) {
  log('Test Case 2: USD Account Creation', 'info');

  try {
    await page.goto(ACCOUNTS_URL, { waitUntil: 'networkidle2' });
    await delay(1000);

    // Click "Create Account" button
    const createButton = await page.waitForSelector('button:has-text("Create Account"), button:has-text("create"), button:has-text("Add")');
    await createButton.click();
    await delay(500);

    // Fill in account details
    await page.type('input#name', 'Test USD Account');

    // Select USD currency
    const currencySelect = await page.waitForSelector('select#currency');
    await currencySelect.select('USD');

    // Input initial balance: 100 (expecting display of $100.00)
    const balanceInput = await page.waitForSelector('input#initialBalance');
    await balanceInput.click({ clickCount: 3 });
    await balanceInput.type('100');

    // Set initial balance date
    const dateInput = await page.waitForSelector('input#initialBalanceDate');
    await dateInput.type('2025-11-19');

    // Submit form
    const submitButton = await page.waitForSelector('button[type="submit"]');
    await submitButton.click();

    await delay(2000);

    // Find the newly created account card
    const accountCards = await page.$$('[class*="Card"]');
    let foundCorrectDisplay = false;
    let actualDisplay = null;

    for (const card of accountCards) {
      const text = await card.evaluate(el => el.textContent);
      if (text.includes('Test USD Account')) {
        actualDisplay = text;
        // Check if display shows $100.00 (correct) and not $66.70 or $0.67 (incorrect)
        if (text.includes('$100.00') && !text.includes('$66.70') && !text.includes('$0.67')) {
          foundCorrectDisplay = true;
          log('✓ USD account displays correct amount: $100.00', 'success');
          testResults.passed.push('Test Case 2: USD Account shows $100.00 correctly');
        }
        break;
      }
    }

    if (!foundCorrectDisplay) {
      throw new Error(`USD account shows incorrect amount. Actual display: ${actualDisplay}`);
    }

    return true;
  } catch (error) {
    log(`✗ Test Case 2 Failed: ${error.message}`, 'error');
    testResults.failed.push(`Test Case 2: ${error.message}`);
    return false;
  }
}

async function testCase3_JPY_Account(page) {
  log('Test Case 3: JPY Account Creation (Regression)', 'info');

  try {
    await page.goto(ACCOUNTS_URL, { waitUntil: 'networkidle2' });
    await delay(1000);

    // Click "Create Account" button
    const createButton = await page.waitForSelector('button:has-text("Create Account"), button:has-text("create"), button:has-text("Add")');
    await createButton.click();
    await delay(500);

    // Fill in account details
    await page.type('input#name', 'Test JPY Account');

    // JPY should be default or select it
    const currencySelect = await page.waitForSelector('select#currency');
    await currencySelect.select('JPY');

    // Input initial balance: 100 (expecting display of ¥100)
    const balanceInput = await page.waitForSelector('input#initialBalance');
    await balanceInput.click({ clickCount: 3 });
    await balanceInput.type('100');

    // Set initial balance date
    const dateInput = await page.waitForSelector('input#initialBalanceDate');
    await dateInput.type('2025-11-19');

    // Submit form
    const submitButton = await page.waitForSelector('button[type="submit"]');
    await submitButton.click();

    await delay(2000);

    // Find the newly created account card
    const accountCards = await page.$$('[class*="Card"]');
    let foundCorrectDisplay = false;
    let actualDisplay = null;

    for (const card of accountCards) {
      const text = await card.evaluate(el => el.textContent);
      if (text.includes('Test JPY Account')) {
        actualDisplay = text;
        // Check if display shows ¥100 (correct)
        if (text.includes('¥100') && !text.includes('¥1,')) {
          foundCorrectDisplay = true;
          log('✓ JPY account displays correct amount: ¥100', 'success');
          testResults.passed.push('Test Case 3: JPY Account shows ¥100 correctly (no regression)');
        }
        break;
      }
    }

    if (!foundCorrectDisplay) {
      throw new Error(`JPY account shows incorrect amount. Actual display: ${actualDisplay}`);
    }

    return true;
  } catch (error) {
    log(`✗ Test Case 3 Failed: ${error.message}`, 'error');
    testResults.failed.push(`Test Case 3: ${error.message}`);
    return false;
  }
}

async function runTests() {
  log('Starting Currency Conversion Bug Fix Tests', 'info');
  log(`Testing at: ${BASE_URL}`, 'info');

  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Run test cases
    await testCase1_VND_Account(page);
    await delay(1000);

    await testCase2_USD_Account(page);
    await delay(1000);

    await testCase3_JPY_Account(page);
    await delay(1000);

    // Print summary
    log('\n========== TEST SUMMARY ==========', 'info');
    log(`Passed: ${testResults.passed.length}`, 'success');
    log(`Failed: ${testResults.failed.length}`, 'error');
    log(`Warnings: ${testResults.warnings.length}`, 'warning');

    if (testResults.passed.length > 0) {
      log('\nPassed Tests:', 'success');
      testResults.passed.forEach(test => log(`  ✓ ${test}`, 'success'));
    }

    if (testResults.failed.length > 0) {
      log('\nFailed Tests:', 'error');
      testResults.failed.forEach(test => log(`  ✗ ${test}`, 'error'));
    }

    if (testResults.warnings.length > 0) {
      log('\nWarnings:', 'warning');
      testResults.warnings.forEach(test => log(`  ⚠ ${test}`, 'warning'));
    }

    log('==================================\n', 'info');

  } catch (error) {
    log(`Test execution error: ${error.message}`, 'error');
  } finally {
    await browser.close();
  }

  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Check if puppeteer is available
(async () => {
  try {
    await runTests();
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      log('Puppeteer not found. Please install it with: npm install puppeteer', 'error');
      log('Manual testing instructions will be provided instead.', 'info');
      process.exit(1);
    } else {
      throw error;
    }
  }
})();
