import { POST as onboardingPOST } from './onboarding/route'
import { POST as counsellorPOST } from './counsellor/route'

export async function POST(req: Request) {
  const body = await req.json()
  const mode = body?.data?.mode || 'onboarding'

  if (mode === 'onboarding') {
    return onboardingPOST(body)
  }

  return counsellorPOST(body)
}
