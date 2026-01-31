import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calculator, TrendingUp, AlertCircle } from 'lucide-react'
import { propertiesApi } from '@/services/api.service'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'

export default function ROICalculator() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [calculations, setCalculations] = useState({
    annualRent: 0,
    annualROI: 0,
    cashOnCash: 0,
    capRate: 0,
    netOperatingIncome: 0,
    totalExpenses: 0,
  })
  const [inputs, setInputs] = useState({
    monthlyRent: 0,
    purchasePrice: 0,
    currentValue: 0,
    downPayment: 0,
    monthlyExpenses: 0,
    propertyTax: 0,
    insurance: 0,
    maintenance: 0,
    managementFee: 0,
  })

  useEffect(() => {
    if (!authLoading && id) {
      loadProperty()
    } else if (!authLoading && !id) {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, id])

  // Helper function to validate numbers
  const validateNumber = (value, min, max, defaultValue) => {
    const num = parseFloat(value)
    if (isNaN(num) || !isFinite(num)) {
      return defaultValue
    }
    if (num < min) {
      return min
    }
    if (num > max) {
      return max
    }
    return num
  }

  const loadProperty = async () => {
    try {
      setError(null)
      
      if (!id || typeof id !== 'string' || id.trim() === '') {
        const errorMsg = 'Invalid property ID'
        console.error(errorMsg)
        setError(errorMsg)
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const data = await propertiesApi.getById(id)
      
      if (!data || typeof data !== 'object') {
        const errorMsg = 'Invalid property data received'
        console.error(errorMsg)
        setError(errorMsg)
        toast({
          title: 'Error',
          description: 'Failed to load property data. Please try again.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      setProperty(data)
      
      // Validate and set inputs with proper checks
      const purchasePrice = parseFloat(data.purchase_price) || 0
      const monthlyRent = parseFloat(data.monthly_rent) || 0
      const currentValue = parseFloat(data.current_value) || purchasePrice || 0
      const defaultDownPayment = purchasePrice > 0 ? purchasePrice * 0.2 : 0

      // Ensure all values are valid numbers
      setInputs({
        monthlyRent: isNaN(monthlyRent) || !isFinite(monthlyRent) || monthlyRent < 0 ? 0 : monthlyRent,
        purchasePrice: isNaN(purchasePrice) || !isFinite(purchasePrice) || purchasePrice < 0 ? 0 : purchasePrice,
        currentValue: isNaN(currentValue) || !isFinite(currentValue) || currentValue < 0 ? 0 : currentValue,
        downPayment: isNaN(defaultDownPayment) || !isFinite(defaultDownPayment) || defaultDownPayment < 0 ? 0 : defaultDownPayment,
        monthlyExpenses: 0,
        propertyTax: 0,
        insurance: 0,
        maintenance: 0,
        managementFee: 0,
      })
      calculateROI()
    } catch (error) {
      console.error('Error loading property:', error)
      let errorMessage = 'Failed to load property. Please try again.'
      
      if (error.message) {
        if (error.message.includes('404') || error.message.includes('not found')) {
          errorMessage = 'Property not found. It may have been deleted.'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Authentication required. Please sign in again.'
        } else if (error.message.includes('403') || error.message.includes('Access denied')) {
          errorMessage = 'You do not have access to this property.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
      toast({
        title: 'Error Loading Property',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateROI = () => {
    // Validate and sanitize all inputs
    const monthlyRent = validateNumber(inputs.monthlyRent, 0, 1000000, 0)
    const purchasePrice = validateNumber(inputs.purchasePrice, 0, 1000000000, 0)
    const currentValue = validateNumber(inputs.currentValue, 0, 1000000000, 0)
    const downPayment = validateNumber(inputs.downPayment, 0, purchasePrice || 1000000000, 0)
    const monthlyExpenses = validateNumber(inputs.monthlyExpenses, 0, 1000000, 0)
    const propertyTax = validateNumber(inputs.propertyTax, 0, 1000000, 0)
    const insurance = validateNumber(inputs.insurance, 0, 1000000, 0)
    const maintenance = validateNumber(inputs.maintenance, 0, 1000000, 0)
    const managementFee = validateNumber(inputs.managementFee, 0, 100, 0) // Percentage 0-100

    // Validate logical constraints
    const validatedDownPayment = downPayment > purchasePrice ? purchasePrice : downPayment

    // Calculate annual values
    const annualRent = monthlyRent * 12
    
    // Calculate total expenses with validation
    const annualMonthlyExpenses = monthlyExpenses * 12
    const managementFeeAmount = annualRent * (managementFee / 100)
    const totalExpenses = 
      annualMonthlyExpenses +
      propertyTax +
      insurance +
      maintenance +
      managementFeeAmount
    
    // Ensure expenses are not negative
    const validatedTotalExpenses = totalExpenses < 0 ? 0 : totalExpenses
    
    // Calculate net operating income
    const netOperatingIncome = annualRent - validatedTotalExpenses
    
    // Calculate ROI metrics with division by zero checks
    const annualROI = purchasePrice > 0 && isFinite(purchasePrice)
      ? (annualRent / purchasePrice) * 100 
      : 0
    
    const cashOnCash = validatedDownPayment > 0 && isFinite(validatedDownPayment)
      ? (netOperatingIncome / validatedDownPayment) * 100
      : 0
    
    const capRate = currentValue > 0 && isFinite(currentValue)
      ? (netOperatingIncome / currentValue) * 100
      : 0

    // Ensure all calculated values are finite numbers
    setCalculations({
      annualRent: isFinite(annualRent) ? annualRent : 0,
      annualROI: isFinite(annualROI) ? annualROI : 0,
      cashOnCash: isFinite(cashOnCash) ? cashOnCash : 0,
      capRate: isFinite(capRate) ? capRate : 0,
      netOperatingIncome: isFinite(netOperatingIncome) ? netOperatingIncome : 0,
      totalExpenses: isFinite(validatedTotalExpenses) ? validatedTotalExpenses : 0,
    })
  }

  useEffect(() => {
    calculateROI()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs])

  const handleInputChange = (field, value) => {
    // Validate input based on field type
    let validatedValue = parseFloat(value) || 0

    // Apply field-specific validation
    switch (field) {
      case 'monthlyRent':
        validatedValue = validateNumber(value, 0, 1000000, 0)
        break
      case 'purchasePrice':
        validatedValue = validateNumber(value, 0, 1000000000, 0)
        // If purchase price changes, validate down payment doesn't exceed it
        if (validatedValue < inputs.downPayment) {
          setInputs({ 
            ...inputs, 
            [field]: validatedValue,
            downPayment: validatedValue // Cap down payment at purchase price
          })
          return
        }
        break
      case 'currentValue':
        validatedValue = validateNumber(value, 0, 1000000000, 0)
        break
      case 'downPayment':
        validatedValue = validateNumber(value, 0, inputs.purchasePrice || 1000000000, 0)
        // Ensure down payment doesn't exceed purchase price
        if (validatedValue > inputs.purchasePrice) {
          validatedValue = inputs.purchasePrice
        }
        break
      case 'monthlyExpenses':
        validatedValue = validateNumber(value, 0, 1000000, 0)
        break
      case 'propertyTax':
        validatedValue = validateNumber(value, 0, 1000000, 0)
        break
      case 'insurance':
        validatedValue = validateNumber(value, 0, 1000000, 0)
        break
      case 'maintenance':
        validatedValue = validateNumber(value, 0, 1000000, 0)
        break
      case 'managementFee':
        validatedValue = validateNumber(value, 0, 100, 0) // Percentage 0-100
        break
      default:
        validatedValue = isNaN(validatedValue) || !isFinite(validatedValue) ? 0 : validatedValue
    }

    setInputs({ ...inputs, [field]: validatedValue })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-primary/70 tracking-tight">H</span>
          </div>
          <p className="text-foreground/50 text-sm tracking-wide">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <Navbar 
        variant="dashboard" 
        showBackButton={true} 
        backPath="/portfolio" 
      />

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">ROI Calculator</h1>
            <p className="text-lg text-foreground/70">
              Calculate rental yields, cap rates, and returns for your properties
            </p>
          </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                ROI Calculator
              </CardTitle>
              <CardDescription>
                {property ? `Calculate ROI for ${property.name}` : 'Calculate ROI for your property'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Property Info */}
              {property && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">{property.name}</p>
                  <p className="text-sm text-muted-foreground">{property.address}</p>
                </div>
              )}

              {/* Income */}
              <div className="space-y-4">
                <h3 className="font-semibold">Income</h3>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Monthly Rent ($)</Label>
                  <Input
                    id="monthlyRent"
                    type="number"
                    step="0.01"
                    value={inputs.monthlyRent}
                    onChange={(e) => handleInputChange('monthlyRent', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Purchase Details */}
              <div className="space-y-4">
                <h3 className="font-semibold">Purchase Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={inputs.purchasePrice}
                      onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentValue">Current Value ($)</Label>
                    <Input
                      id="currentValue"
                      type="number"
                      step="0.01"
                      value={inputs.currentValue}
                      onChange={(e) => handleInputChange('currentValue', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="downPayment">Down Payment ($)</Label>
                    <Input
                      id="downPayment"
                      type="number"
                      step="0.01"
                      value={inputs.downPayment}
                      onChange={(e) => handleInputChange('downPayment', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div className="space-y-4">
                <h3 className="font-semibold">Expenses (Annual)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyExpenses">Monthly Expenses ($)</Label>
                    <Input
                      id="monthlyExpenses"
                      type="number"
                      step="0.01"
                      value={inputs.monthlyExpenses}
                      onChange={(e) => handleInputChange('monthlyExpenses', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="propertyTax">Property Tax ($)</Label>
                    <Input
                      id="propertyTax"
                      type="number"
                      step="0.01"
                      value={inputs.propertyTax}
                      onChange={(e) => handleInputChange('propertyTax', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance">Insurance ($)</Label>
                    <Input
                      id="insurance"
                      type="number"
                      step="0.01"
                      value={inputs.insurance}
                      onChange={(e) => handleInputChange('insurance', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance">Maintenance ($)</Label>
                    <Input
                      id="maintenance"
                      type="number"
                      step="0.01"
                      value={inputs.maintenance}
                      onChange={(e) => handleInputChange('maintenance', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managementFee">Management Fee (%)</Label>
                    <Input
                      id="managementFee"
                      type="number"
                      step="0.01"
                      value={inputs.managementFee}
                      onChange={(e) => handleInputChange('managementFee', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                ROI Results
              </CardTitle>
              <CardDescription>
                Real-time calculations based on your inputs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Annual ROI</p>
                  <p className="text-2xl font-bold text-primary">
                    {calculations.annualROI.toFixed(2)}%
                  </p>
                </div>
                <div className="p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Cash-on-Cash</p>
                  <p className="text-2xl font-bold text-accent">
                    {calculations.cashOnCash.toFixed(2)}%
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Cap Rate</p>
                  <p className="text-2xl font-bold">
                    {calculations.capRate.toFixed(2)}%
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Annual Rent</p>
                  <p className="text-2xl font-bold">
                    ${(calculations.annualRent || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Financial Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Annual Rental Income</span>
                    <span className="font-semibold">
                      ${(calculations.annualRent || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Annual Expenses</span>
                    <span className="font-semibold text-destructive">
                      -${(calculations.totalExpenses || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold text-lg">
                    <span>Net Operating Income (NOI)</span>
                    <span className="text-primary">
                      ${(calculations.netOperatingIncome || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Investment Summary */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold">Investment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase Price</span>
                    <span>${(inputs.purchasePrice || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Down Payment</span>
                    <span>${(inputs.downPayment || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Value</span>
                    <span>${(inputs.currentValue || 0).toLocaleString()}</span>
                  </div>
                  {inputs.currentValue > inputs.purchasePrice && (
                    <div className="flex justify-between pt-2 border-t text-primary font-semibold">
                      <span>Appreciation</span>
                      <span>
                        +${((inputs.currentValue || 0) - (inputs.purchasePrice || 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  )
}

