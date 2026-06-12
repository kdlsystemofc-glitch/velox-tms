import React from "react";
import { Shield, Clock, Eye, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const valueIcons = { Pontualidade: Clock, Responsabilidade: Shield, Transparência: Eye, Segurança: Target };

export default function AboutSection() {
  const { settings } = useCompanySettings();

  const valuesList = (settings?.values || "Pontualidade, Responsabilidade, Transparência, Segurança")
    .split(",").map(v => v.trim()).filter(Boolean);

  const aboutText = settings?.about_text || "Com mais de duas décadas no setor de transportes, a Velox nasceu da experiência e da vontade de fazer diferente. Combinamos a solidez de quem conhece o mercado com a modernidade de quem abraça a tecnologia.";
  const mission = settings?.mission || "Conectar origens a destinos com pontualidade, segurança e compromisso.";

  return (
    <section id="sobre" className="py-24 bg-velox-dark text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              <img src={settings?.fleet_photo_url || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&auto=format"} alt="Frota Velox" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-velox-amber rounded-2xl p-6 shadow-2xl">
              <span className="font-display text-4xl font-extrabold text-velox-dark block">20+</span>
              <span className="text-velox-dark/70 text-sm font-semibold">Anos de experiência</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <span className="text-velox-amber font-semibold text-sm uppercase tracking-wider">Sobre nós</span>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold mt-3 mb-6">Tradição que se reinventa</h2>
            <p className="text-white/60 text-lg leading-relaxed mb-4">{aboutText}</p>
            <p className="text-white/60 leading-relaxed mb-8">{mission}</p>
            <div className="grid grid-cols-2 gap-4">
              {valuesList.map((v, i) => {
                const Icon = valueIcons[v] || Shield;
                return (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <Icon className="w-5 h-5 text-velox-amber flex-shrink-0" />
                    <span className="text-sm font-semibold text-white/80">{v}</span>
                  </div>
                );
              })}
            </div>

            {/* Área de atuação */}
            {(settings?.coverage_states?.length > 0 || settings?.coverage_cities?.length > 0 || settings?.region) && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-velox-amber text-xs font-semibold uppercase tracking-wider mb-3">Onde atuamos</p>
                {settings?.coverage_type === "states" && settings?.coverage_states?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {settings.coverage_states.map(uf => (
                      <span key={uf} className="bg-velox-amber/20 text-velox-amber text-xs font-bold px-2.5 py-1 rounded-full">{uf}</span>
                    ))}
                  </div>
                )}
                {settings?.coverage_type === "cities" && settings?.coverage_cities?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {settings.coverage_cities.map((c, i) => (
                      <span key={i} className="bg-white/5 text-white/70 text-xs px-2.5 py-1 rounded-full border border-white/10">{c.city} - {c.state}</span>
                    ))}
                  </div>
                )}
                {(!settings?.coverage_type || settings?.coverage_type === "cep_range") && settings?.region && (
                  <p className="text-white/60 text-sm">{settings.region}</p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}