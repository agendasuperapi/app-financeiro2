
import React from 'react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingHero from '@/components/landing/LandingHero';
import LandingPromoSection from '@/components/landing/LandingPromoSection';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingBenefits from '@/components/landing/LandingBenefits';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingCTA from '@/components/landing/LandingCTA';

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingPromoSection />
        <LandingFeatures />
        <LandingBenefits />
        <LandingPricing />
        <LandingCTA />
      </main>
    </div>
  );
};

export default LandingPage;
