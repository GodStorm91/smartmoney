import { Button } from '@/components/ui/Button'
import { useNavigate } from '@tanstack/react-router'
import { Shield, TrendingUp, Brain, Check } from 'lucide-react'

export function HeroSection() {
  const navigate = useNavigate()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div>
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 bg-green-500/30 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Check className="h-4 w-4 text-green-300" />
              <span className="text-sm font-medium">89/89 Tests Passing • 92/100 Code Quality</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Your Money, Your Rules, <span className="text-green-200">Your Server</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-green-100 mb-8 leading-relaxed">
              Privacy-first cashflow tracker with AI-powered budgets. Self-host your financial data—no cloud, no subscriptions, no compromises.
            </p>

            {/* Value Props */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-300 flex-shrink-0" />
                <span className="text-sm">Self-Hosted Privacy</span>
              </div>
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-green-300 flex-shrink-0" />
                <span className="text-sm">AI-Powered Budgets</span>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-300 flex-shrink-0" />
                <span className="text-sm">94% Cheaper</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => navigate({ to: '/register' })}
                size="lg"
                className="bg-white text-green-700 hover:bg-green-50 shadow-xl"
              >
                Start Free Trial
              </Button>
              <Button
                onClick={() => {
                  const element = document.getElementById('how-it-works')
                  element?.scrollIntoView({ behavior: 'smooth' })
                }}
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                See How It Works
              </Button>
            </div>

            {/* Social Proof */}
            <p className="text-sm text-green-200 mt-6">
              Join privacy-conscious families tracking <span className="font-semibold text-white">¥500M+ in transactions</span>
            </p>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
              {/* Screenshot Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-green-900 to-green-800 rounded-lg flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="h-16 w-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white font-medium">Dashboard Screenshot</p>
                  <p className="text-green-200 text-sm mt-2">Privacy mode enabled</p>
                </div>
              </div>

              {/* Floating Stats */}
              <div className="absolute -bottom-6 left-8 right-8 bg-white rounded-lg shadow-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-700">0.36</div>
                    <div className="text-xs text-gray-600">Credits/Budget</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">94%</div>
                    <div className="text-xs text-gray-600">Cheaper</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">3 Min</div>
                    <div className="text-xs text-gray-600">Setup Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
