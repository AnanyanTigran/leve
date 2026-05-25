import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  SESSION_COOKIE_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().default('leve_sid'),

  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string().default('eu-central-1'),
  AWS_S3_BUCKET: z.string(),
  AWS_CLOUDFRONT_DOMAIN: z.string(),
  AWS_CLOUDFRONT_KEY_PAIR_ID: z.string(),
  AWS_CLOUDFRONT_PRIVATE_KEY: z.string(), // PEM, newlines as \n

  FAL_API_KEY: z.string(),
  REPLICATE_API_TOKEN: z.string().optional(), // removed — Kontext handles all generation

  IDRAM_MERCHANT_ID: z.string(),
  IDRAM_SECRET_KEY: z.string(),
  TELCELL_MERCHANT_ID: z.string(),
  TELCELL_SECRET_KEY: z.string(),

  OTP_SMS_API_KEY: z.string().optional(), // optional for dev
  OTP_FROM_NUMBER: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Amazon Translate — uses existing AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
  // IAM policy must include: { "Action": ["translate:TranslateText"], "Resource": "*" }
  AWS_TRANSLATE_ENABLED: z.enum(['true', 'false']).default('false'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }
  return result.data
}
