import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, User, CheckCircle, Clock, XCircle } from 'lucide-react'
import { usersApi } from '@/services/api.service'
import Navbar from '@/components/Navbar'

export default function UserProperties() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const { loading: authLoading } = useAuth()
  const [properties, setProperties] = useState([])
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && userId) {
      loadUserProperties()
      loadUserInfo()
    }
  }, [authLoading, userId])

  const loadUserProperties = async () => {
    try {
      setError(null)
      console.log('📋 Loading properties for user:', userId)
      const data = await usersApi.getPropertiesByUserId(userId)
      console.log('✅ Loaded properties:', data)
      // Handle both array and object with properties key
      const propertiesList = Array.isArray(data) ? data : (data.properties || [])
      setProperties(propertiesList)
    } catch (error) {
      console.error('Error loading user properties:', error)
      setError(error.message || 'Failed to load properties')
      setProperties([])
    } finally {
      setLoading(false)
    }
  }

  const loadUserInfo = async () => {
    try {
      console.log('👤 Loading user info for:', userId)
      const data = await usersApi.getById(userId)
      console.log('✅ Loaded user info:', data)
      // Handle both object with user key and direct object
      setUserInfo(data.user || data)
    } catch (error) {
      console.error('Error loading user info:', error)
      // Don't set error state here as it's not critical for display
    }
  }

  const getUserDisplayName = () => {
    if (userInfo) {
      if (userInfo.first_name || userInfo.last_name) {
        return `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim()
      }
      return userInfo.email || 'Unknown User'
    }
    return 'User'
  }

  const calculateROI = (property) => {
    if (!property.purchase_price || property.purchase_price === 0) return 0
    const annualRent = property.monthly_rent * 12
    const roi = (annualRent / property.purchase_price) * 100
    return roi.toFixed(2)
  }

  if (authLoading || loading) {
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
      <Navbar variant="dashboard" showBackButton={true} backPath="/browse-users" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <User className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">
                {getUserDisplayName()}'s {properties.length === 1 ? 'Property' : 'Properties'}
              </h1>
            </div>
            {userInfo?.email && (
              <p className="text-lg text-foreground/70">{userInfo.email}</p>
            )}
          </div>

          {error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Home className="h-16 w-16 text-destructive mb-4" />
                <h3 className="text-xl font-semibold mb-2">Error Loading Properties</h3>
                <p className="text-muted-foreground text-center">
                  {error}
                </p>
              </CardContent>
            </Card>
          ) : properties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Home className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Properties</h3>
                <p className="text-muted-foreground text-center">
                  This user hasn't added any properties yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {properties.map((property) => {
                const hasImage = property.image_url && property.image_url.trim() && property.image_url.length > 50
                
                return (
                  <Card key={property.id} className="overflow-hidden">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Property Image */}
                      <div className="relative w-full h-64 md:h-full min-h-[300px] overflow-hidden bg-muted">
                        {hasImage ? (
                          <img
                            src={property.image_url}
                            alt={property.name || 'Property image'}
                            className="w-full h-full object-cover"
                            style={{ display: 'block' }}
                            loading="lazy"
                            onLoad={(e) => {
                              const placeholder = e.target.parentElement.querySelector('.image-placeholder')
                              if (placeholder) placeholder.style.display = 'none'
                            }}
                            onError={(e) => {
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
                      
                      {/* Property Details */}
                      <div className="p-6 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div>
                            <CardTitle className="text-2xl mb-2">{property.name}</CardTitle>
                            <CardDescription className="text-base">
                              {property.address}
                            </CardDescription>
                          </div>
                          
                          {property.property_type && (
                            <div>
                              <span className="inline-block text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                                {property.property_type}
                              </span>
                            </div>
                          )}

                          {/* Authentication Status Badge */}
                          {property.authStatus && property.authStatus !== 'none' && (
                            <div className="pt-1">
                              {property.authStatus === 'pending' && (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1">
                                  <Clock className="h-3 w-3" /> Pending Verification
                                </Badge>
                              )}
                              {property.authStatus === 'verified' && (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                                  <CheckCircle className="h-3 w-3" /> Verified
                                </Badge>
                              )}
                              {property.authStatus === 'rejected' && (
                                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
                                  <XCircle className="h-3 w-3" /> Rejected
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {property.description && (
                            <p className="text-sm text-muted-foreground">
                              {property.description}
                            </p>
                          )}
                          
                          {/* Monthly Rent - Prominently Displayed */}
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground mb-1">Monthly Rent</p>
                            <p className="text-3xl font-bold text-primary">
                              ${property.monthly_rent?.toLocaleString() || '0'}
                            </p>
                          </div>
                          
                          {/* Other Property Details */}
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Purchase Price</p>
                              <p className="text-lg font-semibold">
                                ${property.purchase_price?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Current Value</p>
                              <p className="text-lg font-semibold">
                                ${property.current_value?.toLocaleString() || property.purchase_price?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">ROI</p>
                              <p className="text-lg font-semibold text-primary">
                                {calculateROI(property)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Annual Rent</p>
                              <p className="text-lg font-semibold">
                                ${((property.monthly_rent || 0) * 12).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
