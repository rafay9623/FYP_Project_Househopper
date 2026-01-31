import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp, BarChart3, Zap, Shield, Globe, Sparkles, ChevronRight, Star } from 'lucide-react'
import Navbar from '@/components/Navbar'
import AnimatedSection from '@/components/AnimatedSection'

export default function Home() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/auth/signup')
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 animated-gradient opacity-50" />
      <div className="fixed inset-0 grid-pattern" />
      
      {/* Beautiful Floating Orbs */}
      <div className="fixed top-20 left-10 w-96 h-96 bg-primary/15 rounded-full blur-[120px] float-enhanced opacity-50" />
      <div className="fixed bottom-20 right-10 w-[500px] h-[500px] bg-secondary/12 rounded-full blur-[150px] float-enhanced opacity-40" style={{ animationDelay: '-4s' }} />
      <div className="fixed top-1/2 left-1/2 w-80 h-80 bg-accent/10 rounded-full blur-[100px] float-enhanced opacity-35" style={{ animationDelay: '-8s' }} />

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <Navbar />

        {/* Hero Section */}
        <section className="relative px-4 pt-20 pb-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center text-center space-y-8">
              {/* Badge */}
              <AnimatedSection animation="fade-in-up" delay={0}>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card magnetic border border-primary/30">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm font-medium text-foreground/80 tracking-wide">The Future of Real Estate Investing</span>
                  <ChevronRight className="w-4 h-4 text-primary" />
                </div>
              </AnimatedSection>

              {/* Main Heading */}
              <AnimatedSection animation="fade-in-up" delay={100}>
                <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight">
                  <span className="text-foreground text-glow-animate">Hop Into</span>
                  <br />
                  <span className="gradient-text text-glow-animate">Smart Investing</span>
                </h1>
              </AnimatedSection>

              {/* Subheading */}
              <AnimatedSection animation="fade-in-up" delay={200}>
                <p className="max-w-2xl text-lg sm:text-xl text-foreground/60">
                  Track your rental yields, analyze ROI across properties, and build a 
                  diversified real estate portfolio. All in one powerful, beautiful platform.
                </p>
              </AnimatedSection>

              {/* CTA Buttons */}
              <AnimatedSection animation="scale-in" delay={300}>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Button 
                    size="lg" 
                    onClick={handleGetStarted}
                    className="btn-gradient px-8 py-6 text-lg font-semibold rounded-full text-background magnetic ripple"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => navigate('/auth/signin')}
                    className="px-8 py-6 text-lg font-semibold rounded-full border-2 border-foreground/20 hover:border-primary/50 hover:bg-primary/10 transition-all magnetic"
                  >
                    Sign In
                  </Button>
                </div>
              </AnimatedSection>

              {/* Trust Indicators */}
              <AnimatedSection animation="fade-in-up" delay={400}>
                <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-foreground/40">
                  <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-default">
                    <Shield className="w-5 h-5 text-primary animate-pulse" />
                    <span>Bank-level Security</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-default">
                    <Globe className="w-5 h-5 text-primary animate-pulse" />
                    <span>10,000+ Investors</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-default">
                    <Star className="w-5 h-5 text-primary animate-pulse fill-primary" />
                    <span>4.9/5 Rating</span>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Dashboard Preview */}
            <AnimatedSection animation="fade-in-up" delay={500} threshold={0.2}>
              <div className="mt-20 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
                <div className="glass-card rounded-3xl p-2 sm:p-4 glow tilt-3d">
                  <div className="bg-card/80 rounded-2xl p-6 sm:p-10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Stat Cards */}
                      <AnimatedSection animation="scale-in" delay={600}>
                        <div className="stat-card rounded-2xl p-6 text-center card-hover">
                          <p className="text-4xl font-bold gradient-text-primary">$2.4M</p>
                          <p className="text-foreground/60 mt-2">Total Portfolio Value</p>
                        </div>
                      </AnimatedSection>
                      <AnimatedSection animation="scale-in" delay={700}>
                        <div className="stat-card rounded-2xl p-6 text-center card-hover">
                          <p className="text-4xl font-bold gradient-text-primary">12.8%</p>
                          <p className="text-foreground/60 mt-2">Average ROI</p>
                        </div>
                      </AnimatedSection>
                      <AnimatedSection animation="scale-in" delay={800}>
                        <div className="stat-card rounded-2xl p-6 text-center card-hover">
                          <p className="text-4xl font-bold gradient-text-primary">24</p>
                          <p className="text-foreground/60 mt-2">Properties Tracked</p>
                        </div>
                      </AnimatedSection>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative px-4 py-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="text-center space-y-4 mb-20">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
                Powerful <span className="gradient-text">Features</span>
              </h2>
              <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
                Everything you need to make smarter investment decisions
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Feature 1 */}
              <AnimatedSection animation="fade-in-up" delay={100} threshold={0.2}>
                <div 
                  className="glass-card card-hover rounded-3xl p-8 cursor-pointer group tilt-3d magnetic"
                  onClick={() => navigate('/add-property')}
                >
                  <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                    <Zap className="h-8 w-8 text-primary group-hover:animate-wiggle" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    Add Property
                  </h3>
                  <p className="text-foreground/60 leading-relaxed">
                    Add properties with images, descriptions, and pricing. Build your real estate portfolio quickly and easily.
                  </p>
                  <div className="mt-6 flex items-center text-primary font-medium">
                    <span>Learn more</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </AnimatedSection>

              {/* Feature 2 */}
              <AnimatedSection animation="fade-in-up" delay={200} threshold={0.2}>
                <div 
                  className="glass-card card-hover rounded-3xl p-8 cursor-pointer group tilt-3d magnetic"
                  onClick={() => navigate('/portfolio')}
                >
                  <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                    <TrendingUp className="h-8 w-8 text-secondary group-hover:animate-wiggle" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-secondary transition-colors">
                    Portfolio
                  </h3>
                  <p className="text-foreground/60 leading-relaxed">
                    Manage all your properties in one place. View, edit, and track performance across your entire portfolio.
                  </p>
                  <div className="mt-6 flex items-center text-secondary font-medium">
                    <span>Learn more</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </AnimatedSection>

              {/* Feature 3 */}
              <AnimatedSection animation="fade-in-up" delay={300} threshold={0.2}>
                <div 
                  className="glass-card card-hover rounded-3xl p-8 cursor-pointer group tilt-3d magnetic"
                  onClick={() => navigate('/roi-calculator')}
                >
                  <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                    <BarChart3 className="h-8 w-8 text-accent group-hover:animate-wiggle" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors">
                    ROI Calculator
                  </h3>
                  <p className="text-foreground/60 leading-relaxed">
                    Calculate rental yields, cap rates, cash-on-cash returns, and multi-year projections for your properties.
                  </p>
                  <div className="mt-6 flex items-center text-accent font-medium">
                    <span>Learn more</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section id="benefits" className="relative px-4 py-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="glass-card rounded-3xl p-12 sm:p-16">
              <div className="grid gap-12 lg:grid-cols-2 items-center">
                <div className="space-y-8">
                  <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
                    Why Choose <span className="gradient-text">HouseHoppers</span>?
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold">01</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-foreground">Real-Time Insights</h4>
                        <p className="text-foreground/60 mt-1">See your portfolio performance instantly with comprehensive dashboards.</p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-secondary/20 border border-secondary/30 flex items-center justify-center shrink-0">
                        <span className="text-secondary font-bold">02</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-foreground">Smart Calculations</h4>
                        <p className="text-foreground/60 mt-1">Never manually calculate yields again. Automatic ROI tracking.</p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                        <span className="text-accent font-bold">03</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-foreground">Data-Driven Decisions</h4>
                        <p className="text-foreground/60 mt-1">Make better investment decisions backed by comprehensive analysis.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-3xl blur-3xl" />
                  <div className="relative glass-card rounded-3xl p-10 text-center">
                    <p className="text-7xl sm:text-8xl font-bold gradient-text">35%</p>
                    <p className="text-xl text-foreground/60 mt-4">Average portfolio growth in year one</p>
                    <div className="mt-8 flex justify-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-6 h-6 text-accent fill-accent" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground/40 mt-2">Based on 10,000+ user reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative px-4 py-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/30 rounded-3xl blur-3xl" />
              <div className="relative glass-card rounded-3xl p-12 sm:p-16">
                <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                  Ready to <span className="gradient-text">Hop In</span>?
                </h2>
                <p className="text-xl text-foreground/60 mb-10 max-w-2xl mx-auto">
                  Join thousands of investors already using HouseHoppers to grow their wealth.
                </p>
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="btn-gradient px-10 py-7 text-xl font-semibold rounded-full text-background pulse-glow magnetic ripple"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
                </Button>
                <p className="text-sm text-foreground/40 mt-6">
                  No credit card required • 14-day free trial
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary/80 tracking-tight">H</span>
                </div>
                <span className="text-xl font-bold gradient-text-primary">HouseHoppers</span>
              </div>
              <p className="text-sm text-foreground/40">
                © 2025 HouseHoppers. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
