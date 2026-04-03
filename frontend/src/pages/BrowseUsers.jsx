import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Users, Home } from 'lucide-react'
import { usersApi } from '@/services/api.service'
import Navbar from '@/components/Navbar'

export default function BrowseUsers() {
  const navigate = useNavigate()
  const { loading: authLoading } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!authLoading) {
      loadUsers()
    }
  }, [authLoading])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
        const email = (user.email || '').toLowerCase()
        const search = searchTerm.toLowerCase()
        return fullName.includes(search) || email.includes(search)
      })
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  const loadUsers = async () => {
    try {
      console.log('🔄 Loading users for browsing...')
      const data = await usersApi.getAll()
      console.log(`✅ Loaded ${data.length} users:`, data)
      setUsers(data)
      setFilteredUsers(data)
      
      if (data.length === 0) {
        console.warn('⚠️ No users found. This might mean:')
        console.warn('   1. No other users have added properties yet')
        console.warn('   2. All properties belong to the current user')
        console.warn('   3. There might be a database or authentication issue')
      }
    } catch (error) {
      console.error('❌ Error loading users:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        details: error.details
      })
    } finally {
      setLoading(false)
    }
  }

  const getUserDisplayName = (user) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email || 'Unknown User'
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <span className="text-2xl font-bold text-primary/70 tracking-tight">H</span>
          </div>
          <p className="text-foreground/50 text-sm tracking-wide">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar variant="dashboard" showBackButton={true} backPath="/dashboard" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Browse Investors</h1>
            <p className="text-lg text-foreground/70">
              Discover properties from all real estate investors
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchTerm ? 'No users found' : 'No investors yet'}
                </h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm 
                    ? 'Try a different search term'
                    : 'Be the first to add properties and share your portfolio!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => {
                const hasImage = user.property_image && user.property_image.trim() && user.property_image.length > 50
                return (
                  <Card 
                    key={user.id} 
                    className="hover:shadow-lg transition cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/user/${user.uid}/properties`)}
                  >
                    {/* Property Image */}
                    <div className="relative w-full h-48 overflow-hidden bg-muted">
                      {hasImage ? (
                        <img
                          src={user.property_image}
                          alt={`Property from ${getUserDisplayName(user)}`}
                          className="w-full h-full object-cover"
                          style={{ display: 'block' }}
                          loading="lazy"
                          onLoad={(e) => {
                            const placeholder = e.target.parentElement.querySelector('.image-placeholder')
                            if (placeholder) placeholder.style.display = 'none'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            const placeholder = e.target.parentElement.querySelector('.image-placeholder')
                            if (placeholder) {
                              placeholder.style.display = 'flex'
                              placeholder.classList.remove('hidden')
                            }
                          }}
                        />
                      ) : null}
                      {/* Placeholder - shown when no image or image fails */}
                      <div 
                        className="image-placeholder w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center absolute inset-0"
                        style={{ display: hasImage ? 'none' : 'flex', zIndex: hasImage ? 0 : 1 }}
                      >
                        <Home className="h-16 w-16 text-primary/30" />
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {getUserDisplayName(user)}
                      </CardTitle>
                      <CardDescription>
                        {user.email || 'No email available'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Properties</p>
                          <p className="text-2xl font-bold text-primary">
                            {user.property_count || 0}
                          </p>
                        </div>
                        <Button 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/user/${user.uid}/properties`)
                          }}
                        >
                          <Home className="h-4 w-4 mr-2" />
                          View Properties
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
