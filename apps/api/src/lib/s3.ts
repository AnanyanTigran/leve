import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { validateEnv } from '../config/env'

const env = validateEnv()

export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    }),
  )
}

// Raw uploads are removed by a 48h S3 lifecycle rule, so a stored uploadS3Key
// may point at a deleted object — check before signing a URL for it.
export async function existsInS3(key: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
      }),
    )
    return true
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false
    throw err
  }
}

export function buildS3Key(
  folder: 'uploads' | 'previews' | 'hd',
  sessionId: string,
  filename: string,
): string {
  return `${folder}/${sessionId}/${Date.now()}-${filename}`
}
