# Command: new-route

Scaffold a new Fastify API route for LEVE.

## Usage
```
/new-route <METHOD> <path> [description]
```
Example: `/new-route POST /api/generate/preview Create preview generation job`

## What to Generate

`apps/api/src/routes/<resource>/<action>.ts`

## Route Template

```typescript
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { logger } from '@/lib/logger'
import { getSession, requireSession } from '@/services/session'

const requestSchema = z.object({
  // Define request body schema
})

const responseSchema = z.object({
  success: z.boolean(),
  data: z.optional(z.object({})),
  error: z.optional(z.string()),
  requestId: z.string(),
})

export async function registerRoute(fastify: FastifyInstance) {
  fastify.post('/api/<path>', {
    schema: {
      body: requestSchema,
    },
  }, async (request, reply) => {
    const requestId = nanoid(10)
    
    try {
      // 1. Get and validate session
      const session = await requireSession(request)
      
      // 2. Parse and validate input
      const body = requestSchema.parse(request.body)
      
      // 3. Business logic
      
      // 4. Return success
      return reply.send({
        success: true,
        data: {},
        requestId,
      })
    } catch (err) {
      logger.error({ requestId, err }, 'Route error')
      return reply.status(500).send({
        success: false,
        error: 'internal_error',
        requestId,
      })
    }
  })
}
```

## Rules

- Every route has a requestId (nanoid)
- Every route validates session (or explicitly documents why it doesn't)
- Every route validates request body with zod
- Never return stack traces to client
- Log errors with requestId + structured context
- Credit-consuming routes must check and decrement credits atomically
