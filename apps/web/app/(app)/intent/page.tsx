import { redirect } from 'next/navigation'

// Legacy route from the V1 intent-selection concept. The placeholder screen
// (literal "intent" text) was reachable by URL — redirect home instead.
export default function IntentPage() {
  redirect('/')
}
