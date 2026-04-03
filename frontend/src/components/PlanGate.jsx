import { useNavigate } from 'react-router-dom'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * PlanGate — wraps content and shows an upgrade prompt if the user's plan
 * doesn't meet the requirement.
 *
 * Usage:
 *   <PlanGate feature="roi">
 *     <ROICalculator />
 *   </PlanGate>
 */
export default function PlanGate({ feature, children }) {
  const { canAccess, getRequiredPlan, loading } = useSubscription()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (canAccess(feature)) {
    return children
  }

  const requiredPlan = getRequiredPlan(feature)
  const planLabel = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-primary/20">
          <Lock className="h-10 w-10 text-primary/70" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {planLabel} Plan Required
          </h2>
          <p className="text-muted-foreground">
            This feature is available on the <strong className="text-primary">{planLabel}</strong> plan and above.
            Upgrade now to unlock it.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            onClick={() => navigate('/pricing')}
          >
            <Sparkles className="h-4 w-4" />
            View Plans & Upgrade
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
