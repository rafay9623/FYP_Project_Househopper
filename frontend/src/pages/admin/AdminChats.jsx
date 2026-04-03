import { useState, useEffect } from 'react'
import { MessageSquare, AlertTriangle, Loader2 } from 'lucide-react'
import { conversationsApi } from '@/services/api.service'
import { formatDistanceToNow } from 'date-fns'

export default function AdminChats() {
    const [conversations, setConversations] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function fetchChats() {
            try {
                setLoading(true)
                const data = await conversationsApi.adminGetAll()
                setConversations(data || [])
            } catch (err) {
                console.error('Error fetching admin chats:', err)
                setError('Failed to load system chat logs.')
            } finally {
                setLoading(false)
            }
        }
        fetchChats()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col h-64 items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Fetching system logs...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col h-64 items-center justify-center space-y-3 text-destructive">
                <AlertTriangle className="h-10 w-10" />
                <p className="font-semibold">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="text-xs underline text-muted-foreground hover:text-foreground transition-colors"
                >
                    Try again
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 py-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b border-primary/10 pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chat Logs</h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        View system chat logs for moderation and performance improvement.
                    </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                    <MessageSquare className="h-6 w-6" />
                </div>
            </div>

            <div className="rounded-xl border border-primary/10 bg-card/50 backdrop-blur-sm text-card-foreground shadow-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Participants</th>
                            <th className="px-6 py-4 font-semibold">Messages</th>
                            <th className="px-6 py-4 font-semibold">Last Active</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                        {conversations.length > 0 ? (
                            conversations.map((log) => (
                                <tr key={log.id} className="group hover:bg-primary/5 transition-all duration-200">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                {log.participants[0]}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground/60 italic">
                                                and {log.participants[1]}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-secondary/10 border border-secondary/20 font-medium">
                                            {log.messageCount} messages
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-muted-foreground">
                                        {log.lastActive ? formatDistanceToNow(new Date(log.lastActive), { addSuffix: true }) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {log.status === 'Flagged' ? (
                                            <span className="inline-flex items-center text-destructive text-[10px] font-bold px-2.5 py-1 bg-destructive/10 border border-destructive/20 rounded-full uppercase tracking-tighter">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> Flagged
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-emerald-500 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-tighter">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-muted-foreground italic">
                                    No chat logs found in the system.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="p-3 text-center text-[10px] text-muted-foreground/40 border-t border-primary/10 bg-muted/10 font-mono">
                    SECURED ADMIN CHAT MONITORING • SYSTEM V1.0
                </div>
            </div>
        </div>
    )
}

