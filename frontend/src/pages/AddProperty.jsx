import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, AlertCircle, Loader2, CheckCircle2, Calendar } from 'lucide-react'
import { propertiesApi } from '@/services/api.service'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'

export default function AddProperty() {
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    purchase_price: '',
    current_value: '',
    monthly_rent: '',
    property_type: '',
    purchase_date: '',
    description: '',
    image: null,
  })

  const validateForm = () => {
    const newErrors = {}

    // Required field validations
    if (!formData.name.trim()) {
      newErrors.name = 'Property name is required'
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Property name must be at least 3 characters'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    } else if (formData.address.trim().length < 5) {
      newErrors.address = 'Address must be at least 5 characters'
    }

    // Numeric validations
    if (formData.purchase_price) {
      const price = parseFloat(formData.purchase_price)
      if (isNaN(price) || price <= 0) {
        newErrors.purchase_price = 'Purchase price must be a positive number'
      }
    } else {
      newErrors.purchase_price = 'Purchase price is required'
    }

    if (formData.current_value) {
      const value = parseFloat(formData.current_value)
      if (isNaN(value) || value < 0) {
        newErrors.current_value = 'Current value must be a positive number or zero'
      }
    }

    if (formData.monthly_rent) {
      const rent = parseFloat(formData.monthly_rent)
      if (isNaN(rent) || rent < 0) {
        newErrors.monthly_rent = 'Monthly rent must be a positive number or zero'
      }
    }

    // Date validation
    if (formData.purchase_date) {
      const purchaseDate = new Date(formData.purchase_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (purchaseDate > today) {
        newErrors.purchase_date = 'Purchase date cannot be in the future'
      }
    }

    // Image validation
    if (formData.image) {
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (formData.image.size > maxSize) {
        newErrors.image = 'Image size must be less than 5MB'
      }
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validTypes.includes(formData.image.type)) {
        newErrors.image = 'Please upload a valid image (JPEG, PNG, or WebP)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      // Clear previous image errors
      setErrors({ ...errors, image: null })
      
      // Validate file size
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        setErrors({ ...errors, image: 'Image size must be less than 5MB' })
        return
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setErrors({ ...errors, image: 'Please upload a valid image (JPEG, PNG, or WebP)' })
        return
      }

      setFormData({ ...formData, image: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        setImagePreview(base64String)
        console.log('📸 Image loaded, base64 length:', base64String?.length || 0)
      }
      reader.onerror = () => {
        console.error('❌ Error reading image file')
        setErrors({ ...errors, image: 'Failed to read image file' })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setFormData({ ...formData, image: null })
    setImagePreview(null)
    setErrors({ ...errors, image: null })
  }

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: null })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (authLoading) {
      toast({
        title: 'Authentication Error',
        description: 'Please wait for authentication to complete.',
        variant: 'destructive',
      })
      return
    }

    // Validate form
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form before submitting.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Validate required fields one more time before submission
      if (!formData.name || !formData.name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Property name is required.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
      
      if (!formData.address || !formData.address.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Address is required.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
      
      if (!formData.purchase_price || isNaN(parseFloat(formData.purchase_price))) {
        toast({
          title: 'Validation Error',
          description: 'Purchase price is required and must be a valid number.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
      
      // Prepare property data with proper null handling
      const propertyData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        purchase_price: parseFloat(formData.purchase_price),
      }
      
      console.log('📋 Form data before processing:', formData)
      
      // Optional fields - only include if they have values
      if (formData.current_value && formData.current_value.toString().trim()) {
        const value = parseFloat(formData.current_value)
        if (!isNaN(value) && value >= 0) {
          propertyData.current_value = value
        }
      }
      
      if (formData.monthly_rent && formData.monthly_rent.toString().trim()) {
        const rent = parseFloat(formData.monthly_rent)
        if (!isNaN(rent) && rent >= 0) {
          propertyData.monthly_rent = rent
        }
      }
      
      if (formData.property_type && formData.property_type.toString().trim()) {
        propertyData.property_type = formData.property_type.toString().trim()
      }
      
      if (formData.purchase_date && formData.purchase_date.toString().trim()) {
        propertyData.purchase_date = formData.purchase_date.toString().trim()
      }
      
      if (formData.description && formData.description.toString().trim()) {
        propertyData.description = formData.description.toString().trim()
      }
      
      // Add image as base64 data URL if available
      if (imagePreview) {
        propertyData.image_url = imagePreview
        console.log('📸 Image included in property data (length:', imagePreview.length, 'chars)')
      } else {
        console.log('⚠️ No image preview available')
      }
      
      // Ensure purchase_price is valid
      if (isNaN(propertyData.purchase_price) || propertyData.purchase_price <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Purchase price must be a valid positive number.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
      
      console.log('📤 Submitting property data:', JSON.stringify(propertyData, null, 2))
      console.log('📤 Property data keys:', Object.keys(propertyData))
      console.log('📤 Property data values:', Object.values(propertyData))

      const result = await propertiesApi.create(propertyData)
      console.log('✅ Property created successfully:', result)
      
      toast({
        title: 'Success!',
        description: 'Property added successfully to your portfolio.',
      })
      
      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/portfolio')
      }, 1000)
    } catch (error) {
      console.error('❌ Error creating property:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        details: error.details,
        stack: error.stack,
        name: error.name
      })
      
      let errorMessage = 'Failed to add property. Please try again.'
      
      // Check if error has details from API
      if (error.details && Array.isArray(error.details)) {
        errorMessage = error.details.join(', ')
      } else if (error.message) {
        errorMessage = error.message
        
        // Clean up error messages
        if (errorMessage.includes('HTTP error! status:')) {
          const statusMatch = errorMessage.match(/status: (\d+)/)
          if (statusMatch) {
            const status = statusMatch[1]
            if (status === '401') {
              errorMessage = 'Authentication failed. Please sign in again.'
            } else if (status === '400') {
              // Try to extract the actual error message
              const parts = errorMessage.split('status: ' + status)
              if (parts.length > 1 && parts[1].trim()) {
                errorMessage = parts[1].trim()
              } else if (error.details) {
                errorMessage = Array.isArray(error.details) ? error.details.join(', ') : error.details
              } else {
                errorMessage = 'Invalid data. Please check your input and try again.'
              }
            } else if (status === '500') {
              errorMessage = 'Server error. Please try again later.'
            } else if (status === '404') {
              errorMessage = 'API endpoint not found. Please check if the server is running.'
            }
          }
        }
      }
      
      // Check for common errors
      if (errorMessage.includes('connect') || errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to server. Please make sure the backend server is running on port 3001.'
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please sign in again.'
      }
      
      // Show specific validation errors
      if (error.details && Array.isArray(error.details)) {
        const validationErrors = error.details.filter(d => typeof d === 'string')
        if (validationErrors.length > 0) {
          errorMessage = validationErrors.join('. ')
        }
      }
      
      toast({
        title: 'Error Adding Property',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <Navbar variant="dashboard" showBackButton={true} backPath="/dashboard" />

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Add New Property
            </h1>
            <p className="text-lg text-foreground/70">
              Add a property to your portfolio with details and images
            </p>
          </div>

        <Card className="shadow-lg border-border animate-in fade-in slide-in-from-bottom-4 duration-700">
          <CardHeader>
            <CardTitle className="text-2xl">Property Details</CardTitle>
            <CardDescription>
              Fill in the information about your property. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Property Image */}
              <div className="space-y-2">
                <Label>Property Image (Optional)</Label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative group">
                      <img
                        src={imagePreview}
                        alt="Property preview"
                        className="h-48 w-48 rounded-lg object-cover border-2 border-border shadow-md transition-transform group-hover:scale-105"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-all hover:bg-primary/5 group">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                      <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">Upload Image</span>
                      <span className="text-xs text-muted-foreground mt-1">Max 5MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {errors.image && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.image}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Property Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Property Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Downtown Apartment"
                  className={errors.name ? 'border-destructive' : ''}
                  required
                />
                {errors.name && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="123 Main St, City, State, ZIP"
                  className={errors.address ? 'border-destructive' : ''}
                  required
                  rows={3}
                />
                {errors.address && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.address}
                  </p>
                )}
              </div>

              {/* Property Type */}
              <div className="space-y-2">
                <Label htmlFor="property_type">Property Type</Label>
                <Input
                  id="property_type"
                  value={formData.property_type}
                  onChange={(e) => handleInputChange('property_type', e.target.value)}
                  placeholder="e.g., Apartment, House, Condo"
                />
              </div>

              {/* Purchase Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price ($) *</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_price}
                    onChange={(e) => handleInputChange('purchase_price', e.target.value)}
                    placeholder="0.00"
                    className={errors.purchase_price ? 'border-destructive' : ''}
                    required
                  />
                  {errors.purchase_price && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.purchase_price}
                    </p>
                  )}
                </div>

                {/* Current Value */}
                <div className="space-y-2">
                  <Label htmlFor="current_value">Current Value ($)</Label>
                  <Input
                    id="current_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.current_value}
                    onChange={(e) => handleInputChange('current_value', e.target.value)}
                    placeholder="0.00"
                    className={errors.current_value ? 'border-destructive' : ''}
                  />
                  {errors.current_value && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.current_value}
                    </p>
                  )}
                </div>
              </div>

              {/* Monthly Rent */}
              <div className="space-y-2">
                <Label htmlFor="monthly_rent">Monthly Rent ($)</Label>
                <Input
                  id="monthly_rent"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_rent}
                  onChange={(e) => handleInputChange('monthly_rent', e.target.value)}
                  placeholder="0.00"
                  className={errors.monthly_rent ? 'border-destructive' : ''}
                />
                {errors.monthly_rent && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.monthly_rent}
                  </p>
                )}
              </div>

              {/* Purchase Date */}
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <div className="relative">
                  <Input
                    id="purchase_date"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.purchase_date}
                    onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                    className={errors.purchase_date ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('purchase_date')
                      if (input) {
                        input.focus()
                        if (input.showPicker) {
                          input.showPicker()
                        } else {
                          input.click()
                        }
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1"
                    aria-label="Open date picker"
                    tabIndex={-1}
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                </div>
                {errors.purchase_date && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.purchase_date}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add details about the property..."
                  rows={4}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Add Property
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}

