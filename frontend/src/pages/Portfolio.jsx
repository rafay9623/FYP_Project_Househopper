import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Edit, Trash2, Home, Loader2, Plus, ShieldCheck, Clock, XCircle, CheckCircle, Upload, X, FileText, CreditCard } from 'lucide-react'
import { propertiesApi, propertyAuthApi } from '@/services/api.service'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'

export default function Portfolio() {
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [authSubmitting, setAuthSubmitting] = useState({})

  // Verification modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyPropertyId, setVerifyPropertyId] = useState(null)
  const [idCardFile, setIdCardFile] = useState(null)
  const [idCardPreview, setIdCardPreview] = useState(null)
  const [propertyDocFile, setPropertyDocFile] = useState(null)
  const [propertyDocPreview, setPropertyDocPreview] = useState(null)

  useEffect(() => {
    if (!authLoading) {
      loadProperties()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  const loadProperties = async () => {
    try {
      // Optimized: Fetch only needed fields for the portfolio list
      const fields = 'name,address,purchase_price,current_value,monthly_rent,property_type,image_url,authStatus'
      const data = await propertiesApi.getAll(fields)
      console.log('📦 Loaded properties:', data.length)
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

  // Open the verification modal
  const openVerifyModal = (propertyId) => {
    setVerifyPropertyId(propertyId)
    setIdCardFile(null)
    setIdCardPreview(null)
    setPropertyDocFile(null)
    setPropertyDocPreview(null)
    setVerifyModalOpen(true)
  }

  // File reader helper
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleIdCardChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'ID Card image must be under 5MB', variant: 'destructive' })
      return
    }
    setIdCardFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setIdCardPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handlePropertyDocChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Document must be under 5MB', variant: 'destructive' })
      return
    }
    setPropertyDocFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPropertyDocPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmitVerification = async () => {
    if (!idCardFile || !propertyDocFile) {
      toast({
        title: 'Missing Documents',
        description: 'Please upload both your ID card and property document.',
        variant: 'destructive',
      })
      return
    }

    setAuthSubmitting(prev => ({ ...prev, [verifyPropertyId]: true }))
    try {
      const idCardImage = await readFileAsBase64(idCardFile)
      const propertyDocument = await readFileAsBase64(propertyDocFile)

      await propertyAuthApi.submitRequest(verifyPropertyId, { idCardImage, propertyDocument })

      setProperties(prev =>
        prev.map(p =>
          p.id === verifyPropertyId ? { ...p, authStatus: 'pending' } : p
        )
      )
      setVerifyModalOpen(false)
      toast({
        title: 'Verification Submitted',
        description: 'Your documents have been uploaded. Admin will review them shortly.',
      })
    } catch (error) {
      console.error('Error submitting auth request:', error)
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to submit verification request.',
        variant: 'destructive',
      })
    } finally {
      setAuthSubmitting(prev => ({ ...prev, [verifyPropertyId]: false }))
    }
  }

  const getAuthBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1">
            <Clock className="h-3 w-3" /> Pending Verification
          </Badge>
        )
      case 'verified':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
            <CheckCircle className="h-3 w-3" /> Verified
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        )
      default:
        return null
    }
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
                  {/* Authentication Status Badge */}
                  {property.authStatus && property.authStatus !== 'none' && (
                    <div>{getAuthBadge(property.authStatus)}</div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/roi-calculator/${property.id}`)}
                    >
                      Calculate ROI
                    </Button>
                    {(!property.authStatus || property.authStatus === 'none' || property.authStatus === 'rejected') && (
                      <Button
                        variant="outline"
                        className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                        onClick={() => openVerifyModal(property.id)}
                        disabled={authSubmitting[property.id]}
                      >
                        {authSubmitting[property.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        Authenticate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
        </div>
      </div>

      {/* Verification Modal */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Property Verification
            </DialogTitle>
            <DialogDescription>
              Upload your ID card and property ownership document to verify your property. The admin will review these documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* ID Card Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="h-4 w-4 text-primary" />
                ID Card / CNIC Image *
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload a clear image of the property owner's ID card (CNIC). Must match property ownership records.
              </p>
              {idCardPreview ? (
                <div className="relative group">
                  <img
                    src={idCardPreview}
                    alt="ID Card preview"
                    className="w-full max-h-48 object-contain rounded-lg border-2 border-border bg-muted/30"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setIdCardFile(null); setIdCardPreview(null) }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="mt-1 text-xs text-muted-foreground truncate">{idCardFile?.name}</div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-all hover:bg-primary/5 group">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-primary">Click to upload ID Card</span>
                  <span className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WebP — Max 5MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleIdCardChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Property Document Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                Property Ownership Document *
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload the property ownership document (sale deed, allotment letter, registry, etc.)
              </p>
              {propertyDocPreview ? (
                <div className="relative group">
                  {propertyDocFile?.type === 'application/pdf' ? (
                    <div className="w-full h-32 rounded-lg border-2 border-border bg-muted/30 flex items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{propertyDocFile.name}</p>
                        <p className="text-xs text-muted-foreground">PDF Document</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={propertyDocPreview}
                      alt="Property document preview"
                      className="w-full max-h-48 object-contain rounded-lg border-2 border-border bg-muted/30"
                    />
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setPropertyDocFile(null); setPropertyDocPreview(null) }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="mt-1 text-xs text-muted-foreground truncate">{propertyDocFile?.name}</div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-all hover:bg-primary/5 group">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-primary">Click to upload Property Document</span>
                  <span className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WebP, PDF — Max 5MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={handlePropertyDocChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit */}
            <Button
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmitVerification}
              disabled={!idCardFile || !propertyDocFile || authSubmitting[verifyPropertyId]}
            >
              {authSubmitting[verifyPropertyId] ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading Documents...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

