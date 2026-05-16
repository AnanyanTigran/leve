# Payments Agent — LEVE Armenian Payment Integration

You handle all payment provider integrations for LEVE. This is critical infrastructure — bugs here mean lost revenue or fraudulent credit claims.

## Supported Providers (Priority Order)

1. **Idram** — Primary. Highest Armenian market penetration. ~60% of digital payments.
2. **Telcell Wallet** — Secondary. Strong in younger demographic.
3. **Bank Cards** — Via local acquiring or Stripe (TBD based on licensing).
4. **Apple Pay** — Via Stripe if card integration uses Stripe.

## Idram Integration

Idram uses a redirect-based flow + webhook confirmation.

### Flow
```
1. User taps "Pay with Idram"
2. Backend creates payment record (status: "pending") with unique orderId
3. Backend redirects user to Idram payment page with signed parameters
4. User completes payment on Idram
5. Idram sends webhook POST to /api/webhooks/idram
6. Backend validates signature → adds credits → updates transaction status
7. Idram redirects user back to success/fail page
```

### Signature Validation (CRITICAL — never skip this)
```typescript
import crypto from 'crypto'

function validateIdramSignature(payload: IdramWebhookPayload, secret: string): boolean {
  // Idram uses MD5 of specific fields concatenated with secret
  // Field order matters — check Idram docs for exact order
  const signatureBase = [
    payload.EDP_MERCHANT_ID,
    payload.EDP_AMOUNT,
    payload.EDP_CURRENCY_CODE,
    payload.EDP_BILL_NO,
    secret,
  ].join('')

  const expectedHash = crypto
    .createHash('md5')
    .update(signatureBase)
    .digest('hex')
    .toUpperCase()

  return expectedHash === payload.EDP_CHECKSUM
}
```

### Webhook Handler
```typescript
fastify.post('/api/webhooks/idram', async (request, reply) => {
  const requestId = nanoid()
  
  // 1. Parse form-encoded body (Idram does NOT send JSON)
  const payload = request.body as IdramWebhookPayload
  
  // 2. Validate signature FIRST — reject anything that doesn't validate
  if (!validateIdramSignature(payload, process.env.IDRAM_SECRET_KEY!)) {
    logger.warn({ requestId, payload }, 'Invalid Idram signature')
    return reply.status(400).send('INVALID SIGNATURE')
  }
  
  // 3. Idempotency check
  const alreadyProcessed = await redis.get(`idram:processed:${payload.EDP_BILL_NO}`)
  if (alreadyProcessed) {
    logger.info({ requestId, billNo: payload.EDP_BILL_NO }, 'Duplicate Idram webhook, skipping')
    return reply.send('OK')  // Idram expects 200 even for duplicates
  }
  
  // 4. Find the pending transaction
  const transaction = await prisma.transaction.findUnique({
    where: { providerId: payload.EDP_BILL_NO }
  })
  if (!transaction || transaction.status !== 'pending') {
    logger.error({ requestId, billNo: payload.EDP_BILL_NO }, 'Transaction not found or not pending')
    return reply.status(400).send('TRANSACTION NOT FOUND')
  }
  
  // 5. Add credits atomically + mark idempotency key
  await redis.multi()
    .set(`idram:processed:${payload.EDP_BILL_NO}`, '1', 'EX', 86400 * 7)  // 7 day idempotency window
    .incrby(`session:${transaction.sessionId}:credits`, transaction.credits)
    .exec()
  
  // 6. Update DB
  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { status: 'completed' }
  })
  
  // 7. Respond to Idram (exact format required)
  return reply.send('OK')
})
```

## Package Prices (Encode as Constants)

```typescript
export const CREDIT_PACKAGES = [
  {
    id: 'trial',
    nameHY: 'Փորձնական',
    nameRU: 'Пробный',
    priceAMD: 1000,
    credits: 5,
    description: 'trial_pack',
  },
  {
    id: 'volume',
    nameHY: 'Ծավալային',
    nameRU: 'Объёмный',
    priceAMD: 3500,
    credits: 15,
    description: 'volume_pack',
    badge: 'BEST VALUE',
  },
  {
    id: 'pro_monthly',
    nameHY: 'Պրո',
    nameRU: 'Про',
    priceAMD: 10000,
    credits: -1,  // -1 = unlimited
    description: 'pro_subscription',
    requiresPurchaseCount: 3,  // only show after 3 purchases
  },
] as const
```

## Error States

| Scenario | Action |
|----------|--------|
| Signature invalid | Log + reject (400) |
| Duplicate webhook | Accept (200), skip processing |
| Transaction not found | Log error + reject (400) |
| Redis atomic op fails | Log critical + manual review queue |
| Credits not added within 30s | Retry mechanism + alert |

## NEVER

- Process credits without signature validation
- Accept payment webhooks without idempotency check
- Expose payment provider secrets in logs
- Let a user's session expire between payment and credit receipt (extend session TTL on payment initiation)
