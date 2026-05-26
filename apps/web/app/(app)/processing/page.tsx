import type { Metadata } from 'next'
import { ProcessingScreen } from '@/components/processing/processing-screen'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function ProcessingPage() {
  return <ProcessingScreen />
}
