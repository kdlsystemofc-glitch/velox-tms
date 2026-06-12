import React, { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const defaultTestimonials = [
  { name: "Carlos Mendes", company: "Distribuidora Brasil", text: "Profissionalismo e pontualidade. A Velox transformou nossa logística. Entregas sempre no prazo e cargas chegam em perfeito estado.", rating: 5 },
  { name: "Ana Paula Silva", company: "Indústria Textil SP", text: "Desde que começamos a trabalhar com a Velox, nossos problemas de transporte acabaram. Atendimento excelente e preço justo.", rating: 5 },
  { name: "Roberto Oliveira", company: "Comércio Atacadista RJ", text: "Confiança total. Transportam nossas mercadorias há anos e nunca tivemos nenhuma ocorrência. Recomendo fortemente.", rating: 5 },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [testimonials, setTestimonials] = useState(defaultTestimonials);

  useEffect(() => {
    base44.entities.Testimonial.filter({ active: true }).then((list) => {
      if (list && list.length > 0) setTestimonials(list);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % testimonials.length), 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c + 1) % testimonials.length);

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-velox-amber font-semibold text-sm uppercase tracking-wider">Depoimentos</span>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-velox-dark mt-3">O que nossos clientes dizem</h2>
        </div>
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="bg-white rounded-2xl p-8 sm:p-12 shadow-lg border border-gray-100 text-center">
              <Quote className="w-10 h-10 text-velox-amber/20 mx-auto mb-6" />
              <p className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-8 italic">"{testimonials[current].text}"</p>
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: testimonials[current].rating || 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-velox-amber text-velox-amber" />
                ))}
              </div>
              <p className="font-heading font-bold text-velox-dark text-lg">{testimonials[current].name}</p>
              <p className="text-gray-500 text-sm">{testimonials[current].company}</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center items-center gap-4 mt-8">
            <button onClick={prev} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-velox-dark hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-velox-amber w-8" : "bg-gray-300"}`} />
              ))}
            </div>
            <button onClick={next} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-velox-dark hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}