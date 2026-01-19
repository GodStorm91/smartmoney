import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { FeatureShowcaseSection } from '@/components/landing/FeatureShowcaseSection'
import { AIBudgetSection } from '@/components/landing/AIBudgetSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { FAQSection } from '@/components/landing/FAQSection'
import { FinalCTASection } from '@/components/landing/FinalCTASection'

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <HeroSection />
      <HowItWorksSection />
      <FeatureShowcaseSection />
      <AIBudgetSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
    </div>
  )
}
