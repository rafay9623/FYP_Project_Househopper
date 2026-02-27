import { useEffect, useState } from 'react'
import { propertiesApi } from '@/services/api.service'
import { Loader2, Trash2, ShieldAlert, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function AdminProperties() {
    const [properties, setProperties] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        async function fetchProperties() {
            try {
                const data = await propertiesApi.getAll()
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
            // In a real implementation we call the actual delete endpoint and refresh list
            // await propertiesApi.delete(id)
            setProperties(prev => prev.filter(p => (p.id || p._id) !== id))
            alert('Property deleted. (Mocked for now)')
        } catch (error) {
            console.error('Failed to delete property', error)
            alert('Error deleting property.')
        }
    }

    const handleVerify = async (id) => {
        // In a real implementation we call an admin verify endpoint
        alert(`Property ${id} verified. Endpoint needed to save state!`)
    }

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
                        Verify listings, approve properties, and clear fraud flags.
                    </p>
                </div>
                <Badge variant="secondary" className="px-4 py-2 text-sm">{properties.length} Properties</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {properties.map(property => (
                    <div key={property._id || property.id} className="border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col">
                        <div className="relative h-48 bg-muted">
                            {property.images && property.images.length > 0 ? (
                                <img
                                    src={property.images[0]}
                                    alt={property.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    No Image
                                </div>
                            )}
                            {property.isFlagged && (
                                <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs font-bold flex items-center shadow-lg">
                                    <ShieldAlert className="w-3 h-3 mr-1" /> Flagged
                                </div>
                            )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                            <p className="text-muted-foreground text-sm flex-1">{property.location?.city || property.city}, {property.location?.country || property.country}</p>

                            <div className="mt-4 font-medium text-primary">
                                PKR {property.price?.toLocaleString() || property.price}
                            </div>

                            <div className="h-px bg-border my-4" />

                            <div className="flex gap-2 justify-between">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleVerify(property._id || property.id)}>
                                    <CheckCircle className="w-4 h-4 mr-2" /> Verify
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDelete(property._id || property.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {properties.length === 0 && (
                    <div className="col-span-full py-12 text-center border rounded-xl bg-card text-muted-foreground">
                        No properties found in the system.
                    </div>
                )}
            </div>
        </div>
    )
}
