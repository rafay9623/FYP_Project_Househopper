import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, Trash2, Home, Loader2, Plus } from 'lucide-react'
import { propertiesApi } from '@/services/api.service'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'

export default function Portfolio() {
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      loadProperties()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  const loadProperties = async () => {
    try {
      const data = await propertiesApi.getAll()
      console.log('📦 Loaded properties:', data.length)
      data.forEach((prop, idx) => {
        console.log(`Property ${idx + 1}:`, {
          id: prop.id,
          name: prop.name,
          hasImage: !!prop.image_url,
          imageLength: prop.image_url?.length || 0
        })
      })
      setProperties(data)
    } catch (error) {
      console.error('Error loading properties:', error)
      toast({
        title: 'Error Loading Properties',
        description: error.message || 'Failed to load properties. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return

    try {
      await propertiesApi.delete(id)
      setProperties(properties.filter(p => p.id !== id))
      toast({
        title: 'Property Deleted',
        description: 'The property has been successfully removed from your portfolio.',
      })
    } catch (error) {
      console.error('Error deleting property:', error)
      toast({
        title: 'Error Deleting Property',
        description: error.message || 'Failed to delete property. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const calculateROI = (property) => {
    if (!property.purchase_price || property.purchase_price === 0) return 0
    const annualRent = property.monthly_rent * 12
    const roi = (annualRent / property.purchase_price) * 100
    return roi.toFixed(2)
  }

  const calculateTotalValue = () => {
    return properties.reduce((sum, p) => sum + (p.current_value || p.purchase_price || 0), 0)
  }

  const calculateTotalRent = () => {
    return properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-primary/70 tracking-tight">H</span>
          </div>
          <p className="text-foreground/50 text-sm tracking-wide">Loading properties...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <Navbar variant="portfolio" showBackButton={true} backPath="/dashboard" />

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Your Portfolio</h1>
            <p className="text-lg text-foreground/70">
              Manage all your properties in one place
            </p>
          </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Properties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{properties.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Portfolio Value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${calculateTotalValue().toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Rental Income</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${calculateTotalRent().toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties List */}
        {properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Home className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
              <p className="text-muted-foreground mb-6 text-center">
                Start building your portfolio by adding your first property
              </p>
              <Button onClick={() => navigate('/add-property')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const hasImage = property.image_url && property.image_url.trim() && property.image_url.length > 50
              
              // Debug logging
              if (hasImage) {
                console.log(`🖼️ Property "${property.name}" has image:`, {
                  length: property.image_url.length,
                  preview: property.image_url.substring(0, 30) + '...',
                  startsWith: property.image_url.substring(0, 10)
                })
              } else {
                console.log(`⚠️ Property "${property.name}" has NO image:`, {
                  image_url: property.image_url,
                  isNull: property.image_url === null,
                  isUndefined: property.image_url === undefined,
                  isEmpty: !property.image_url || property.image_url.trim() === ''
                })
              }
              
              return (
              <Card key={property.id} className="hover:shadow-lg transition overflow-hidden">
                {/* Property Image */}
                <div className="relative w-full h-48 overflow-hidden bg-muted">
                  {hasImage ? (
                    <img
                      src={property.image_url}
                      alt={property.name || 'Property image'}
                      className="w-full h-full object-cover"
                      style={{ display: 'block' }}
                      loading="lazy"
                      onLoad={(e) => {
                        console.log('✅✅✅ Image loaded successfully for:', property.name)
                        // Hide placeholder when image loads
                        const placeholder = e.target.parentElement.querySelector('.image-placeholder')
                        if (placeholder) placeholder.style.display = 'none'
                      }}
                      onError={(e) => {
                        console.error('❌❌❌ Image FAILED to load for:', property.name)
                        console.error('Image URL type:', typeof property.image_url)
                        console.error('Image URL length:', property.image_url?.length)
                        console.error('Image starts with:', property.image_url?.substring(0, 20))
                        e.target.style.display = 'none'
                        const placeholder = e.target.parentElement.querySelector('.image-placeholder')
                        if (placeholder) {
                          placeholder.style.display = 'flex'
                          placeholder.classList.remove('hidden')
                        }
                      }}
                    />
                  ) : null}
                  {/* Placeholder - shown when no image or image fails */}
                  <div 
                    className="image-placeholder w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center absolute inset-0"
                    style={{ display: hasImage ? 'none' : 'flex', zIndex: hasImage ? 0 : 1 }}
                  >
                    <Home className="h-16 w-16 text-primary/30" />
                  </div>
                </div>
                
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {property.address}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/add-property?edit=${property.id}`)}
                        title="Edit property (coming soon)"
                        disabled
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(property.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Purchase Price</p>
                      <p className="font-semibold">
                        ${property.purchase_price?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Value</p>
                      <p className="font-semibold">
                        ${property.current_value?.toLocaleString() || property.purchase_price?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly Rent</p>
                      <p className="font-semibold">
                        ${property.monthly_rent?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROI</p>
                      <p className="font-semibold text-primary">
                        {calculateROI(property)}%
                      </p>
                    </div>
                  </div>
                  {property.property_type && (
                    <div>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {property.property_type}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/roi-calculator/${property.id}`)}
                  >
                    Calculate ROI
                  </Button>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}


