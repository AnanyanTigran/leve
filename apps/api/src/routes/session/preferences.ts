import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { SessionService } from '../../services/session.service'

export async function registerSessionPreferences(app: FastifyInstance) {
  // POST /api/session/brand-name — save brand name
  app.post(
    '/api/session/brand-name',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const { brandName } = request.body as { brandName?: string }

      if (!brandName || typeof brandName !== 'string') {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      await SessionService.updateBrandName(request.session.sessionId, brandName)

      return reply.send({ success: true, requestId })
    },
  )

  // POST /api/session/favorite-scene — save favorite scene
  app.post(
    '/api/session/favorite-scene',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const { sceneId } = request.body as { sceneId?: string }

      if (!sceneId || typeof sceneId !== 'string') {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      await SessionService.updateFavoriteScene(request.session.sessionId, sceneId)

      return reply.send({ success: true, requestId })
    },
  )
}
