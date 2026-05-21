import { getSignedUrl } from '@aws-sdk/cloudfront-signer'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3 } from './s3'
import { validateEnv } from '../config/env'

const env = validateEnv()

const DEFAULT_EXPIRY_SECONDS = 60 * 60 * 24

export function buildCloudfrontSignedUrl(
  s3Key: string,
  expirySeconds: number = DEFAULT_EXPIRY_SECONDS,
): string {
  const url = `https://${env.AWS_CLOUDFRONT_DOMAIN}/${s3Key}`
  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds

  // PEM private key stored with literal \n in env var
  const privateKey = env.AWS_CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, '\n')

  return getSignedUrl({
    url,
    keyPairId: env.AWS_CLOUDFRONT_KEY_PAIR_ID,
    dateLessThan: new Date(expiresAt * 1000).toISOString(),
    privateKey,
  })
}

export async function downloadFromS3(s3Key: string): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: s3Key,
    }),
  )

  if (!response.Body) throw new Error('s3_empty_response')

  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
