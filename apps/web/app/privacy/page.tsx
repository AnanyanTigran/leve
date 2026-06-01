import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — LEVE' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary px-6 py-12 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-text-muted hover:text-accent mb-8 inline-block">
        ← Back
      </Link>

      <h1 className="text-3xl font-display font-semibold mb-2">Privacy Policy</h1>
      <p className="text-sm text-text-muted mb-8">Last updated: May 2026</p>

      <div className="space-y-6 text-[15px] text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">1. Data We Collect</h2>
          <p>
            We collect your phone number or email address for account verification. We store
            the product photos you upload and the AI-generated images we produce for you.
            We collect basic usage data (generation count, payment history) to operate the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">2. How We Use Your Data</h2>
          <p>
            Your data is used solely to provide the LEVE service. We do not sell your personal
            data to third parties. Upload photos are deleted after 48 hours. Generated previews
            are retained for 30–90 days depending on account type.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">3. Third-Party Services</h2>
          <p>
            We use AWS (image storage and processing), fal.ai (AI generation), and Armenian
            payment providers Idram and Telcell. Each has its own privacy policy. Payment
            information is handled entirely by the payment provider — we never store card details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">4. Your Rights</h2>
          <p>
            You can request deletion of your account and all associated data at any time by
            contacting us. Purchased credits will be forfeited upon account deletion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">5. Security</h2>
          <p>
            We use industry-standard encryption for data in transit and at rest. Session
            tokens are stored in secure httpOnly cookies. We conduct regular security reviews.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-2">6. Contact</h2>
          <p>
            For privacy inquiries, contact us at{' '}
            <a href="mailto:privacy@leve.am" className="text-accent hover:underline">
              privacy@leve.am
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
