import React from "react";
import { Truck, Package, Clock, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    icon: Truck,
    title: "Frete Dedicado",
    description: "Caminhão exclusivo para sua carga. Coleta e entrega direta, sem paradas intermediárias.",
  },
  {
    icon: Package,
    title: "Frete Fracionado",
    description: "Compartilhe o transporte e reduza custos. Ideal para cargas menores que não exigem veículo exclusivo.",
  },
  {
    icon: Clock,
    title: "Coleta Programada",
    description: "Agende coletas recorrentes com dia e horário fixos. Perfeito para operações regulares.",
  },
  {
    icon: Zap,
    title: "Entrega Expressa",
    description: "Prazo reduzido para cargas urgentes. Prioridade total na coleta e entrega.",
  },
];

export default function ServicesSection() {
  return (
    <section id="servicos" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-velox-amber font-semibold text-sm uppercase tracking-wider">
            Nossos Serviços
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-velox-dark mt-3">
            Soluções completas em transporte
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-lg">
            Oferecemos diferentes modalidades de frete para atender exatamente o que você precisa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-velox-amber/30 hover:shadow-xl hover:shadow-velox-amber/5 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-velox-dark rounded-xl flex items-center justify-center mb-6 group-hover:bg-velox-amber transition-colors duration-300">
                <service.icon className="w-7 h-7 text-white group-hover:text-velox-dark transition-colors duration-300" />
              </div>
              <h3 className="font-heading text-xl font-bold text-velox-dark mb-3">
                {service.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {service.description}
              </p>
              <button
                onClick={() => document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center text-sm font-semibold text-velox-amber hover:text-velox-dark transition-colors group/link"
              >
                Solicitar
                <ArrowRight className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}