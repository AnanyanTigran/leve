import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { SessionService } from '../../services/session.service'

// Mirror of SCENE_IDS in packages/types/src/index.ts — keep in sync when adding scenes.
const VALID_SCENE_IDS = new Set([
  'pure_white_studio', 'soft_shadow_studio', 'gray_gradient', 'light_box', 'black_studio',
  'colored_pop', 'apricot_warm', 'wb_white_strict',
  'marble_luxury', 'dark_wood', 'light_wood', 'concrete_industrial', 'linen_fabric',
  'velvet_dark', 'silk_white', 'terrazzo', 'acrylic_reflect', 'mirror_acrylic',
  'stone_texture', 'dark_stone',
  'bathroom_shelf', 'kitchen_counter', 'vanity_table', 'cafe_table', 'outdoor_garden',
  'office_desk', 'bed_pillows', 'beach_sand', 'coffee_jezve', 'handheld_lifestyle',
  'tech_desk_setup', 'styled_shelf',
  'holiday_new_year', 'spring_bloom', 'autumn_warm', 'summer_fresh', 'sale_promo',
  'floating_levitation', 'splash_water', 'ingredients_flat_lay', 'neon_glow',
  'minimal_pastel', 'editorial_dark',
])

const brandNameSchema = z.object({
  brandName: z.string().min(1).max(50).transform(s => s.trim()),
})

const favoriteSceneSchema = z.object({
  sceneId: z.string().min(1).max(50).refine(
    id => VALID_SCENE_IDS.has(id),
    { message: 'invalid_scene_id' },
  ),
})

export async function registerSessionPreferences(app: FastifyInstance) {
  // POST /api/session/brand-name — save brand name
  app.post(
    '/api/session/brand-name',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const parsed = brandNameSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }
      await SessionService.updateBrandName(request.session.sessionId, parsed.data.brandName)
      return reply.send({ success: true, requestId })
    },
  )

  // POST /api/session/favorite-scene — save favorite scene
  app.post(
    '/api/session/favorite-scene',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const parsed = favoriteSceneSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }
      await SessionService.updateFavoriteScene(request.session.sessionId, parsed.data.sceneId)
      return reply.send({ success: true, requestId })
    },
  )
}
