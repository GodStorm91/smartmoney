import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCurrencySigned, formatCurrencyCompact } from './formatCurrency'

describe('formatCurrency', () => {
  const testRates = {
    JPY: 1.0,
    USD: 0.00667,
    VND: 160.0,
  }

  describe('isNativeCurrency=true (Account balances)', () => {
    it('formats VND native currency correctly (100 cents → ₫100)', () => {
      const result = formatCurrency(10000, 'VND', testRates, true)
      expect(result).toBe('₫100')
    })

    it('formats USD native currency correctly (100 cents → $100.00)', () => {
      const result = formatCurrency(10000, 'USD', testRates, true)
      expect(result).toBe('$100.00')
    })

    it('formats JPY native currency correctly (100 cents → ¥100)', () => {
      const result = formatCurrency(10000, 'JPY', testRates, true)
      expect(result).toBe('¥100')
    })

    it('handles zero balance correctly', () => {
      expect(formatCurrency(0, 'VND', testRates, true)).toBe('₫0')
      expect(formatCurrency(0, 'USD', testRates, true)).toBe('$0.00')
      expect(formatCurrency(0, 'JPY', testRates, true)).toBe('¥0')
    })

    it('handles negative balances correctly', () => {
      expect(formatCurrency(-10000, 'VND', testRates, true)).toBe('-₫100')
      expect(formatCurrency(-10000, 'USD', testRates, true)).toBe('-$100.00')
      expect(formatCurrency(-10000, 'JPY', testRates, true)).toBe('-¥100')
    })

    it('handles large amounts correctly', () => {
      expect(formatCurrency(100000000, 'VND', testRates, true)).toBe('₫1,000,000')
      expect(formatCurrency(100000000, 'USD', testRates, true)).toBe('$1,000,000.00')
      expect(formatCurrency(100000000, 'JPY', testRates, true)).toBe('¥1,000,000')
    })
  })

  describe('isNativeCurrency=false (Transaction amounts - JPY base)', () => {
    it('converts and formats VND from JPY base (10000 JPY cents → ₫1,600,000)', () => {
      const result = formatCurrency(10000, 'VND', testRates, false)
      expect(result).toBe('₫1,600,000')
    })

    it('converts and formats USD from JPY base (10000 JPY cents → $66.70)', () => {
      const result = formatCurrency(10000, 'USD', testRates, false)
      expect(result).toBe('$66.70')
    })

    it('keeps JPY as-is (10000 JPY cents → ¥100)', () => {
      const result = formatCurrency(10000, 'JPY', testRates, false)
      expect(result).toBe('¥100')
    })
  })

  describe('default parameter (backward compatibility)', () => {
    it('defaults to isNativeCurrency=false when not provided', () => {
      const result = formatCurrency(10000, 'VND', testRates)
      expect(result).toBe('₫1,600,000') // Should apply exchange rate
    })
  })

  describe('edge cases', () => {
    it('handles fractional cents correctly for USD', () => {
      expect(formatCurrency(10050, 'USD', testRates, true)).toBe('$100.50')
      expect(formatCurrency(10099, 'USD', testRates, true)).toBe('$100.99')
    })

    it('rounds VND to no decimal places', () => {
      expect(formatCurrency(10050, 'VND', testRates, true)).toBe('₫100')
      expect(formatCurrency(10099, 'VND', testRates, true)).toBe('₫100')
    })

    it('handles missing exchange rate by using default rates', () => {
      const result = formatCurrency(10000, 'VND', {}, true)
      expect(result).toBe('₫100') // Should work even with empty rates
    })
  })
})

describe('formatCurrencySigned', () => {
  const testRates = { JPY: 1.0, USD: 0.00667, VND: 160.0 }

  it('formats income with + prefix', () => {
    expect(formatCurrencySigned(10000, 'income', 'VND', testRates, true)).toBe('+₫100')
    expect(formatCurrencySigned(10000, 'income', 'USD', testRates, true)).toBe('+$100.00')
  })

  it('formats expense with - prefix', () => {
    expect(formatCurrencySigned(10000, 'expense', 'VND', testRates, true)).toBe('-₫100')
    expect(formatCurrencySigned(10000, 'expense', 'USD', testRates, true)).toBe('-$100.00')
  })

  it('handles positive amounts without type', () => {
    expect(formatCurrencySigned(10000, undefined, 'VND', testRates, true)).toBe('+₫100')
  })

  it('handles negative amounts without type', () => {
    expect(formatCurrencySigned(-10000, undefined, 'VND', testRates, true)).toBe('-₫100')
  })

  it('respects isNativeCurrency flag', () => {
    // Native currency (no conversion)
    expect(formatCurrencySigned(10000, 'income', 'VND', testRates, true)).toBe('+₫100')

    // JPY base (with conversion)
    expect(formatCurrencySigned(10000, 'income', 'VND', testRates, false)).toBe('+₫1,600,000')
  })
})

describe('formatCurrencyCompact', () => {
  const testRates = { JPY: 1.0, USD: 0.00667, VND: 160.0 }

  it('formats large amounts compactly', () => {
    expect(formatCurrencyCompact(100000000, 'VND', testRates, true)).toMatch(/₫1/)
    expect(formatCurrencyCompact(100000000, 'USD', testRates, true)).toMatch(/\$1/)
    expect(formatCurrencyCompact(100000000, 'JPY', testRates, true)).toMatch(/¥1/)
  })

  it('respects isNativeCurrency flag', () => {
    // Native currency (no conversion)
    const native = formatCurrencyCompact(100000000, 'VND', testRates, true)
    expect(native).toContain('₫')

    // JPY base (with conversion)
    const converted = formatCurrencyCompact(100000000, 'VND', testRates, false)
    expect(converted).toContain('₫')
  })

  it('handles small amounts', () => {
    expect(formatCurrencyCompact(10000, 'VND', testRates, true)).toBe('₫100')
    expect(formatCurrencyCompact(10000, 'USD', testRates, true)).toMatch(/\$100/)
  })
})
