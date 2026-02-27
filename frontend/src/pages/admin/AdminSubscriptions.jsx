import { useEffect, useState } from 'react'
import { usersApi } from '@/services/api.service'
import { Loader2, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function AdminSubscriptions() {
    const [usersWithSubs, setUsersWithSubs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        async function fetchSubscriptions() {
            try {
                const data = await usersApi.getAll()
                if (isMounted) {
                    const safeData = Array.isArray(data) ? data : []
                    const subs = safeData.filter(u => u.subscriptionPlan && u.subscriptionPlan !== 'free')
                    setUsersWithSubs(subs)
                }
            } catch (err) {
                console.error("Failed to fetch subscriptions", err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchSubscriptions()
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
        <div className="space-y-6 py-4">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor active, cancelled, and renewing subscriptions.
                    </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CreditCard className="h-6 w-6" />
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-medium">User Email</th>
                            <th className="px-6 py-4 font-medium">Plan Type</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Auto Renew</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {usersWithSubs.map((user) => (
                            <tr key={user.uid || user._id || user.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">{user.email}</td>
                                <td className="px-6 py-4">
                                    <Badge variant="outline" className="capitalize">
                                        {user.subscriptionPlan || 'Premium'}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 shadow-none border-none">
                                        Active
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">
                                    Yes
                                </td>
                            </tr>
                        ))}

                        {usersWithSubs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                                    <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-2" />
                                    <p>No active subscriptions found.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
