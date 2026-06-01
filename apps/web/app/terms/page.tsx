import Link from 'next/link'

export const metadata = { title: 'Terms of Service — LEVE' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary px-6 py-12 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-text-muted hover:text-accent mb-8 inline-block">
        ← Back
      </Link>

      <h1 className="text-3xl font-display font-semibold mb-2">Terms of Service</h1>
      <p className="text-sm text-text-muted mb-8">Last updated: May 2026</p>

      <div className="space-y-6 text-[15px] text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">1. Service Description</h2>
          <p>
            LEVE provides AI-powered product photo enhancement for businesses. By using LEVE,
            you agree to these terms. The service is operated from Armenia and designed for
            Armenian and regional businesses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">2. Account and Credits</h2>
          <p>
            Credits purchased are non-refundable except in cases of technical failure on our
            part. Credits do not expire. You are responsible for keeping your account credentials
            secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">3. Content Policy</h2>
          <p>
            You may only upload product images you own or have rights to. Uploading prohibited
            content (NSFW, copyrighted material without rights, illegal content) will result in
            immediate account termination without refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">4. Generated Images</h2>
          <p>
            You retain full commercial rights to images generated using your uploaded product
            photos. LEVE may use anonymized generation data to improve the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">5. Service Availability</h2>
          <p>
            We aim for high availability but do not guarantee uninterrupted service. Scheduled
            maintenance will be announced in advance when possible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">6. Contact</h2>
          <p>
            For questions about these terms, contact us at{' '}
            <a href="mailto:hello@leve.am" className="text-accent hover:underline">
              hello@leve.am
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
