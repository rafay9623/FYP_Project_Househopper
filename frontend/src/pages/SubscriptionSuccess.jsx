import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { subscriptionApi } from '@/services/api.service'
import { CheckCircle, ArrowRight, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SubscriptionSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshPlan } = useSubscription()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      setStatus('error')
      setErrorMsg('No session ID found. Please try upgrading again from the Pricing page.')
      return
    }

    async function verify() {
      try {
        const data = await subscriptionApi.verifySession(sessionId)
        if (data.success) {
          // Plan updated in Firestore — now refresh the context so the UI reflects it
          await refreshPlan()
          setStatus('success')
        } else {
          throw new Error(data.error || 'Verification failed')
        }
      } catch (err) {
        console.error('Session verification error:', err)
        setErrorMsg(err.message || 'Unable to verify payment. Please contact support.')
        setStatus('error')
      }
    }

    verify()
  }, [searchParams, refreshPlan])

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Verifying Payment...</h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment with Stripe.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Verification Failed</h1>
            <p className="text-muted-foreground">{errorMsg}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="gap-2"
              onClick={() => navigate('/pricing')}
            >
              Back to Pricing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center animate-in zoom-in duration-500">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>

        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-bold">Subscription Activated!</h1>
          <p className="text-muted-foreground">
            Your plan has been upgraded successfully. Enjoy all your new features!
          </p>
        </div>

        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms' }}>
          <Button
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-secondary"
            onClick={() => navigate('/dashboard')}
          >
            <Sparkles className="h-4 w-4" />
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
