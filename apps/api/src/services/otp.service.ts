import bcrypt from 'bcryptjs'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'
import { validateEnv } from '../config/env'

const env = validateEnv()

const OTP_EXPIRY_SECONDS = 60 * 10      // 10 minutes
const OTP_MAX_ATTEMPTS = 5
const OTP_RATE_LIMIT_MAX = 3            // sends per identifier per hour
const OTP_RATE_LIMIT_WINDOW = 3600
const IP_RATE_LIMIT_MAX = 10            // sends per IP per hour
const BCRYPT_ROUNDS = 10

function generateOtpCode(): string {
  // Cryptographically random 6-digit code
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  const value = array[0] ?? 0
  return String(value % 1000000).padStart(6, '0')
}

function otpRateLimitKey(identifier: string): string {
  return `ratelimit:otp:${identifier}`
}

function ipRateLimitKey(ip: string): string {
  return `ratelimit:otp:ip:${ip}`
}

export function validateIdentifier(
  identifier: string,
  type: 'phone' | 'email',
): { valid: boolean; normalized?: string } {
  if (type === 'phone') {
    try {
      if (!isValidPhoneNumber(identifier)) return { valid: false }
      const parsed = parsePhoneNumber(identifier)
      return { valid: true, normalized: parsed.format('E.164') }
    } catch {
      return { valid: false }
    }
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(identifier)) return { valid: false }
    return { valid: true, normalized: identifier.toLowerCase().trim() }
  }
}

export async function sendOtp(
  identifier: string,
  identifierType: 'phone' | 'email',
  sessionId: string,
  ipAddress: string,
): Promise<{ sent: boolean; error?: string }> {
  // Rate limit by identifier
  const identifierCount = await redis.incr(otpRateLimitKey(identifier))
  if (identifierCount === 1) await redis.expire(otpRateLimitKey(identifier), OTP_RATE_LIMIT_WINDOW)
  if (identifierCount > OTP_RATE_LIMIT_MAX) {
    return { sent: false, error: 'rate_limit_exceeded' }
  }

  // Rate limit by IP
  const ipCount = await redis.incr(ipRateLimitKey(ipAddress))
  if (ipCount === 1) await redis.expire(ipRateLimitKey(ipAddress), OTP_RATE_LIMIT_WINDOW)
  if (ipCount > IP_RATE_LIMIT_MAX) {
    return { sent: false, error: 'rate_limit_exceeded' }
  }

  const code = generateOtpCode()
  const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000)

  // Invalidate any existing unverified OTPs for this identifier+session
  await prisma.otpRecord.updateMany({
    where: { identifier, sessionId, verified: false, exhausted: false },
    data: { exhausted: true },
  })

  await prisma.otpRecord.create({
    data: {
      identifier,
      identifierType,
      codeHash,
      sessionId,
      expiresAt,
    },
  })

  // Deliver — fire and forget logging, do not leak delivery errors to client
  try {
    if (identifierType === 'phone') {
      await deliverSms(identifier, code)
    } else {
      await deliverEmail(identifier, code)
    }
  } catch (err) {
    logger.error({ identifier: '***REDACTED***', err }, '[OTP] delivery failed — check provider config')
    // Still return sent:true — prevents user enumeration via delivery errors
  }

  return { sent: true }
}

export async function verifyOtp(
  identifier: string,
  sessionId: string,
  submittedCode: string,
): Promise<{ verified: boolean; error?: string }> {
  const record = await prisma.otpRecord.findFirst({
    where: {
      identifier,
      sessionId,
      verified: false,
      exhausted: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) {
    return { verified: false, error: 'invalid_or_expired' }
  }

  // Increment attempts first — prevent timing-based enumeration
  await prisma.otpRecord.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  })

  if (record.attempts + 1 >= OTP_MAX_ATTEMPTS) {
    await prisma.otpRecord.update({
      where: { id: record.id },
      data: { exhausted: true },
    })
    return { verified: false, error: 'max_attempts_exceeded' }
  }

  const match = await bcrypt.compare(submittedCode, record.codeHash)
  if (!match) {
    return { verified: false, error: 'invalid_code' }
  }

  await prisma.otpRecord.update({
    where: { id: record.id },
    data: { verified: true },
  })

  return { verified: true }
}

// ── Delivery helpers ──────────────────────────────────────────────────────────

async function deliverSms(phone: string, code: string): Promise<void> {
  if (!env.OTP_SMS_API_KEY) {
    if (env.NODE_ENV === 'development') {
      logger.info({ phone: phone.slice(0, 4) + '****' }, `[OTP-DEV] code: ${code}`)
    } else {
      logger.error(
        { phone: '***REDACTED***' },
        '[OTP] CRITICAL: OTP_SMS_API_KEY not set in non-development environment — SMS not delivered',
      )
      throw new Error('sms_provider_not_configured')
    }
    return
  }
  // TODO: replace with Armenian SMS gateway (Ucom/TeamTelecom) or Twilio
  logger.error({}, '[OTP] SMS provider stub — OTP_SMS_API_KEY is set but no provider is integrated')
  throw new Error('sms_provider_not_implemented')
}

async function deliverEmail(email: string, code: string): Promise<void> {
  if (!env.SMTP_HOST) {
    if (env.NODE_ENV === 'development') {
      logger.info({ email: email.replace(/(.{2}).+(@.+)/, '$1***$2') }, `[OTP-DEV] code: ${code}`)
    } else {
      logger.error({}, '[OTP] CRITICAL: SMTP_HOST not set in non-development environment')
      throw new Error('email_provider_not_configured')
    }
    return
  }
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
  await transporter.sendMail({
    from: `LEVE <${env.SMTP_USER}>`,
    to: email,
    subject: 'Your LEVE verification code',
    text: `Your LEVE code is: ${code}\n\nExpires in 10 minutes. Do not share this code.`,
  })
}
