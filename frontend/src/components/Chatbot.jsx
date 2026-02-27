import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Loader2, Sparkles, Bot, Home, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/utils/helpers'
import AnimatedSection from '@/components/AnimatedSection'
import { useAuth } from '@/contexts/AuthContext'
import { Link } from 'react-router-dom'

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hi! I\'m your HouseHopper AI assistant. How can I help you today?' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef(null)
    const inputRef = useRef(null)
    const { user: currentUser } = useAuth()
    const [conversationId, setConversationId] = useState(() => sessionStorage.getItem('activeConversationId'))

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight)
        }
    }, [messages, isOpen])

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 100)
        }
    }, [isOpen])

    // Load active conversation history on mount/login
    useEffect(() => {
        const loadActiveConversation = async () => {
            if (currentUser && conversationId) {
                try {
                    const token = await currentUser.getIdToken()
                    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    const data = await response.json()
                    console.log('Chatbot history loaded:', data)
                    if (data.success && data.messages.length > 0) {
                        setMessages(data.messages)
                    }
                } catch (error) {
                    console.error('Error loading active conversation:', error)
                }
            }
        }
        loadActiveConversation()
    }, [currentUser, conversationId])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const userMessage = input.trim()
        setInput('')
        // Add user message to UI
        setMessages(prev => [...prev, { role: 'user', text: userMessage }])
        setLoading(true)

        try {
            if (!currentUser) {
                throw new Error('Please sign in to use the AI assistant.')
            }

            const token = await currentUser.getIdToken()

            const response = await fetch('/api/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMessage,
                    conversationId: conversationId,
                    // Filter out complex objects from history to send clean text history
                    history: messages
                        .filter(m => !m.isError)
                        .map(m => ({ role: m.role, text: m.text }))
                })
            })

            const data = await response.json()

            if (data.error) {
                throw new Error(data.error)
            }

            // Save conversationId for persistence
            if (data.conversationId && data.conversationId !== conversationId) {
                setConversationId(data.conversationId)
                sessionStorage.setItem('activeConversationId', data.conversationId)
            }

            // Add model response to UI
            setMessages(prev => [...prev, {
                role: 'model',
                text: data.response,
                properties: data.properties
            }])

        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                role: 'model',
                text: error.message || 'Sorry, I encountered an error. Please try again later.',
                isError: true
            }])
        } finally {
            setLoading(false)
        }
    }

    // Render property chips if they exist
    const renderProperties = (props) => {
        if (!props || props.length === 0) return null
        return (
            <div className="flex flex-wrap gap-2 mt-3">
                {props.map((prop) => (
                    <Link
                        key={prop.id}
                        to="/portfolio"
                        className="flex items-center gap-2 bg-background/50 hover:bg-background border border-white/10 rounded-lg p-2 text-xs transition-colors"
                    >
                        <Home className="h-3 w-3 text-secondary" />
                        <span className="truncate max-w-[150px]">{prop.name}</span>
                    </Link>
                ))}
            </div>
        )
    }

    return (
        <>
            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    size="icon"
                    className={cn(
                        "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 magnetic ripple",
                        isOpen ? "bg-destructive hover:bg-destructive/90 rotate-90" : "bg-gradient-to-r from-secondary to-primary hover:shadow-secondary/50"
                    )}
                >
                    {isOpen ? (
                        <X className="h-6 w-6 text-white" />
                    ) : (
                        <MessageSquare className="h-6 w-6 text-white" />
                    )}
                </Button>
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[400px] h-[500px] flex flex-col glass-card rounded-2xl shadow-2xl border border-secondary/20 animate-in slide-in-from-bottom-10 fade-in duration-300 origin-bottom-right">

                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-secondary/10 rounded-t-2xl backdrop-blur-md">
                        <div className="p-2 bg-secondary/20 rounded-full">
                            <Bot className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">HouseHopper AI</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <p className="text-xs text-muted-foreground">Online</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 ml-auto">
                            <Link to="/chat" onClick={() => setIsOpen(false)}>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-secondary/20 scrollbar-track-transparent" ref={scrollRef}>
                        {messages.map((msg, idx) => (
                            <AnimatedSection key={idx} animation="fade-in-up" delay={idx * 50}>
                                <div className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[85%] rounded-2xl p-3 text-sm shadow-sm relative group",
                                        msg.role === 'user'
                                            ? "bg-secondary text-secondary-foreground rounded-tr-none"
                                            : "bg-muted/50 text-foreground border border-white/5 rounded-tl-none",
                                        msg.isError && "bg-destructive/10 text-destructive border-destructive/20"
                                    )}>
                                        {msg.role === 'model' && (
                                            <Sparkles className="w-3 h-3 text-secondary absolute -top-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        )}

                                        {/* Message Text */}
                                        <div className="whitespace-pre-wrap">{msg.text}</div>

                                        {/* Associated Properties Chips */}
                                        {msg.role === 'model' && renderProperties(msg.properties)}
                                    </div>
                                </div>
                            </AnimatedSection>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted/50 rounded-2xl rounded-tl-none p-3 border border-white/5">
                                    <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/10 bg-background/50 rounded-b-2xl backdrop-blur-sm">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={currentUser ? "Ask about properties..." : "Please sign in to chat"}
                                className="bg-background/50 border-white/10 focus:border-secondary/50 rounded-xl"
                                disabled={loading || !currentUser}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={loading || !input.trim() || !currentUser}
                                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-xl transition-all duration-300"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
