import crypto from 'crypto'
import { validateEnv } from '../config/env'

const env = validateEnv()

export interface IdramWebhookPayload {
  EDP_MERCHANT_ID: string
  EDP_AMOUNT: string
  EDP_CURRENCY_CODE: string
  EDP_BILL_NO: string
  EDP_PAYER_ACCOUNT: string
  EDP_TRANS_ID: string
  EDP_CHECKSUM: string
  [key: string]: string
}

export function buildIdramRedirectUrl(
  orderId: string,
  amountAMD: number,
  description: string,
  callbackUrl: string,
): string {
  const checksum = buildIdramRequestChecksum(orderId, amountAMD)
  const params = new URLSearchParams({
    EDP_MERCHANT_ID: env.IDRAM_MERCHANT_ID,
    EDP_AMOUNT: String(amountAMD),
    EDP_CURRENCY_CODE: '051',
    EDP_BILL_NO: orderId,
    EDP_DESCRIPTION: description,
    EDP_LANGUAGE: 'AM',
    EDP_REC_ACCOUNT: callbackUrl,
    EDP_CHECKSUM: checksum,
  })

  return `https://banking.idram.am/Payment/GetPayment?${params.toString()}`
}

export function buildIdramRequestChecksum(orderId: string, amountAMD: number): string {
  const base = [
    env.IDRAM_MERCHANT_ID,
    String(amountAMD),
    '051',
    orderId,
    env.IDRAM_SECRET_KEY,
  ].join('')

  return crypto.createHash('md5').update(base).digest('hex').toUpperCase()
}

export function validateIdramWebhookSignature(payload: IdramWebhookPayload): boolean {
  const base = [
    payload.EDP_MERCHANT_ID,
    payload.EDP_AMOUNT,
    payload.EDP_CURRENCY_CODE,
    payload.EDP_BILL_NO,
    env.IDRAM_SECRET_KEY,
  ].join('')

  const expected = crypto.createHash('md5').update(base).digest('hex').toUpperCase()

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(payload.EDP_CHECKSUM?.toUpperCase() ?? ''),
    )
  } catch {
    return false
  }
}
