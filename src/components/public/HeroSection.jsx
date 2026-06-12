import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function HeroSection() {
  const [scrollY, setScrollY] = useState(0);
  const { settings } = useCompanySettings();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const heroTitle = settings?.hero_title || "Sua carga, no prazo certo.";
  const heroSubtitle = settings?.hero_subtitle || "Transporte de cargas com segurança, tecnologia e pontualidade. Mais de 20 anos de experiência conectando origens a destinos.";

  // Split last word for amber highlight
  const words = heroTitle.split(" ");
  const lastWord = words.pop();
  const firstPart = words.join(" ");

  return (
    <section className="relative h-screen min-h-[700px] overflow-hidden bg-velox-dark">
      <div className="absolute inset-0 z-0" style={{ transform: `translateY(${scrollY * 0.1}px)` }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c1929] via-[#152238] to-[#0A1628]" />
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full"
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 60}%`, opacity: Math.random() * 0.8 + 0.2 }}
            />
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-80 z-10" style={{ transform: `translateY(${scrollY * 0.4}px)` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <img src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1920&q=80&auto=format" alt="Estrada" className="w-full h-full object-cover object-center opacity-40" />
      </div>
      <div className="absolute bottom-20 right-0 z-20 w-full max-w-3xl" style={{ transform: `translateX(${scrollY * -0.15}px) translateY(${scrollY * 0.2}px)` }}>
        <img src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&q=80&auto=format" alt="Caminhão Velox" className="w-full opacity-30" />
      </div>
      <div className="absolute inset-0 z-25 bg-gradient-to-r from-velox-dark/95 via-velox-dark/70 to-velox-dark/40" />
      <div className="absolute inset-0 z-25 bg-gradient-to-t from-velox-dark via-transparent to-transparent" />
      <div className="relative z-30 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-velox-amber/10 border border-velox-amber/30 rounded-full px-4 py-1.5 mb-6">
              <Package className="w-4 h-4 text-velox-amber" />
              <span className="text-xs font-semibold text-velox-amber uppercase tracking-wider">Transporte de confiança</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[0.95] mb-6">
              {firstPart}
              {firstPart && <br />}
              <span className="text-velox-amber">{lastWord}</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/60 font-light max-w-lg mb-10 leading-relaxed">{heroSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/agendar">
                <Button size="lg" className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold text-base px-8 py-6 rounded-full shadow-lg shadow-velox-amber/20 group">
                  Cotar Frete <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/agendar">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 font-semibold text-base px-8 py-6 rounded-full">
                  Agendar Coleta
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 bg-velox-amber rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}