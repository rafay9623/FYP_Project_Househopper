import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, Plus, Home, Calculator, Users, Loader2, Bot, Map } from 'lucide-react'
import { propertiesApi } from '@/services/api.service'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [propertyCount, setPropertyCount] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [avgROI, setAvgROI] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      loadStats()
    }
  }, [authLoading])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await propertiesApi.getAll()
      const properties = response.properties || response || []

      setPropertyCount(properties.length)

      const total = properties.reduce((sum, p) => sum + (p.current_value || p.purchase_price || 0), 0)
      setTotalValue(total)

      const totalRent = properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0) * 12
      const totalPurchase = properties.reduce((sum, p) => sum + (p.purchase_price || 0), 0)
      const avg = totalPurchase > 0 ? (totalRent / totalPurchase) * 100 : 0
      setAvgROI(avg)
    } catch (error) {
      console.error('Error loading stats:', error)
      // Don't show error toast for 404 or empty results - just set defaults
      if (error.status !== 404) {
        toast({
          title: 'Error Loading Dashboard',
          description: error.message || 'Failed to load dashboard statistics. Please try again.',
          variant: 'destructive',
        })
      }
      // Set defaults for empty state
      setPropertyCount(0)
      setTotalValue(0)
      setAvgROI(0)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-foreground/70">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar variant="dashboard" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Welcome to Your Dashboard</h1>
            <p className="text-lg text-foreground/70">
              Start by adding your first property to track ROI and manage your real estate portfolio.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Properties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary mb-2">{propertyCount}</div>
                <p className="text-foreground/70">Total Properties</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-accent mb-2">
                  ${totalValue.toLocaleString()}
                </div>
                <p className="text-foreground/70">Portfolio Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average ROI</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary mb-2">
                  {avgROI.toFixed(2)}%
                </div>
                <p className="text-foreground/70">Return on Investment</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card
              className="cursor-pointer hover:border-primary transition"
              onClick={() => navigate('/add-property')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Property
                </CardTitle>
                <CardDescription>
                  Add a new property to your portfolio
                </CardDescription>
              </CardHeader>
            </Card>
            <Card
              className="cursor-pointer hover:border-primary transition"
              onClick={() => navigate('/portfolio')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  View Portfolio
                </CardTitle>
                <CardDescription>
                  Manage all your properties
                </CardDescription>
              </CardHeader>
            </Card>
            <Card
              className="cursor-pointer hover:border-blue-500 transition text-blue-500"
              onClick={() => navigate('/heat-map')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Explore Heatmap
                </CardTitle>
                <CardDescription className="text-foreground/70">
                  Visualise property density on map
                </CardDescription>
              </CardHeader>
            </Card>
            <Card
              className="cursor-pointer hover:border-primary transition"
              onClick={() => navigate('/roi-calculator')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  ROI Calculator
                </CardTitle>
                <CardDescription>
                  Calculate returns on your properties
                </CardDescription>
              </CardHeader>
            </Card>
            <Card
              className="cursor-pointer hover:border-primary transition"
              onClick={() => navigate('/browse-users')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Browse Investors
                </CardTitle>
                <CardDescription>
                  View properties from other investors
                </CardDescription>
              </CardHeader>
            </Card>
            <Card
              className="cursor-pointer hover:border-secondary transition bg-secondary/5 border-secondary/20"
              onClick={() => navigate('/chat')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-secondary" />
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Chat with HouseHopper AI for insights
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div >
  )
}
