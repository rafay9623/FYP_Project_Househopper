import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { propertiesApi } from '@/services/api.service'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'
import RecommendedProperties from '@/components/RecommendedProperties'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Sparkles, Brain, ArrowRight } from 'lucide-react'

export default function Recommendations() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [properties, setProperties] = useState([])
  const [selectedPropertyId, setSelectedPropertyId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      loadUserProperties()
    }
  }, [authLoading])

  const loadUserProperties = async () => {
    try {
      setLoading(true)
      const response = await propertiesApi.getAll()
      const props = response.properties || response || []
      setProperties(props)

      // Auto-select the most recent property
      if (props.length > 0) {
        setSelectedPropertyId(props[0].id)
      }
    } catch (error) {
      console.error('Error loading properties:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your properties.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-foreground/70">Loading recommendations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar variant="dashboard" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">
                AI Property Recommendations
              </h1>
            </div>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Our AI analyzes property descriptions, types, locations, and price ranges
              using a Hugging Face language model to find the most similar properties for you.
            </p>
          </div>



          {/* Property Selector */}
          {properties.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Select a Property
                </CardTitle>
                <CardDescription>
                  Choose one of your properties to find similar ones from across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedPropertyId || ''}
                  onValueChange={(value) => setSelectedPropertyId(value)}
                >
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder="Select a property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>
                        {prop.name}{prop.addressCity ? ` — ${prop.addressCity}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-lg">
                  You don't have any properties yet.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add your first property to start getting AI-powered recommendations.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Recommendations results */}
          {selectedPropertyId && (
            <RecommendedProperties
              propertyId={selectedPropertyId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
