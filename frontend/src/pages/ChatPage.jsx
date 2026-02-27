import { useState, useEffect, useRef } from 'react'
import { Plus, MessageSquare, Send, Bot, Home, Loader2, Sparkles, Trash2, ChevronLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/helpers'
import { useAuth } from '@/contexts/AuthContext'
import { Link } from 'react-router-dom'
import AnimatedSection from '@/components/AnimatedSection'
import Navbar from '@/components/Navbar'

export default function ChatPage() {
    const [conversations, setConversations] = useState([])
    const [activeConversationId, setActiveConversationId] = useState(null)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [conversationsLoading, setConversationsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const { user: currentUser } = useAuth()
    const scrollRef = useRef(null)
    const inputRef = useRef(null)

    // Load conversations list
    const fetchConversations = async () => {
        try {
            const token = await currentUser.getIdToken()
            const response = await fetch('/api/conversations', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            console.log('Fetched conversations:', data)
            if (data.success) {
                setConversations(data.conversations)
            }
        } catch (error) {
            console.error('Error fetching conversations:', error)
        } finally {
            setConversationsLoading(false)
        }
    }

    // Load messages for a specific conversation
    const fetchMessages = async (id) => {
        setLoading(true)
        try {
            const token = await currentUser.getIdToken()
            const response = await fetch(`/api/conversations/${id}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setMessages(data.messages)
            }
        } catch (error) {
            console.error('Error fetching messages:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (currentUser) {
            fetchConversations()
        }
    }, [currentUser])

    useEffect(() => {
        if (activeConversationId) {
            fetchMessages(activeConversationId)
        } else {
            setMessages([])
        }
    }, [activeConversationId])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight)
        }
    }, [messages])

    const startNewChat = () => {
        setActiveConversationId(null)
        setMessages([])
        if (inputRef.current) inputRef.current.focus()
    }

    const handleDeleteConversation = async (e, id) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this conversation?')) return

        try {
            const token = await currentUser.getIdToken()
            const response = await fetch(`/api/conversations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await response.json()
            if (data.success) {
                setConversations(prev => prev.filter(c => c.id !== id))
                if (activeConversationId === id) {
                    startNewChat()
                }
            }
        } catch (error) {
            console.error('Error deleting conversation:', error)
        }
    }

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const userMessage = input.trim()
        setInput('')

        // Optimistic update for UI
        const tempId = Date.now().toString()
        setMessages(prev => [...prev, { id: tempId, role: 'user', text: userMessage, createdAt: new Date().toISOString() }])
        setLoading(true)

        try {
            const token = await currentUser.getIdToken()
            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMessage,
                    conversationId: activeConversationId,
                    history: messages.map(m => ({ role: m.role, text: m.text }))
                })
            })

            const data = await response.json()
            if (data.error) throw new Error(data.error)

            // If it was a new conversation, update active ID and refresh list
            if (!activeConversationId && data.conversationId) {
                setActiveConversationId(data.conversationId)
                fetchConversations()
            }

            setMessages(prev => {
                // Remove the optimistic message and add the real ones (or just add model response)
                const filtered = prev.filter(m => m.id !== tempId)
                return [...filtered,
                { role: 'user', text: userMessage },
                { role: 'model', text: data.response, properties: data.properties }
                ]
            })

        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I failed to respond. Please try again.', isError: true }])
        } finally {
            setLoading(false)
        }
    }

    const filteredConversations = conversations.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar variant="dashboard" />

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-80 border-r border-white/5 bg-muted/20 flex flex-col hidden md:flex">
                    <div className="p-4 space-y-4">
                        <Button
                            onClick={startNewChat}
                            className="w-full justify-start gap-2 bg-secondary/80 hover:bg-secondary text-white rounded-xl py-6"
                        >
                            <Plus className="h-5 w-5" />
                            New Chat
                        </Button>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search chats..."
                                className="pl-9 bg-background/50 border-white/5 rounded-xl h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-2">
                        <div className="space-y-1 pb-4">
                            {conversationsLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-secondary/50" />
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="text-center py-8 text-sm text-muted-foreground px-4">
                                    {searchTerm ? 'No chats match your search' : 'No previous conversations'}
                                </div>
                            ) : (
                                filteredConversations.map(conv => (
                                    <div
                                        key={conv.id}
                                        onClick={() => setActiveConversationId(conv.id)}
                                        className={cn(
                                            "group p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between",
                                            activeConversationId === conv.id
                                                ? "bg-secondary/10 border border-secondary/20"
                                                : "hover:bg-white/5 border border-transparent"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <MessageSquare className={cn("h-4 w-4 flex-shrink-0", activeConversationId === conv.id ? "text-secondary" : "text-muted-foreground")} />
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium truncate">{conv.title || 'Untitled Chat'}</p>
                                                <p className="text-xs text-muted-foreground truncate opacity-70">
                                                    {new Date(conv.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-opacity"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main Chat Area */}
                <main className="flex-1 flex flex-col relative bg-background/50 backdrop-blur-3xl">
                    {/* Chat Header (Mobile Only) */}
                    <div className="md:hidden p-4 border-b border-white/5 flex items-center justify-between">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ChevronLeft className="h-4 w-4" />
                            History
                        </Button>
                        <h2 className="text-sm font-semibold">HouseHopper AI</h2>
                        <Button variant="ghost" size="icon" onClick={startNewChat}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4 md:p-8" ref={scrollRef}>
                        <div className="max-w-4xl mx-auto space-y-6">
                            {messages.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                                    <div className="p-4 bg-secondary/10 rounded-full mb-6 relative">
                                        <Bot className="h-12 w-12 text-secondary" />
                                        <Sparkles className="h-5 w-5 text-secondary absolute -top-1 -right-1 animate-pulse" />
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">How can I help you today?</h1>
                                    <p className="text-muted-foreground max-w-md">I can answer questions about your properties, analyze ROI, or help you find deals in our database.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-10 w-full max-w-xl">
                                        {['What properties do I own?', 'Show me properties worth > $1M', 'Calculate ROI for my flat', 'Tell me about recent listings'].map(q => (
                                            <button
                                                key={q}
                                                onClick={() => setInput(q)}
                                                className="p-4 bg-white/5 hover:bg-secondary/5 border border-white/10 hover:border-secondary/30 rounded-2xl text-sm transition-all text-left"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div key={idx} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[85%] rounded-3xl p-4 md:p-6 text-sm md:text-base leading-relaxed shadow-sm ring-1 ring-white/5",
                                        msg.role === 'user'
                                            ? "bg-secondary text-secondary-foreground rounded-tr-none"
                                            : "bg-muted/30 text-foreground rounded-tl-none backdrop-blur-md",
                                        msg.isError && "bg-destructive/10 text-destructive border border-destructive/20"
                                    )}>
                                        <div className="whitespace-pre-wrap">{msg.text}</div>

                                        {msg.properties && msg.properties.length > 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                                {msg.properties.map(prop => (
                                                    <Link
                                                        key={prop.id}
                                                        to="/portfolio"
                                                        className="flex items-center gap-3 bg-background/50 p-3 rounded-2xl border border-white/10 hover:border-secondary/50 transition-colors"
                                                    >
                                                        <div className="p-2 bg-secondary/20 rounded-xl">
                                                            <Home className="h-4 w-4 text-secondary" />
                                                        </div>
                                                        <span className="font-medium truncate">{prop.name}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted/30 rounded-3xl rounded-tl-none p-4 ring-1 ring-white/5">
                                        <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="max-w-4xl mx-auto relative group">
                            <form onSubmit={handleSend} className="relative">
                                <Input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Message HouseHopper AI..."
                                    className="h-16 pr-20 pl-6 bg-muted/20 border-white/5 rounded-[2rem] text-base focus:ring-2 focus:ring-secondary/50 focus:bg-muted/30 transition-all"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <Button
                                        type="submit"
                                        disabled={!input.trim() || loading}
                                        className="h-10 w-10 rounded-full bg-secondary hover:bg-secondary/90 text-white shadow-lg transition-transform active:scale-95"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                </div>
                            </form>
                            <p className="text-[10px] text-center mt-3 text-muted-foreground opacity-50 uppercase tracking-widest font-bold">
                                HouseHopper AI can make mistakes. Verify important information.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
