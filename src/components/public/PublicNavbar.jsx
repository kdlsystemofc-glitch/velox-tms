import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { label: "Início", href: "/" },
    { label: "Serviços", href: "/#servicos" },
    { label: "Sobre", href: "/#sobre" },
    { label: "Contato", href: "/#contato" },
    { label: "Rastrear", href: "/rastrear" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-velox-dark/95 backdrop-blur-xl shadow-2xl py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 bg-velox-amber rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <Truck className="w-6 h-6 text-velox-dark" />
          </div>
          <div>
            <span className="font-display text-2xl font-extrabold text-white tracking-tight">
              VELOX
            </span>
            <span className="block text-[10px] font-heading text-velox-amber/80 uppercase tracking-[0.25em] -mt-1">
              Transportadora
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/70 hover:text-velox-amber transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link to="/cotacao" className="text-sm font-medium text-white/70 hover:text-velox-amber transition-colors">
            Cotar Frete
          </Link>
          <Link to="/agendar">
            <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold px-6 rounded-full">
              Agendar Coleta
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-velox-dark/98 backdrop-blur-xl border-t border-white/10"
          >
            <div className="px-4 py-6 space-y-4">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-white/80 hover:text-velox-amber py-2 font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <Link to="/cotacao" className="block text-white/80 hover:text-velox-amber py-2 font-medium" onClick={() => setMobileOpen(false)}>
                Cotar Frete
              </Link>
              <Link to="/agendar" onClick={() => setMobileOpen(false)}>
                <Button className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold rounded-full mt-2">
                  Agendar Coleta
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}