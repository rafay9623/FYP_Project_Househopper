import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, ArrowLeft, Plus, Users, LogOut, User, LayoutDashboard, Building2, Calculator, Sun, Moon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function Navbar({ variant = 'default', showBackButton = false, backPath = '/dashboard' }) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, user, userProfile, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const ThemeToggle = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-xl hover:bg-primary/10 transition-colors"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )

  const handleGetStarted = () => {
    navigate('/auth/signup')
    setMobileMenuOpen(false)
  }

  const handleNavigate = (path) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    setMobileMenuOpen(false)
  }

  const getUserInitials = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName[0]}${userProfile.lastName[0]}`.toUpperCase()
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-border/50 hover:border-primary/50 transition-colors">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 glass-card border-border/50" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">
              {userProfile?.firstName && userProfile?.lastName
                ? `${userProfile.firstName} ${userProfile.lastName}`
                : user?.email}
            </p>
            <p className="text-xs leading-none text-foreground/60">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
          <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/portfolio')} className="cursor-pointer">
          <Building2 className="mr-2 h-4 w-4 text-secondary" />
          <span>Portfolio</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Dashboard variant navbar
  if (variant === 'dashboard') {
    return (
      <nav className="sticky top-0 z-50 border-b border-border/50 glass">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              {showBackButton && (
                <button
                  onClick={() => navigate(backPath)}
                  className="flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary/80 tracking-tight">H</span>
                </div>
                <span className="font-bold text-lg gradient-text-primary hidden sm:inline">HouseHoppers</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="text-sm rounded-xl hover:bg-primary/10"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/portfolio')}
                className="text-sm rounded-xl hover:bg-secondary/10"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Portfolio
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/add-property')}
                className="text-sm rounded-xl hover:bg-accent/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
              <ThemeToggle />
              {isAuthenticated && <UserMenu />}
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] glass-card border-l-border/50">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-xl">🦗</span>
                    </div>
                    <span className="font-bold text-lg gradient-text-primary">HouseHoppers</span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate('/dashboard')}
                    className="justify-start w-full rounded-xl"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-3 text-primary" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate('/portfolio')}
                    className="justify-start w-full rounded-xl"
                  >
                    <Building2 className="h-4 w-4 mr-3 text-secondary" />
                    Portfolio
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate('/add-property')}
                    className="justify-start w-full rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-3 text-accent" />
                    Add Property
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate('/roi-calculator')}
                    className="justify-start w-full rounded-xl"
                  >
                    <Calculator className="h-4 w-4 mr-3 text-primary" />
                    ROI Calculator
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={toggleTheme}
                    className="justify-start w-full rounded-xl"
                  >
                    <Sun className="h-4 w-4 mr-3 text-amber-500 dark:hidden" />
                    <Moon className="h-4 w-4 mr-3 text-blue-400 hidden dark:inline" />
                    <span className="dark:hidden">Light Mode</span>
                    <span className="hidden dark:inline">Dark Mode</span>
                  </Button>
                  {isAuthenticated && (
                    <div className="pt-4 border-t border-border/50 mt-4">
                      <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="justify-start w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    )
  }

  // Portfolio variant navbar
  if (variant === 'portfolio') {
    return (
      <nav className="sticky top-0 z-50 border-b border-border/50 glass">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              {showBackButton && (
                <button
                  onClick={() => navigate(backPath)}
                  className="flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors font-medium"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary/80 tracking-tight">H</span>
                </div>
                <span className="font-bold text-lg gradient-text-primary hidden sm:inline">HouseHoppers</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={() => navigate('/browse-users')}
                className="rounded-xl border-border/50 hover:border-secondary/50 hover:bg-secondary/10"
              >
                <Users className="h-4 w-4 mr-2 text-secondary" />
                Browse Investors
              </Button>
              <Button 
                onClick={() => navigate('/add-property')} 
                className="btn-gradient rounded-xl text-background font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
              <ThemeToggle />
              {isAuthenticated && <UserMenu />}
            </div>

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] glass-card border-l-border/50">
                <div className="flex flex-col gap-4 mt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-xl">🦗</span>
                    </div>
                    <span className="font-bold text-lg gradient-text-primary">HouseHoppers</span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate('/dashboard')}
                    className="justify-start w-full rounded-xl"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-3 text-primary" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate('/portfolio')}
                    className="justify-start w-full rounded-xl"
                  >
                    <Building2 className="h-4 w-4 mr-3 text-secondary" />
                    Portfolio
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate('/add-property')}
                    className="justify-start w-full rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-3 text-accent" />
                    Add Property
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigate('/browse-users')}
                    className="justify-start w-full rounded-xl"
                  >
                    <Users className="h-4 w-4 mr-3 text-secondary" />
                    Browse Investors
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={toggleTheme}
                    className="justify-start w-full rounded-xl"
                  >
                    <Sun className="h-4 w-4 mr-3 text-amber-500 dark:hidden" />
                    <Moon className="h-4 w-4 mr-3 text-blue-400 hidden dark:inline" />
                    <span className="dark:hidden">Light Mode</span>
                    <span className="hidden dark:inline">Dark Mode</span>
                  </Button>
                  {isAuthenticated && (
                    <div className="pt-4 border-t border-border/50 mt-4">
                      <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="justify-start w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    )
  }

  // Default variant navbar (for Home page)
  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-xl">🦗</span>
            </div>
            <span className="font-bold text-lg gradient-text-primary hidden sm:inline">HouseHoppers</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a 
              href="#features" 
              className="text-sm text-foreground/60 hover:text-foreground transition font-medium"
            >
              Features
            </a>
            <a 
              href="#benefits" 
              className="text-sm text-foreground/60 hover:text-foreground transition font-medium"
            >
              Benefits
            </a>
            <ThemeToggle />
            {!isAuthenticated ? (
              <Button 
                onClick={handleGetStarted}
                className="btn-gradient rounded-xl text-background font-semibold px-6"
              >
                Get Started
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="rounded-xl border-border/50 hover:border-primary/50"
                >
                  Dashboard
                </Button>
                <UserMenu />
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] glass-card border-l-border/50">
              <div className="flex flex-col gap-4 mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <span className="text-xl">🦗</span>
                  </div>
                  <span className="font-bold text-lg gradient-text-primary">HouseHoppers</span>
                </div>
                <a 
                  href="#features" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-foreground/60 hover:text-foreground transition py-3 font-medium"
                >
                  Features
                </a>
                <a 
                  href="#benefits" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-foreground/60 hover:text-foreground transition py-3 font-medium"
                >
                  Benefits
                </a>
                <Button
                  variant="ghost"
                  onClick={toggleTheme}
                  className="justify-start w-full rounded-xl"
                >
                  <Sun className="h-4 w-4 mr-3 text-amber-500 dark:hidden" />
                  <Moon className="h-4 w-4 mr-3 text-blue-400 hidden dark:inline" />
                  <span className="dark:hidden">Light Mode</span>
                  <span className="hidden dark:inline">Dark Mode</span>
                </Button>
                {!isAuthenticated ? (
                  <Button 
                    onClick={handleGetStarted}
                    className="btn-gradient rounded-xl text-background font-semibold w-full mt-4"
                  >
                    Get Started
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                    <Button 
                      onClick={() => handleNavigate('/dashboard')}
                      variant="outline"
                      className="rounded-xl w-full"
                    >
                      Dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSignOut}
                      className="justify-start w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
