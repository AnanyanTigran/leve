import {
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate'
import { validateEnv } from '../config/env'
import { logger } from '../lib/logger'

const env = validateEnv()

// Lazy-init client — only created if translation is enabled
let translateClient: TranslateClient | null = null

function getClient(): TranslateClient {
  if (!translateClient) {
    translateClient = new TranslateClient({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  }
  return translateClient
}

export async function translateToEnglish(text: string): Promise<string> {
  if (!text.trim()) return text

  if (env.AWS_TRANSLATE_ENABLED !== 'true') {
    logger.debug('[translate] disabled — returning original text')
    return text
  }

  // Pure ASCII is almost certainly already English — skip the API call
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(text)) {
    return text
  }

  try {
    const command = new TranslateTextCommand({
      Text: text.slice(0, 500), // hard cap — Translate has 5000-byte limit
      SourceLanguageCode: 'auto', // auto-detect: handles Armenian, Russian, mixed
      TargetLanguageCode: 'en',
    })

    const response = await getClient().send(command)
    const translated = response.TranslatedText?.trim()

    if (!translated) return text

    logger.debug({ original: text.slice(0, 30), translated: translated.slice(0, 30) }, '[translate] translated')

    return translated
  } catch (err) {
    // Fail open — generation quality may be slightly lower but nothing breaks
    logger.error({ err }, '[translate] failed — using original text')
    return text
  }
}
