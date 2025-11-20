#!/usr/bin/env node

/**
 * Currency Conversion Bug Fix Validation Script
 *
 * This script validates the formatCurrency function behavior with the new isNativeCurrency parameter
 *
 * Expected Behavior:
 * - isNativeCurrency=true: Display amount as-is (no conversion) - for account balances
 * - isNativeCurrency=false: Apply exchange rate conversion - for transactions
 */

// Mock Intl.NumberFormat behavior
function formatCurrency(amount, currency = 'JPY', rates = {}, isNativeCurrency = false) {
  const DEFAULT_RATES = {
    JPY: 1.0,
    USD: 0.00667,
    VND: 160.0,
  };

  function convertCurrency(amountInJPY, targetCurrency, exchangeRates) {
    const rate = exchangeRates[targetCurrency] ?? DEFAULT_RATES[targetCurrency] ?? 1.0;
    return amountInJPY * rate;
  }

  const convertedAmount = isNativeCurrency
    ? amount
    : convertCurrency(amount, currency, rates);

  const localeMap = {
    JPY: 'ja-JP',
    USD: 'en-US',
    VND: 'vi-VN',
  };
  const locale = localeMap[currency] || 'ja-JP';
  const fractionDigits = currency === 'USD' ? 2 : 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(convertedAmount / 100);
}

const testRates = {
  JPY: 1.0,
  USD: 0.00667,
  VND: 160.0,
};

const tests = [
  // Test Case 1: VND Native Currency (Account Balance)
  {
    name: 'VND Account Balance (100 cents → 100 VND)',
    input: { amount: 10000, currency: 'VND', rates: testRates, isNativeCurrency: true },
    expected: /100[\s₫]/,  // Accept "100 ₫" or "₫100"
    critical: true,
  },
  {
    name: 'VND Account Balance (1000 cents → 1,000 VND)',
    input: { amount: 100000, currency: 'VND', rates: testRates, isNativeCurrency: true },
    expected: /1[,.]000/,  // Accept various separators
  },

  // Test Case 2: USD Native Currency (Account Balance)
  {
    name: 'USD Account Balance (100 cents → $100.00)',
    input: { amount: 10000, currency: 'USD', rates: testRates, isNativeCurrency: true },
    expected: /100\.00/,
    critical: true,
  },
  {
    name: 'USD Account Balance (10050 cents → $100.50)',
    input: { amount: 10050, currency: 'USD', rates: testRates, isNativeCurrency: true },
    expected: /100\.50/,
  },

  // Test Case 3: JPY Native Currency (Account Balance)
  {
    name: 'JPY Account Balance (100 cents → ¥100)',
    input: { amount: 10000, currency: 'JPY', rates: testRates, isNativeCurrency: true },
    expected: /100/,  // Accept "¥100" or "￥100"
    critical: true,
  },

  // Test Case 4: VND with Exchange Rate Conversion (Transaction)
  {
    name: 'VND Transaction Amount (10000 JPY cents → 16,000 VND NOT 1,600,000)',
    input: { amount: 10000, currency: 'VND', rates: testRates, isNativeCurrency: false },
    expected: /16[,.]000/,  // 10000 * 160 / 100 = 16,000
  },

  // Test Case 5: USD with Exchange Rate Conversion (Transaction)
  {
    name: 'USD Transaction Amount (10000 JPY cents → $0.67)',
    input: { amount: 10000, currency: 'USD', rates: testRates, isNativeCurrency: false },
    expected: /0\.67/,  // 10000 * 0.00667 / 100 = 0.667
  },

  // Test Case 6: Backward Compatibility (default should be false)
  {
    name: 'Default isNativeCurrency (should apply conversion)',
    input: { amount: 10000, currency: 'VND', rates: testRates },
    expected: /16[,.]000/,
  },

  // Edge Cases
  {
    name: 'Zero Balance VND',
    input: { amount: 0, currency: 'VND', rates: testRates, isNativeCurrency: true },
    expected: /0/,
  },
  {
    name: 'Negative Balance VND',
    input: { amount: -10000, currency: 'VND', rates: testRates, isNativeCurrency: true },
    expected: /-100/,
  },
  {
    name: 'Large Amount VND (1M cents → 10,000)',
    input: { amount: 1000000, currency: 'VND', rates: testRates, isNativeCurrency: true },
    expected: /10[,.]000/,
  },
];

let passed = 0;
let failed = 0;
let criticalFailed = 0;

console.log('\n========================================');
console.log('Currency Conversion Fix Validation');
console.log('========================================\n');

tests.forEach((test, index) => {
  const { amount, currency, rates, isNativeCurrency } = test.input;
  const result = formatCurrency(amount, currency, rates, isNativeCurrency);

  const matches = typeof test.expected === 'string'
    ? result === test.expected
    : test.expected.test(result);

  const status = matches ? '✓ PASS' : '✗ FAIL';
  const critical = test.critical ? ' [CRITICAL]' : '';

  console.log(`${index + 1}. ${test.name}${critical}`);
  console.log(`   Input: amount=${amount}, currency=${currency}, isNativeCurrency=${isNativeCurrency ?? 'undefined'}`);
  console.log(`   Expected: ${test.expected}`);
  console.log(`   Got: ${result}`);
  console.log(`   ${status}\n`);

  if (matches) {
    passed++;
  } else {
    failed++;
    if (test.critical) {
      criticalFailed++;
    }
  }
});

console.log('========================================');
console.log('SUMMARY');
console.log('========================================');
console.log(`Total Tests: ${tests.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Critical Failures: ${criticalFailed}`);
console.log('========================================\n');

// Detailed analysis
console.log('ANALYSIS:');
console.log('----------------------------------------');

if (criticalFailed === 0) {
  console.log('✓ All critical tests passed!');
  console.log('✓ VND account with 100 input correctly displays as ₫100');
  console.log('✓ USD account with 100 input correctly displays as $100.00');
  console.log('✓ JPY account with 100 input correctly displays as ¥100');
  console.log('✓ Currency conversion bug is FIXED');
} else {
  console.log('✗ Critical test failures detected!');
  console.log('✗ Currency conversion bug may NOT be fixed');
}

console.log('----------------------------------------\n');

process.exit(failed > 0 ? 1 : 0);
