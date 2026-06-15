import React from "react";
import { ClipboardList, Truck, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Solicite o frete",
    description: "Preencha nosso formulário com os dados da carga, origem e destino. É rápido e simples.",
  },
  {
    icon: Truck,
    step: "02",
    title: "Confirmamos e coletamos",
    description: "Nossa equipe confirma o agendamento e envia o caminhão no dia e horário combinados.",
  },
  {
    icon: CheckCircle2,
    step: "03",
    title: "Entrega com NF assinada",
    description: "Sua carga chega ao destino com segurança. Você recebe a NF assinada como comprovante.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-velox-amber font-semibold text-sm uppercase tracking-wider">
            Como funciona
          </span>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-velox-dark mt-3">
            Simples, rápido e seguro
          </h2>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-24 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-velox-amber/20 via-velox-amber to-velox-amber/20" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="text-center relative"
              >
                <div className="relative inline-flex mb-8">
                  <div className="w-20 h-20 bg-velox-dark rounded-2xl flex items-center justify-center relative z-10">
                    <step.icon className="w-9 h-9 text-velox-amber" />
                  </div>
                  <span className="absolute -top-3 -right-3 w-8 h-8 bg-velox-amber rounded-full flex items-center justify-center text-xs font-bold text-white z-20">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-heading text-xl font-bold text-velox-dark mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}