import { useEffect, useState } from 'react'
import { usersApi } from '@/services/api.service'
import { AlertCircle, CheckCircle2, Loader2, MoreVertical, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let isMounted = true
        async function fetchUsers() {
            try {
                const data = await usersApi.getAll()
                if (isMounted) {
                    setUsers(Array.isArray(data) ? data : [])
                }
            } catch (err) {
                console.error("Failed to fetch users", err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchUsers()
        return () => { isMounted = false }
    }, [])

    const handleSuspendToggle = async (userId, isCurrentlySuspended) => {
        // In a real implementation we'd call an admin endpoint
        // await usersApi.updateStatus(userId, isCurrentlySuspended ? 'active' : 'suspended')
        alert(`Toggle suspend status for user ${userId}. Endpoint needed!`)
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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage system users, track roles, and handle account states.
                </p>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map((user) => (
                                <tr key={user.uid || user._id || user.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 font-medium">
                                        {user.displayName || user.firstName + ' ' + user.lastName || 'No Name'}
                                    </td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            {user.role || 'User'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.status === 'suspended' ? (
                                            <span className="inline-flex items-center text-destructive">
                                                <XCircle className="w-4 h-4 mr-1.5" /> Suspended
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-green-600 dark:text-green-400">
                                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSuspendToggle(user.uid || user._id || user.id, user.status === 'suspended')}
                                        >
                                            {user.status === 'suspended' ? 'Activate' : 'Suspend'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
