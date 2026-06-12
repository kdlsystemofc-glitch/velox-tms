import React from "react";
import PublicNavbar from "@/components/public/PublicNavbar";
import HeroSection from "@/components/public/HeroSection";
import StatsSection from "@/components/public/StatsSection";
import ServicesSection from "@/components/public/ServicesSection";
import HowItWorksSection from "@/components/public/HowItWorksSection";
import AboutSection from "@/components/public/AboutSection";
import TestimonialsSection from "@/components/public/TestimonialsSection";
import ContactSection from "@/components/public/ContactSection";
import PublicFooter from "@/components/public/PublicFooter";
import WhatsAppButton from "@/components/public/WhatsAppButton";

export default function Home() {
  return (
    <div className="min-h-screen">
      <PublicNavbar />
      <HeroSection />
      <StatsSection />
      <ServicesSection />
      <HowItWorksSection />
      <AboutSection />
      <TestimonialsSection />
      <ContactSection />
      <PublicFooter />
      <WhatsAppButton />
    </div>
  );
}