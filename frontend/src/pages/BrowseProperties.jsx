import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Home, 
  Loader2, 
  Filter, 
  SlidersHorizontal, 
  ArrowUpDown, 
  DollarSign, 
  TrendingUp, 
  MapPin,
  X,
  ChevronDown
} from 'lucide-react'
import { propertiesApi } from '@/services/api.service'
import { useToast } from '@/hooks/use-toast'
import Navbar from '@/components/Navbar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function BrowseProperties() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFilterVisible, setIsFilterVisible] = useState(false)

  // Filter States
  const [filters, setFilters] = useState({
    search: '',
    property_type: 'All',
    min_price: '',
    max_price: '',
    sortBy: 'createdAt'
  })

  // Options for dropdowns
  const propertyTypes = ['All', 'House', 'Apartment', 'Condo', 'Townhouse', 'Land', 'Commercial']
  const sortOptions = [
    { label: 'Newest First', value: 'createdAt' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Highest ROI', value: 'roi_desc' },
    { label: 'Monthly Rent', value: 'rent_desc' }
  ]

  const loadProperties = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        ...filters,
        property_type: filters.property_type === 'All' ? '' : filters.property_type,
        // Map UI sort labels to backend compatible strings if needed
        // Currently backend supports sortBy=createdAt, purchase_price, monthly_rent
        // I'll handle specific sorting like 'price_asc' manually or via backend if updated
      }
      
      const data = await propertiesApi.getPublic(params)
      
      // Client-side sorting for features not yet in backend (like ASC/DESC or ROI)
      let results = Array.isArray(data) ? data : []
      
      if (filters.sortBy === 'price_asc') {
        results.sort((a, b) => a.purchase_price - b.purchase_price)
      } else if (filters.sortBy === 'price_desc') {
        results.sort((a, b) => b.purchase_price - a.purchase_price)
      } else if (filters.sortBy === 'roi_desc') {
        results.sort((a, b) => {
          const roiA = (a.monthly_rent * 12) / a.purchase_price
          const roiB = (b.monthly_rent * 12) / b.purchase_price
          return roiB - roiA
        })
      } else if (filters.sortBy === 'rent_desc') {
        results.sort((a, b) => b.monthly_rent - a.monthly_rent)
      }

      setProperties(results)
    } catch (error) {
      console.error('Error loading properties:', error)
      toast({
        title: 'Search Failed',
        description: 'Unable to fetch properties. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProperties()
    }, 400) // Debounce search/filter changes
    return () => clearTimeout(timer)
  }, [loadProperties])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      property_type: 'All',
      min_price: '',
      max_price: '',
      sortBy: 'createdAt'
    })
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.property_type !== 'All') count++
    if (filters.min_price) count++
    if (filters.max_price) count++
    if (filters.sortBy !== 'createdAt') count++
    return count
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Navbar variant="dashboard" showBackButton={true} backPath="/dashboard" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header & Main Search */}
        <div className="space-y-6 mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-2">
            <TrendingUp className="h-4 w-4" />
            Find Your Next Investment
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Browse Properties
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover verified properties from top investors worldwide. Use filters to narrow down your investment criteria.
          </p>

          {/* Centered Search Bar */}
          <div className="max-w-2xl mx-auto relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            <div className="relative flex items-center bg-card border border-border shadow-2xl rounded-2xl p-2 transition-all group-focus-within:border-primary/50 group-focus-within:ring-4 group-focus-within:ring-primary/10">
              <Search className="ml-4 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by property name, city, or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="border-0 focus-visible:ring-0 text-lg py-6 shadow-none bg-transparent"
              />
              <Button 
                variant={isFilterVisible ? "secondary" : "ghost"}
                onClick={() => setIsFilterVisible(!isFilterVisible)}
                className="mr-2 rounded-xl h-12 gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {getActiveFilterCount() > 0 && (
                  <Badge variant="default" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expandable Filter Panel */}
        <div className={`
          overflow-hidden transition-all duration-500 ease-in-out
          ${isFilterVisible ? 'max-h-[500px] opacity-100 mb-10' : 'max-h-0 opacity-0'}
        `}>
          <Card className="border-primary/20 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-4">
                {/* Property Type */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                    <Home className="h-4 w-4" /> Property Type
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between rounded-xl">
                        {filters.property_type}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-card">
                      {propertyTypes.map(type => (
                        <DropdownMenuItem 
                          key={type} 
                          onClick={() => handleFilterChange('property_type', type)}
                          className={filters.property_type === type ? "bg-primary/10 text-primary" : ""}
                        >
                          {type}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Price Range */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Price Range ($)
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.min_price}
                      onChange={(e) => handleFilterChange('min_price', e.target.value)}
                      className="rounded-xl"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.max_price}
                      onChange={(e) => handleFilterChange('max_price', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Sorting */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/70 flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" /> Sort By
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between rounded-xl">
                        {sortOptions.find(o => o.value === filters.sortBy)?.label}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-card">
                      {sortOptions.map(opt => (
                        <DropdownMenuItem 
                          key={opt.value} 
                          onClick={() => handleFilterChange('sortBy', opt.value)}
                          className={filters.sortBy === opt.value ? "bg-primary/10 text-primary" : ""}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border/50">
                <Button variant="ghost" onClick={clearFilters} className="rounded-xl">
                  <X className="h-4 w-4 mr-2" /> Reset All
                </Button>
                <Button onClick={() => setIsFilterVisible(false)} className="rounded-xl px-8">
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching...
              </span>
            ) : (
              <span>Showing <strong>{properties.length}</strong> matching properties</span>
            )}
          </p>
        </div>

        {/* Content Area */}
        {loading && properties.length === 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {[1, 2, 3, 4, 5, 6].map(i => (
               <div key={i} className="h-[400px] bg-card rounded-2xl border border-border animate-pulse" />
             ))}
          </div>
        ) : properties.length === 0 ? (
          <Card className="border-dashed py-20 text-center bg-card/30">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <Filter className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-2xl font-bold">No matching properties</h3>
              <p className="text-muted-foreground">
                We couldn't find any properties matching your current filters. Try adjust your budget or searching for a different area.
              </p>
              <Button onClick={clearFilters} variant="outline" className="mt-4 rounded-xl">
                Clear all filters
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-1000">
            {properties.map((property) => {
              const price = parseFloat(property.purchase_price || 0)
              const rent = parseFloat(property.monthly_rent || 0)
              const roi = price > 0 ? ((rent * 12) / price * 100).toFixed(1) : '0.0'
              const hasImage = property.image_url && property.image_url.length > 50

              return (
                <Card 
                  key={property.id} 
                  className="group hover:shadow-2xl transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/user/${property.userId}/properties`)}
                >
                  {/* Image Header */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {hasImage ? (
                      <img
                        src={property.image_url}
                        alt={property.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                        <Home className="h-16 w-16 text-primary/20" />
                      </div>
                    )}
                    
                    {/* Floating Badges */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                       <Badge className="bg-background/90 text-foreground backdrop-blur-md border-none shadow-lg">
                          {property.property_type || 'Property'}
                       </Badge>
                       {parseFloat(roi) > 8 && (
                         <Badge className="bg-emerald-500 text-white border-none shadow-lg animate-pulse">
                            🔥 High ROI
                         </Badge>
                       )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                       <p className="text-white font-bold text-lg truncate">
                         {property.name}
                       </p>
                       <p className="text-white/80 text-sm flex items-center gap-1">
                         <MapPin className="h-3 w-3" /> {property.addressCity || 'Pakistan'}
                       </p>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Price</p>
                        <p className="text-xl font-bold text-foreground">
                          ${property.purchase_price?.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Annual ROI</p>
                        <p className="text-xl font-bold text-primary">
                          {roi}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                             INV
                          </div>
                          <span className="text-xs text-muted-foreground">View Investor Profile</span>
                       </div>
                       <Button size="sm" variant="ghost" className="rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                          Details
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
