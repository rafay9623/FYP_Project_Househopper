import { useEffect, useState } from 'react'
import { usersApi, propertiesApi } from '@/services/api.service'
import { Loader2, Users, Building2, CreditCard, ShieldAlert } from 'lucide-react'

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        properties: 0,
        subscriptions: 0,
        fraudAlerts: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        async function fetchStats() {
            try {
                const [users, properties] = await Promise.all([
                    usersApi.getAll().catch(() => []),
                    propertiesApi.getAll().catch(() => [])
                ])

                if (isMounted) {
                    const safeUsers = Array.isArray(users) ? users : []
                    const safeProps = Array.isArray(properties) ? properties : []

                    setStats({
                        users: safeUsers.length,
                        properties: safeProps.length,
                        subscriptions: safeUsers.filter(u => u.subscriptionPlan && u.subscriptionPlan !== 'free').length || 0,
                        fraudAlerts: safeProps.filter(p => p.status === 'flagged' || p.isFlagged).length || 0,
                    })
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
            </div>
        </div>
    )
}
