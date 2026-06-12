import bcrypt from 'bcryptjs'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'
import { validateEnv } from '../config/env'

const env = validateEnv()

const snsClient = new SNSClient({ region: env.AWS_REGION })
const sesClient = new SESClient({ region: env.AWS_REGION })

const OTP_EXPIRY_SECONDS = 60 * 10      // 10 minutes
const OTP_MAX_ATTEMPTS = 5
const OTP_RATE_LIMIT_MAX = 3            // sends per identifier per hour
const OTP_RATE_LIMIT_WINDOW = 3600
// Sends per IP per hour — SMS-cost backstop only, NOT the per-user guard
// (that is the per-identifier limit above). Armenian carrier NAT puts many
// users behind one public IP: at 10/hr, 4-5 users registering in the same
// hour exhausted it and, because the route answers 200 regardless
// (anti-enumeration), the next user's code silently never arrived.
const IP_RATE_LIMIT_MAX = 30
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
  // TODO(MEDIUM infra-audit 4.7): INCR-then-EXPIRE here and below is not
  // atomic — a crash between the two leaves a counter with no TTL, permanently
  // blocking that identifier/IP. Fold into a single Lua script.
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

  try {
    if (identifierType === 'phone') {
      await deliverSms(identifier, code)
    } else {
      await deliverEmail(identifier, code)
    }
  } catch (err: unknown) {
    const name = (err as { name?: string }).name
    logger.error({ name, identifier: '***' }, '[OTP] delivery failed')
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

  // Check limit before incrementing so all OTP_MAX_ATTEMPTS guesses are usable
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otpRecord.update({
      where: { id: record.id },
      data: { exhausted: true },
    })
    return { verified: false, error: 'max_attempts_exceeded' }
  }

  await prisma.otpRecord.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  })

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
  if (env.NODE_ENV === 'development') {
    logger.info({ phone: phone.slice(0, 5) + '****' }, `[OTP-DEV] code: ${code}`)
    return
  }

  await snsClient.send(
    new PublishCommand({
      PhoneNumber: phone, // already E.164 from react-phone-number-input, no normalization applied
      Message: [
        `Your LEVE code: ${code}`,
        `Ձեր LEVE կոդը՝ ${code}`,
        `Код LEVE: ${code}`,
      ].join('\n'),
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: env.AWS_SNS_SENDER_ID,
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional',
        },
      },
    }),
  )

  logger.info({ phone: phone.slice(0, 5) + '****' }, '[OTP] SMS sent via SNS')
}

async function deliverEmail(email: string, code: string): Promise<void> {
  if (env.NODE_ENV === 'development') {
    logger.info({ email: email.replace(/(.{2}).+(@.+)/, '$1***$2') }, `[OTP-DEV] code: ${code}`)
    return
  }

  const fromEmail = env.AWS_SES_FROM_EMAIL ?? 'noreply@leve.am'
  const fromName = env.AWS_SES_FROM_NAME

  await sesClient.send(
    new SendEmailCommand({
      Source: `${fromName} <${fromEmail}>`,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: {
          Data: `${code} — LEVE verification code`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `
              <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0E0E0F;color:#F2F2F2;border-radius:12px">
                <h1 style="font-size:28px;color:#E8621A;margin:0 0 24px">LEVE</h1>
                <p style="font-size:15px;color:#9A9A9E;margin:0 0 12px">Your verification code:</p>
                <div style="font-size:48px;font-weight:bold;letter-spacing:16px;color:#F2F2F2;padding:16px 0">${code}</div>
                <p style="font-size:12px;color:#5A5A60;margin-top:32px">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
              </div>
            `,
          },
          Text: {
            Charset: 'UTF-8',
            Data: `Your LEVE verification code: ${code}\nExpires in 10 minutes.`,
          },
        },
      },
    }),
  )

  logger.info({ email: email.replace(/(.{2}).+(@.+)/, '$1***$2') }, '[OTP] email sent via SES')
}
