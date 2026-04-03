import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogOut, Plus, Home, Calculator, Users, Loader2, Bot, Map, Sparkles, Lock, Crown, CreditCard } from 'lucide-react'
import { propertiesApi } from '@/services/api.service'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { plan, canAccess, loading: planLoading } = useSubscription()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [propertyCount, setPropertyCount] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [avgROI, setAvgROI] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      // Optimized: Fetch only stats instead of all property objects
      const response = await propertiesApi.getStats()
      
      if (response.success) {
        setPropertyCount(response.propertyCount || 0)
        setTotalValue(response.totalValue || 0)
        setAvgROI(response.avgROI || 0)
      } else {
        // Fallback to old method if stats endpoint fails
        const properties = await propertiesApi.getAll('purchase_price,current_value,monthly_rent')
        setPropertyCount(properties.length)
        const total = properties.reduce((sum, p) => sum + (p.current_value || p.purchase_price || 0), 0)
        setTotalValue(total)
        const totalRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0) * 12
        const totalPurchase = properties.reduce((sum, p) => sum + (p.purchase_price || 0), 0)
        setAvgROI(totalPurchase > 0 ? (totalRent / totalPurchase) * 100 : 0)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
      if (error.status !== 404) {
        toast({
          title: 'Error Loading Dashboard',
          description: error.message || 'Failed to load dashboard statistics. Please try again.',
          variant: 'destructive',
        })
      }
      setPropertyCount(0)
      setTotalValue(0)
      setAvgROI(0)
    } finally {
      setLoading(false)
    }
  }, [toast])


  useEffect(() => {
    if (!authLoading) {
      loadStats()
    }
  }, [authLoading, loadStats])

  const getPlanBadge = () => {
    switch (plan) {
      case 'premium':
        return <Badge className="bg-amber-500 text-white border-none gap-1"><Crown className="h-3 w-3" /> Premium</Badge>
      case 'intermediate':
        return <Badge className="bg-blue-500 text-white border-none gap-1"><Sparkles className="h-3 w-3" /> Intermediate</Badge>
      default:
        return <Badge variant="outline" className="gap-1">Basic (Free)</Badge>
    }
  }

  const FeatureCard = ({ title, description, icon: Icon, onClick, feature, className = '' }) => {
    const locked = feature && !canAccess(feature)

    return (
      <Card
        className={`cursor-pointer transition relative overflow-hidden ${locked ? 'opacity-60 hover:opacity-80' : 'hover:border-primary'} ${className}`}
        onClick={() => {
          if (locked) {
            navigate('/pricing')
          } else {
            onClick()
          }
        }}
      >
        {locked && (
          <div className="absolute top-2 right-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
            {locked && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                Upgrade
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar variant="dashboard" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground">Welcome to Your Dashboard</h1>
              <p className="text-lg text-foreground/70">
                Track ROI and manage your real estate portfolio.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getPlanBadge()}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/pricing')}>
                <CreditCard className="h-3.5 w-3.5" />
                {plan === 'basic' ? 'Upgrade' : 'Plans'}
              </Button>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Properties</CardDescription>
              </CardHeader>
              <CardContent>
                {loading || authLoading ? (
                  <Skeleton className="h-10 w-16 mb-2" />
                ) : (
                  <div className="text-4xl font-bold text-primary mb-2">
                    {propertyCount}
                  </div>
                )}
                <p className="text-foreground/70">Total Properties</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Value</CardDescription>
              </CardHeader>
              <CardContent>
                {loading || authLoading ? (
                  <Skeleton className="h-10 w-32 mb-2" />
                ) : (
                  <div className="text-4xl font-bold text-primary mb-2">
                    PKR {totalValue.toLocaleString()}
                  </div>
                )}
                <p className="text-foreground/70">Portfolio Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average ROI</CardDescription>
              </CardHeader>
              <CardContent>
                {loading || authLoading ? (
                  <Skeleton className="h-10 w-24 mb-2" />
                ) : (
                  <div className="text-4xl font-bold text-primary mb-2">
                    {avgROI.toFixed(2)}%
                  </div>
                )}
                <p className="text-foreground/70">Return on Investment</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="Add Property"
              description="Add a new property to your portfolio"
              icon={Plus}
              onClick={() => navigate('/add-property')}
            />
            <FeatureCard
              title="View Portfolio"
              description="Manage all your properties"
              icon={Home}
              onClick={() => navigate('/portfolio')}
            />
            <FeatureCard
              title="Explore Heatmap"
              description="Visualise property density on map"
              icon={Map}
              onClick={() => navigate('/heat-map')}
              feature="heatmap"
              className="text-blue-500"
            />
            <FeatureCard
              title="ROI Calculator"
              description="Calculate returns on your properties"
              icon={Calculator}
              onClick={() => navigate('/roi-calculator')}
              feature="roi"
            />
            <FeatureCard
              title="Browse Investors"
              description="View properties from other investors"
              icon={Users}
              onClick={() => navigate('/browse-users')}
            />
            <FeatureCard
              title="AI Recommendations"
              description="Get AI-powered property suggestions"
              icon={Sparkles}
              onClick={() => navigate('/recommendations')}
              feature="recommendations"
              className="bg-yellow-500/5 border-yellow-500/20"
            />
            <FeatureCard
              title="AI Assistant"
              description="Chat with HouseHopper AI for insights"
              icon={Bot}
              onClick={() => navigate('/chat')}
              className="bg-secondary/5 border-secondary/20"
            />
            <Card
              className="cursor-pointer hover:border-primary transition bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20"
              onClick={() => navigate('/pricing')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  View Plans
                </CardTitle>
                <CardDescription>
                  {plan === 'basic' ? 'Upgrade to unlock more features' : 'Manage your subscription'}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
