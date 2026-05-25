import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { validateImage } from '../../services/image-validation.service'
import { uploadToS3, buildS3Key } from '../../lib/s3'
import { checkRateLimit, uploadRateLimitKey } from '../../lib/rate-limit'

const UPLOAD_WINDOW = 3600

export async function registerUploadRoute(app: FastifyInstance) {
  app.post(
    '/api/upload',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      app.log.info({ requestId, sessionId: session.sessionId }, 'upload start')

      // Tiered rate limit: anon 10/hr, verified 50/hr
      const uploadMax = session.isVerified ? 50 : 10
      const allowed = await checkRateLimit(
        uploadRateLimitKey(session.sessionId),
        uploadMax,
        UPLOAD_WINDOW,
      )
      if (!allowed) {
        return reply.status(429).send({
          success: false,
          error: 'rate_limit_exceeded',
          requestId,
        })
      }

      // Read multipart file — @fastify/multipart already registered
      let fileBuffer: Buffer
      let originalFilename: string
      try {
        const data = await request.file()
        if (!data) {
          return reply.status(400).send({ success: false, error: 'no_file', requestId })
        }

        // Stream to buffer — but abort early if >20MB
        const chunks: Buffer[] = []
        let totalBytes = 0
        const MAX_BYTES = 20 * 1024 * 1024

        for await (const chunk of data.file) {
          totalBytes += chunk.length
          if (totalBytes > MAX_BYTES) {
            return reply.status(413).send({
              success: false,
              error: 'file_too_large',
              requestId,
            })
          }
          chunks.push(chunk)
        }

        fileBuffer = Buffer.concat(chunks)
        originalFilename = data.filename ?? 'upload'
      } catch (err) {
        app.log.error({ requestId, err }, 'multipart read error')
        return reply.status(400).send({ success: false, error: 'upload_error', requestId })
      }

      // Validate
      const validation = await validateImage(fileBuffer)
      if (!validation.valid) {
        app.log.warn({ requestId, error: validation.error }, 'image validation failed')
        return reply.status(422).send({
          success: false,
          error: validation.error,
          requestId,
        })
      }

      // Upload to S3
      const ext = originalFilename.split('.').pop()?.toLowerCase() ?? 'jpg'
      const s3Key = buildS3Key('uploads', session.sessionId, `original.${ext}`)

      try {
        await uploadToS3(s3Key, fileBuffer, validation.mimeType!)
      } catch (err) {
        app.log.error({ requestId, err }, 's3 upload failed')
        return reply.status(500).send({ success: false, error: 'upload_error', requestId })
      }

      app.log.info({ requestId, s3Key, sessionId: session.sessionId }, 'upload complete')

      return reply.send({
        success: true,
        data: {
          uploadKey: s3Key,
          width: validation.width,
          height: validation.height,
        },
        requestId,
      })
    },
  )
}
