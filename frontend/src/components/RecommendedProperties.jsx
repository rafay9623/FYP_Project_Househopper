import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, MapPin, Home, TrendingUp } from 'lucide-react'
import { recommendationsApi } from '@/services/api.service'

/**
 * RecommendedProperties — displays AI-driven similar property recommendations.
 * Pass a `propertyId` to find properties similar to that one.
 */
export default function RecommendedProperties({ propertyId, onPropertyClick }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (propertyId) {
      fetchRecommendations()
    }
  }, [propertyId])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await recommendationsApi.getForProperty(propertyId, 5)
      setRecommendations(response.recommendations || [])
    } catch (err) {
      console.error('Failed to load recommendations:', err)
      setError(err.message || 'Could not load recommendations')
    } finally {
      setLoading(false)
    }
  }

  if (!propertyId) return null

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Finding Similar Properties...
        </h3>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Recommended For You
        </h3>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Recommendation service is unavailable.</p>
            <p className="text-sm mt-1">Make sure the recommendation service is running.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Recommended For You
        </h3>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No similar properties found yet.</p>
            <p className="text-sm mt-1">Add more properties to get personalized recommendations.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-yellow-500" />
        Recommended For You
        <Badge variant="secondary" className="ml-2 text-xs">
          AI Powered
        </Badge>
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {recommendations.map((property) => (
          <Card
            key={property.id}
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 group relative overflow-hidden"
            onClick={() => onPropertyClick?.(property)}
          >
            {/* Match percentage badge */}
            <div className="absolute top-3 right-3 z-10">
              <Badge
                className={`text-xs font-bold ${
                  property.matchPercentage >= 80
                    ? 'bg-green-500/90 text-white hover:bg-green-500'
                    : property.matchPercentage >= 60
                    ? 'bg-blue-500/90 text-white hover:bg-blue-500'
                    : 'bg-orange-500/90 text-white hover:bg-orange-500'
                }`}
              >
                {property.matchPercentage}% Match
              </Badge>
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold line-clamp-2 pr-16 group-hover:text-primary transition-colors">
                {property.name || 'Unnamed Property'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {/* Property type */}
              {property.property_type && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Home className="h-3 w-3" />
                  <span>{property.property_type}</span>
                </div>
              )}

              {/* Location */}
              {(property.addressCity || property.address) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="line-clamp-1">
                    {property.addressCity
                      ? `${property.addressCity}${property.addressProvince ? ', ' + property.addressProvince : ''}`
                      : property.address}
                  </span>
                </div>
              )}

              {/* Price */}
              {property.purchase_price && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <TrendingUp className="h-3 w-3" />
                  <span>PKR {Number(property.purchase_price).toLocaleString()}</span>
                </div>
              )}

              {/* Monthly rent */}
              {property.monthly_rent && (
                <div className="text-xs text-muted-foreground">
                  Rent: PKR {Number(property.monthly_rent).toLocaleString()}/mo
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
