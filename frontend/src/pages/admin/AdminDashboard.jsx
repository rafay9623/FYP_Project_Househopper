import { useEffect, useState } from 'react'
import { usersApi, propertiesApi, propertyAuthApi } from '@/services/api.service'
import { Loader2, Users, Building2, CreditCard, ShieldAlert, BadgeCheck } from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        properties: 0,
        subscriptions: 0,
        fraudAlerts: 0,
        pendingVerifications: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        async function fetchStats() {
            try {
                setLoading(true)
                const data = await propertiesApi.adminGetStats()
                
                if (isMounted) {
                    if (data && typeof data === 'object' && !data.error) {
                        setStats({
                            users: data.users || 0,
                            properties: data.properties || 0,
                            subscriptions: data.subscriptions || 0,
                            fraudAlerts: data.fraudAlerts || 0,
                            pendingVerifications: data.pendingVerifications || 0,
                        })
                    } else {
                        // Fallback to old expensive method if admin stats fails
                        const [users, properties, authRequests] = await Promise.all([
                            usersApi.adminGetAll().catch(() => []),
                            propertiesApi.adminGetAll().catch(() => []),
                            propertyAuthApi.getAllRequests().catch(() => ({ requests: [] }))
                        ])
                        
                        const safeUsers = Array.isArray(users) ? users : []
                        const safeProps = Array.isArray(properties) ? properties : []
                        const safeRequests = Array.isArray(authRequests?.requests) ? authRequests.requests : (Array.isArray(authRequests) ? authRequests : [])

                        setStats({
                            users: safeUsers.length,
                            properties: safeProps.length,
                            subscriptions: safeUsers.filter(u => {
                                const p = u.subscriptionPlan || 'basic'
                                return p !== 'basic' && p !== 'free'
                            }).length,
                            fraudAlerts: safeProps.filter(p => p.status === 'flagged' || p.isFlagged).length || 0,
                            pendingVerifications: safeRequests.filter(r => r.status === 'pending').length,
                        })
                    }
                }
            } catch (err) {
                console.error("Dashboard Stats Error:", err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchStats()
        return () => { isMounted = false }
    }, [])


    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">
                    Platform generalized metrics and statistics.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Total Users</div>
                        <div className="text-3xl font-bold mt-2">{stats.users}</div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="h-6 w-6" />
                    </div>
                </div>

                <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Properties</div>
                        <div className="text-3xl font-bold mt-2">{stats.properties}</div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Building2 className="h-6 w-6" />
                    </div>
                </div>

                <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Active Subscriptions</div>
                        <div className="text-3xl font-bold mt-2">{stats.subscriptions}</div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                        <CreditCard className="h-6 w-6" />
                    </div>
                </div>

                <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Fraud Alerts</div>
                        <div className="text-3xl font-bold mt-2">{stats.fraudAlerts}</div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <ShieldAlert className="h-6 w-6" />
                    </div>
                </div>

                <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">Pending Verifications</div>
                        <div className="text-3xl font-bold mt-2">{stats.pendingVerifications}</div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <BadgeCheck className="h-6 w-6" />
                    </div>
                </div>
            </div>
        </div>
    )
}
