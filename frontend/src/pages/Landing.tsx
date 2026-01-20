import { HeroSection } from '@/components/landing/HeroSection'
import { FeatureShowcaseSection } from '@/components/landing/FeatureShowcaseSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { FinalCTASection } from '@/components/landing/FinalCTASection'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'

export function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <HeroSection />
      <FeatureShowcaseSection />
      <HowItWorksSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  )
}
