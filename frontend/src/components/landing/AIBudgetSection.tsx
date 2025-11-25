import { Card } from '@/components/ui/Card'
import { Brain, TrendingUp, Sparkles, ArrowRight } from 'lucide-react'

export function AIBudgetSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Visual */}
          <div className="relative">
            <Card className="bg-gradient-to-br from-purple-50 to-green-50 border-purple-200">
              <div className="space-y-4">
                {/* Before State */}
                <div className="bg-white rounded-lg p-4 border-2 border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-red-600 font-semibold">❌ Generic Budget Apps</span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Housing</span>
                      <span className="font-mono">30% (¥150,000)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Food</span>
                      <span className="font-mono">20% (¥100,000)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transport</span>
                      <span className="font-mono">15% (¥75,000)</span>
                    </div>
                    <p className="text-xs text-red-600 mt-3 italic">
                      "Why doesn't this match MY actual spending?"
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-purple-600" />
                </div>

                {/* After State */}
                <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <span className="text-green-600 font-semibold">✓ SmartMoney AI Budget</span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Housing</span>
                      <span className="font-mono">45% (¥225,000)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Food</span>
                      <span className="font-mono">18% (¥90,000)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transport</span>
                      <span className="font-mono">8% (¥40,000)</span>
                    </div>
                    <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Based on YOUR 3-month spending history
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg">
              <span className="text-sm font-semibold">Claude 3.5 Haiku</span>
            </div>
          </div>

          {/* Right Column - Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full mb-6">
              <Brain className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Intelligence</span>
            </div>

            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Budgets That Actually Match Your Life
            </h2>

            <p className="text-xl text-gray-600 mb-6 leading-relaxed">
              Tired of generic "30% housing" advice that doesn't fit Tokyo reality? Our AI analyzes YOUR actual spending patterns to create budgets you can actually follow.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-700 font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Analyzes 3 Months of Your Data</h4>
                  <p className="text-gray-600 text-sm">Claude AI examines your transaction history to understand YOUR spending patterns—not national averages.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-700 font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Personalized Allocations</h4>
                  <p className="text-gray-600 text-sm">Every category allocation comes with AI reasoning based on your behavior: "You average ¥45k/month on housing."</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-700 font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Refinement Through Feedback</h4>
                  <p className="text-gray-600 text-sm">Tell the AI "I want to save more" or "Food budget is too low"—it regenerates with your preferences.</p>
                </div>
              </div>
            </div>

            {/* Cost Comparison */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Cost per AI budget</div>
                  <div className="text-2xl font-bold text-green-700">~862 VND</div>
                  <div className="text-xs text-gray-500 mt-1">0.36 credits • Pay-per-use</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">vs MoneyForward</div>
                  <div className="text-2xl font-bold text-gray-400 line-through">¥500/mo</div>
                  <div className="text-xs text-green-600 font-semibold mt-1">94% cheaper</div>
                </div>
              </div>
            </Card>

            <p className="text-sm text-gray-500 mt-4">
              <TrendingUp className="h-4 w-4 inline mr-1" />
              Average token usage: ~500 input + 800 output = 0.36 credits
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
