import { useEffect, useState } from 'react'
import { propertiesApi, propertyAuthApi } from '@/services/api.service'
import { Loader2, Trash2, ShieldAlert, CheckCircle, Building2, MapPin, Home, DollarSign, Clock, XCircle, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AdminProperties() {
    const [properties, setProperties] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        let isMounted = true
        async function fetchProperties() {
            try {
                const data = await propertiesApi.adminGetAll()
                if (isMounted) {
                    setProperties(Array.isArray(data) ? data : [])
                }
            } catch (err) {
                console.error("Failed to fetch properties", err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchProperties()
        return () => { isMounted = false }
    }, [])

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this property?')) return
        try {
            setProperties(prev => prev.filter(p => p.id !== id))
        } catch (error) {
            console.error('Failed to delete property', error)
            alert('Error deleting property.')
        }
    }

    const getAuthStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1 text-xs">
                        <Clock className="h-3 w-3" /> Pending
                    </Badge>
                )
            case 'verified':
                return (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                        <CheckCircle className="h-3 w-3" /> Verified
                    </Badge>
                )
            case 'rejected':
                return (
                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 gap-1 text-xs">
                        <XCircle className="h-3 w-3" /> Rejected
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-muted gap-1 text-xs">
                        Unverified
                    </Badge>
                )
        }
    }

    const filtered = properties.filter(p => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
            (p.name || '').toLowerCase().includes(term) ||
            (p.addressCity || '').toLowerCase().includes(term) ||
            (p.property_type || '').toLowerCase().includes(term) ||
            (p.userEmail || p.userId || '').toLowerCase().includes(term)
        )
    })

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 py-4">
            <div className="flex justify-between items-center bg-background border p-4 rounded-xl">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Property Management</h1>
                    <p className="text-muted-foreground mt-2">
                        View all properties on the platform.
                    </p>
                </div>
                <Badge variant="secondary" className="px-4 py-2 text-sm">{properties.length} Properties</Badge>
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search by name, city, type, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(property => (
                    <div key={property.id} className="border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col">
                        {/* Image / Placeholder */}
                        <div className="relative h-44 bg-muted">
                            {(property.image_url || property.property_image) ? (
                                <img
                                    src={property.image_url || property.property_image}
                                    alt={property.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <Building2 className="h-10 w-10 opacity-30" />
                                    <span className="text-xs">No Image</span>
                                </div>
                            )}
                            {property.isFlagged && (
                                <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs font-bold flex items-center shadow-lg">
                                    <ShieldAlert className="w-3 h-3 mr-1" /> Flagged
                                </div>
                            )}
                            {/* Auth Status Badge */}
                            <div className="absolute top-2 right-2">
                                {getAuthStatusBadge(property.authStatus)}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 flex-1 flex flex-col gap-2">
                            <h3 className="font-semibold text-base line-clamp-1">{property.name || 'Unnamed Property'}</h3>

                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                <MapPin className="h-3 w-3" />
                                <span className="line-clamp-1">
                                    {[property.addressTown, property.addressCity, property.addressProvince].filter(Boolean).join(', ') || property.address || 'No address'}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1">
                                {property.property_type && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{property.property_type}</span>
                                )}
                                {property.purpose && (
                                    <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">{property.purpose}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                <div>
                                    <p className="text-muted-foreground">Purchase Price</p>
                                    <p className="font-semibold text-primary">
                                        PKR {(property.purchase_price || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Monthly Rent</p>
                                    <p className="font-semibold">
                                        {property.monthly_rent ? `PKR ${property.monthly_rent.toLocaleString()}` : '—'}
                                    </p>
                                </div>
                            </div>

                            {property.area && (
                                <div className="text-xs text-muted-foreground">
                                    <Home className="h-3 w-3 inline mr-1" />
                                    {property.area} {property.area_type || 'Marla'}
                                    {property.bedrooms ? ` · ${property.bedrooms} Bed` : ''}
                                    {property.baths ? ` · ${property.baths} Bath` : ''}
                                </div>
                            )}

                            <div className="h-px bg-border my-2" />

                            <div className="flex gap-2 justify-between">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => handleDelete(property.id)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="col-span-full py-12 text-center border rounded-xl bg-card text-muted-foreground">
                        {searchTerm ? `No properties matching "${searchTerm}"` : 'No properties found in the system.'}
                    </div>
                )}
            </div>
        </div>
    )
}
