import crypto from 'crypto'
import { validateEnv } from '../config/env'

const env = validateEnv()

export interface TelcellWebhookPayload {
  issuer: string
  receiverAccount: string
  amount: string
  currency: string
  orderId: string
  transactionId: string
  checksum: string
  [key: string]: string
}

export function buildTelcellRedirectUrl(
  orderId: string,
  amountAMD: number,
  description: string,
): string {
  const checksum = buildTelcellChecksum(orderId, amountAMD)
  const params = new URLSearchParams({
    issuer: env.TELCELL_MERCHANT_ID,
    amount: String(amountAMD),
    currency: 'AMD',
    product: description,
    orderId,
    checksum,
  })

  return `https://telcell.am/gateway/pay?${params.toString()}`
}

export function buildTelcellChecksum(orderId: string, amountAMD: number): string {
  const base = [
    env.TELCELL_MERCHANT_ID,
    String(amountAMD),
    'AMD',
    orderId,
    env.TELCELL_SECRET_KEY,
  ].join('')

  return crypto.createHash('md5').update(base).digest('hex').toUpperCase()
}

export function validateTelcellWebhookSignature(payload: TelcellWebhookPayload): boolean {
  const base = [
    payload.issuer,
    payload.amount,
    payload.currency,
    payload.orderId,
    env.TELCELL_SECRET_KEY,
  ].join('')

  const expected = crypto.createHash('md5').update(base).digest('hex').toUpperCase()

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(payload.checksum?.toUpperCase() ?? ''),
    )
  } catch {
    return false
  }
}
