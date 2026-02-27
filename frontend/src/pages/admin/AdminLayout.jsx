import { Outlet, Link, useLocation } from 'react-router-dom'
import {
    Building2,
    Users,
    CreditCard,
    MessageSquare,
    LayoutDashboard,
    LogOut,
    ShieldAlert
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: Building2, label: 'Properties', path: '/admin/properties' },
    { icon: CreditCard, label: 'Subscriptions', path: '/admin/subscriptions' },
    { icon: MessageSquare, label: 'Chat Logs', path: '/admin/chats' },
]

export default function AdminLayout() {
    const location = useLocation()
    const { signOut } = useAuth()

    return (
        <div className="flex min-h-screen bg-muted/30">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-background border-r flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b">
                    <ShieldAlert className="h-6 w-6 text-primary mr-2" />
                    <span className="font-bold text-lg tracking-tight">Admin Portal</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname.includes(item.path)
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                  flex items-center px-3 py-2.5 rounded-lg transition-colors
                  ${isActive
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }
                `}
                            >
                                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        onClick={signOut}
                    >
                        <LogOut className="h-5 w-5 mr-3" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header (optional, simple version for now) */}
                <header className="h-16 flex items-center justify-between px-6 border-b bg-background md:hidden">
                    <div className="flex items-center">
                        <ShieldAlert className="h-6 w-6 text-primary mr-2" />
                        <span className="font-bold">Admin Portal</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 lg:p-10">
                    <div className="max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    )
}
