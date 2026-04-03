import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { subscriptionApi } from '@/services/api.service'
import { Check, Sparkles, Loader2, Crown, Zap, Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    period: '',
    description: 'Get started with core portfolio management tools.',
    icon: Shield,
    gradient: 'from-slate-500/20 to-slate-600/20',
    borderColor: 'border-slate-500/30',
    iconColor: 'text-slate-400',
    features: [
      'Property View module',
      'Property Add module',
      'AI Chatbot (10 msgs / 24hr)',
      'Browse Investors',
    ],
    notIncluded: [
      'ROI Calculator',
      'Heatmap Visualization',
      'AI Recommendations',
      'Property Authentication',
    ],
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    price: '$20',
    period: '/month',
    description: 'Unlock analytics and market intelligence tools.',
    icon: Zap,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    popular: true,
    features: [
      'Everything in Basic',
      'Unlimited AI Chatbot',
      'ROI Calculation module',
      'Heatmap Visualization',
    ],
    notIncluded: [
      'AI Recommendations',
      'Property Authentication',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$50',
    period: '/month',
    description: 'Full access to every feature on the platform.',
    icon: Crown,
    gradient: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    features: [
      'Everything in Intermediate',
      'Unlimited AI Chatbot',
      'AI Recommendation System',
      'Property Authentication',
      'Priority Support',
    ],
    notIncluded: [],
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { plan: currentPlan, refreshPlan } = useSubscription()
  const { toast } = useToast()
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  const handleUpgrade = async (planId) => {
    if (!isAuthenticated) {
      navigate('/auth/signin')
      return
    }

    if (planId === 'basic') return // Can't "upgrade" to basic

    setCheckoutLoading(planId)
    try {
      const data = await subscriptionApi.createCheckout(planId)
      if (data.url) {
        window.location.href = data.url // Redirect to Stripe Checkout
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Unable to start checkout. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const data = await subscriptionApi.createPortalSession()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Unable to open subscription management.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar variant="dashboard" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Choose Your Plan
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Unlock the Full Power of{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              HouseHopper
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade as your portfolio grows. Every plan includes core property management.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p) => {
            const isCurrentPlan = currentPlan === p.id
            const Icon = p.icon

            return (
              <div
                key={p.id}
                className={`
                  relative rounded-2xl border bg-card p-6 flex flex-col
                  transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                  ${p.popular ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : p.borderColor}
                  ${isCurrentPlan ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                `}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white border-none shadow-lg px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-primary text-primary-foreground border-none shadow-lg px-3 py-1">
                      Your Plan
                    </Badge>
                  </div>
                )}

                {/* Plan Icon & Name */}
                <div className="mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center mb-3`}>
                    <Icon className={`h-6 w-6 ${p.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>

                {/* Features */}
                <div className="space-y-3 flex-1 mb-6">
                  {p.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {p.notIncluded.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground/50 line-through">
                      <Check className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : p.id === 'basic' ? (
                  <Button variant="outline" className="w-full" disabled>
                    Free Forever
                  </Button>
                ) : (
                  <Button
                    className={`w-full gap-2 ${p.popular ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gradient-to-r from-primary to-secondary hover:opacity-90'}`}
                    onClick={() => handleUpgrade(p.id)}
                    disabled={!!checkoutLoading}
                  >
                    {checkoutLoading === p.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Upgrade to {p.name}
                      </>
                    )}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Manage Subscription */}
        {currentPlan !== 'basic' && (
          <div className="mt-8 text-center">
            <Button variant="ghost" className="text-muted-foreground" onClick={handleManageSubscription}>
              Manage or Cancel Subscription
            </Button>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
