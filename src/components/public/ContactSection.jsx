import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useCompanySettings } from "@/hooks/useCompanySettings";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

export default function ContactSection() {
  const { toast } = useToast();
  const { settings } = useCompanySettings();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nome é obrigatório";
    if (!form.email.trim()) e.email = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (!form.message.trim()) e.message = "Mensagem é obrigatória";
    else if (form.message.trim().length < 10) e.message = "Mensagem muito curta (mínimo 10 caracteres)";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    setErrors({});
    setSending(true);
    await base44.entities.ContactMessage.create({ name: form.name, email: form.email, phone: form.phone, message: form.message, read: false });
    toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
    setForm({ name: "", email: "", phone: "", message: "" });
    setSending(false);
  };

  const phone = settings?.phone;
  const email = settings?.email;
  const address = settings?.address;

  return (
    <section id="contato" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <span className="text-velox-amber font-semibold text-sm uppercase tracking-wider">Fale conosco</span>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-velox-dark mt-3 mb-6">Vamos conversar?</h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-10">Estamos prontos para ajudar com sua logística. Entre em contato por telefone, e-mail ou preencha o formulário.</p>
            <div className="space-y-6">
              <a href={phone ? `tel:${phone.replace(/\D/g, "")}` : "#"} className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-velox-dark rounded-xl flex items-center justify-center group-hover:bg-velox-amber transition-colors">
                  <Phone className="w-5 h-5 text-white group-hover:text-velox-dark transition-colors" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  {phone ? <p className="font-heading font-semibold text-velox-dark">{phone}</p>
                    : <p className="font-heading font-semibold text-gray-400 italic text-sm">A configurar</p>}
                </div>
              </a>
              <a href={email ? `mailto:${email}` : "#"} className="flex items-center gap-4 group">
                <div className="w-12 h-12 bg-velox-dark rounded-xl flex items-center justify-center group-hover:bg-velox-amber transition-colors">
                  <Mail className="w-5 h-5 text-white group-hover:text-velox-dark transition-colors" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">E-mail</p>
                  {email ? <p className="font-heading font-semibold text-velox-dark">{email}</p>
                    : <p className="font-heading font-semibold text-gray-400 italic text-sm">A configurar</p>}
                </div>
              </a>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-velox-dark rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Endereço</p>
                  {address ? <p className="font-heading font-semibold text-velox-dark">{address}</p>
                    : <p className="font-heading font-semibold text-gray-400 italic text-sm">A configurar</p>}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nome *</label>
                  <Input placeholder="Seu nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`bg-white ${errors.name ? "border-red-500" : ""}`} />
                  <FieldError message={errors.name} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">E-mail *</label>
                    <Input type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`bg-white ${errors.email ? "border-red-500" : ""}`} />
                    <FieldError message={errors.email} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Telefone</label>
                    <Input placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-white" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mensagem *</label>
                  <Textarea placeholder="Como podemos ajudar?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} className={`bg-white ${errors.message ? "border-red-500" : ""}`} />
                  <FieldError message={errors.message} />
                </div>
                <Button type="submit" disabled={sending} className="w-full bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold py-6 rounded-xl text-base">
                  {sending ? "Enviando..." : "Enviar Mensagem"}
                  {!sending && <Send className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}