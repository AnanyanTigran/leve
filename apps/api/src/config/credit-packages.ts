// THIS IS THE ONLY SOURCE OF TRUTH FOR PRICING.
// Never use any amount or credit count from client request bodies.

export interface CreditPackage {
  id: string
  amountAMD: number
  credits: number
}

export const CREDIT_PACKAGES: Record<string, CreditPackage> = {
  starter: {
    id: 'starter',
    amountAMD: 1000,
    credits: 5,
  },
  creator: {
    id: 'creator',
    amountAMD: 3500,
    credits: 15,
  },
  pro_monthly: {
    id: 'pro_monthly',
    amountAMD: 10000,
    credits: 999,
  },
}

export function getPackage(id: string): CreditPackage | null {
  return CREDIT_PACKAGES[id] ?? null
}
