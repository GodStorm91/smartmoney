import { useState, useRef, useCallback } from 'react'
import { resolvePostalCode } from '@/services/relocation-service'

/** Format raw digits as XXX-XXXX */
export function formatPostalCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 7)
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

export function usePostalCodeResolver(onCityResolved: (cityId: string) => void) {
  const [postalCode, setPostalCode] = useState('')
  const [error, setError] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePostalCodeChange = useCallback(
    (value: string) => {
      const digits = value.replace(/\D/g, '').slice(0, 7)
      setPostalCode(digits)
      setError('')

      if (timerRef.current) clearTimeout(timerRef.current)

      if (digits.length === 7) {
        timerRef.current = setTimeout(async () => {
          setIsResolving(true)
          try {
            const result = await resolvePostalCode(digits)
            if (result.matched && result.city_id != null) {
              onCityResolved(String(result.city_id))
              setShowDropdown(false)
            } else {
              setError('postalCodeNotFound')
              setShowDropdown(true)
            }
          } catch {
            setError('postalCodeNotFound')
            setShowDropdown(true)
          } finally {
            setIsResolving(false)
          }
        }, 500)
      }
    },
    [onCityResolved],
  )

  const toggleDropdown = useCallback(() => {
    setShowDropdown((prev) => !prev)
  }, [])

  return { postalCode, error, isResolving, showDropdown, handlePostalCodeChange, toggleDropdown, setShowDropdown }
}
