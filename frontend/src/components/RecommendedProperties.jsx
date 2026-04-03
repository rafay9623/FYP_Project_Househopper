import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Loader2, Sparkles, MapPin, Home, TrendingUp, BedDouble, Bath, Ruler, X, Target } from 'lucide-react'
import { recommendationsApi } from '@/services/api.service'

/**
 * RecommendedProperties — displays AI-driven similar property recommendations.
 * Pass a `propertyId` to find properties similar to that one.
 */
export default function RecommendedProperties({ propertyId }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedProperty, setSelectedProperty] = useState(null)

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
            <p>Could not load recommendations.</p>
            <p className="text-sm mt-1">{error}</p>
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
            onClick={() => setSelectedProperty(property)}
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

      {/* Property Detail Dialog */}
      <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedProperty && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {selectedProperty.name || 'Property Details'}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 pt-1">
                  <Badge
                    className={`text-xs font-bold ${
                      selectedProperty.matchPercentage >= 80
                        ? 'bg-green-500/90 text-white'
                        : selectedProperty.matchPercentage >= 60
                        ? 'bg-blue-500/90 text-white'
                        : 'bg-orange-500/90 text-white'
                    }`}
                  >
                    <Target className="h-3 w-3 mr-1" />
                    {selectedProperty.matchPercentage}% Match
                  </Badge>
                  {selectedProperty.property_type && (
                    <Badge variant="outline">{selectedProperty.property_type}</Badge>
                  )}
                  {selectedProperty.purpose && (
                    <Badge variant="outline">{selectedProperty.purpose}</Badge>
                  )}
                </DialogDescription>
              </DialogHeader>

              <Separator />

              <div className="space-y-4">
                {/* Location */}
                {(selectedProperty.addressCity || selectedProperty.address || selectedProperty.location) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedProperty.location || 
                          [selectedProperty.address, selectedProperty.addressCity, selectedProperty.addressProvince]
                            .filter(Boolean)
                            .join(', ')
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Price */}
                {selectedProperty.purchase_price && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Price</p>
                      <p className="text-lg font-bold text-primary">
                        PKR {Number(selectedProperty.purchase_price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rent */}
                {selectedProperty.monthly_rent && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Monthly Rent</p>
                      <p className="text-sm text-muted-foreground">
                        PKR {Number(selectedProperty.monthly_rent).toLocaleString()}/mo
                      </p>
                    </div>
                  </div>
                )}

                {/* Property specs row */}
                <div className="grid grid-cols-3 gap-3">
                  {selectedProperty.bedrooms != null && (
                    <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
                      <BedDouble className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-semibold">{selectedProperty.bedrooms}</span>
                      <span className="text-xs text-muted-foreground">Bedrooms</span>
                    </div>
                  )}
                  {selectedProperty.baths != null && (
                    <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-semibold">{selectedProperty.baths}</span>
                      <span className="text-xs text-muted-foreground">Bathrooms</span>
                    </div>
                  )}
                  {selectedProperty.area != null && (
                    <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
                      <Ruler className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-semibold">
                        {selectedProperty.area} {selectedProperty.area_type || ''}
                      </span>
                      <span className="text-xs text-muted-foreground">Area</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedProperty.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedProperty.description}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
