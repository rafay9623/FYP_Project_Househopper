import { MessageSquare, AlertTriangle } from 'lucide-react'

// Dummy Data since there isn't a known endpoint for fetching chat logs system-wide currently
const dummyLogs = [
    { id: 1, users: ['user1@test.com', 'owner@test.com'], messageCount: 45, flagged: false, lastActive: '2h ago' },
    { id: 2, users: ['scammer@test.com', 'buyer@test.com'], messageCount: 12, flagged: true, lastActive: '5m ago' },
    { id: 3, users: ['john@test.com', 'agent@test.com'], messageCount: 120, flagged: false, lastActive: '1d ago' },
]

export default function AdminChats() {
    return (
        <div className="space-y-6 py-4">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chat Logs</h1>
                    <p className="text-muted-foreground mt-2">
                        View system chat logs for moderation and performance improvement.
                    </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="h-6 w-6" />
                </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-medium">Participants</th>
                            <th className="px-6 py-4 font-medium">Messages</th>
                            <th className="px-6 py-4 font-medium">Last Active</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {dummyLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium">{log.users[0]}</div>
                                    <div className="text-xs text-muted-foreground">and {log.users[1]}</div>
                                </td>
                                <td className="px-6 py-4">{log.messageCount}</td>
                                <td className="px-6 py-4 text-muted-foreground">{log.lastActive}</td>
                                <td className="px-6 py-4">
                                    {log.flagged ? (
                                        <span className="inline-flex items-center text-destructive text-xs font-semibold px-2 py-1 bg-destructive/10 rounded-full">
                                            <AlertTriangle className="w-3 h-3 mr-1" /> Flagged
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-muted-foreground text-xs font-medium px-2 py-1 rounded-full bg-muted">
                                            Normal
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 text-center text-xs text-muted-foreground border-t bg-muted/20">
                    Showing dummy data. Connect to backend chat monitoring endpoint to view live system logs.
                </div>
            </div>
        </div>
    )
}
