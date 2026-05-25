export function getSession() {
  if (typeof window === 'undefined') return null
  try {
    return {
      isVerified: sessionStorage.getItem('leve_verified') === 'true',
      freeCredits: parseInt(sessionStorage.getItem('leve_free_credits') || '0'),
      paidCredits: parseInt(sessionStorage.getItem('leve_paid_credits') || '0'),
      category: sessionStorage.getItem('leve_category') || null,
      templateId: sessionStorage.getItem('leve_template_id') || null,
    }
  } catch {
    return null
  }
}

export function setVerified(contact: string, method: string) {
  sessionStorage.setItem('leve_verified', 'true')
  sessionStorage.setItem('leve_contact', contact)
  sessionStorage.setItem('leve_auth_method', method)
  sessionStorage.setItem('leve_free_credits', '2')
}

export function isVerified(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem('leve_verified') === 'true'
  } catch {
    return false
  }
}

export function getBrandName(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('leve_brand_name')
}

export function setBrandNameLocal(name: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('leve_brand_name', name)
}
