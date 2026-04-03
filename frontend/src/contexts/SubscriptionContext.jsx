import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { subscriptionApi } from '@/services/api.service'

const SubscriptionContext = createContext(null)

// Feature → minimum plan mapping
const FEATURE_PLAN_MAP = {
  property_view: 'basic',
  property_add: 'basic',
  chatbot: 'basic',
  roi: 'intermediate',
  heatmap: 'intermediate',
  recommendations: 'premium',
  property_auth: 'premium',
}

const PLAN_LEVELS = { basic: 0, intermediate: 1, premium: 2 }

export function SubscriptionProvider({ children }) {
  const { user, isAuthenticated } = useAuth()
  const [plan, setPlan] = useState('basic')
  const [planDetails, setPlanDetails] = useState(null)
  const [chatUsage, setChatUsage] = useState(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPlan = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPlan('basic')
      setPlanDetails(null)
      setChatUsage(null)
      setLoading(false)
      return
    }

    // Admin always gets premium
    if (user.email === 'youngdumbrokedie@gmail.com') {
      setPlan('premium')
      setPlanDetails({ id: 'premium', name: 'Premium (Admin)' })
      setLoading(false)
      return
    }

    try {
      const data = await subscriptionApi.getPlan()
      if (data.success) {
        setPlan(data.plan || 'basic')
        setPlanDetails(data.planDetails || null)
        setChatUsage(data.chatUsage || null)
        setSubscriptionStatus(data.subscriptionStatus || null)
      }
    } catch (error) {
      console.error('Failed to fetch subscription plan:', error)
      setPlan('basic')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  /**
   * Check if the current plan allows access to a feature.
   * @param {'roi' | 'heatmap' | 'recommendations' | 'property_auth' | 'chatbot'} feature
   * @returns {boolean}
   */
  const canAccess = useCallback((feature) => {
    const requiredPlan = FEATURE_PLAN_MAP[feature]
    if (!requiredPlan) return true // Unknown feature → allow

    const userLevel = PLAN_LEVELS[plan] ?? 0
    const requiredLevel = PLAN_LEVELS[requiredPlan] ?? 0
    return userLevel >= requiredLevel
  }, [plan])

  /**
   * Get the minimum plan required for a feature.
   */
  const getRequiredPlan = useCallback((feature) => {
    return FEATURE_PLAN_MAP[feature] || 'basic'
  }, [])

  const value = useMemo(() => ({
    plan,
    planDetails,
    chatUsage,
    subscriptionStatus,
    loading,
    canAccess,
    getRequiredPlan,
    refreshPlan: fetchPlan,
  }), [plan, planDetails, chatUsage, subscriptionStatus, loading, canAccess, getRequiredPlan, fetchPlan])

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}
