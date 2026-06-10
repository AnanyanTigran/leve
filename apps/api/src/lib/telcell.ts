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

export type TelcellValidationResult =
  | { valid: false }
  | { valid: true; payload: TelcellWebhookPayload }

// Accepts the raw request Buffer so the body is never mutated by Fastify's
// form parser before signature verification. Parses internally after verifying.
export function validateTelcellWebhookSignature(rawBody: Buffer): TelcellValidationResult {
  const params = new URLSearchParams(rawBody.toString('utf8'))

  const payload: TelcellWebhookPayload = {
    issuer: params.get('issuer') ?? '',
    receiverAccount: params.get('receiverAccount') ?? '',
    amount: params.get('amount') ?? '',
    currency: params.get('currency') ?? '',
    orderId: params.get('orderId') ?? '',
    transactionId: params.get('transactionId') ?? '',
    checksum: params.get('checksum') ?? '',
  }

  const base = [
    payload.issuer,
    payload.amount,
    payload.currency,
    payload.orderId,
    env.TELCELL_SECRET_KEY,
  ].join('')

  const expected = crypto.createHash('md5').update(base).digest('hex').toUpperCase()
  const received = payload.checksum.toUpperCase()

  try {
    const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
    return valid ? { valid: true, payload } : { valid: false }
  } catch {
    return { valid: false }
  }
}
