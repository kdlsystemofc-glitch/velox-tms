import React from "react";
import { MessageCircle } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function WhatsAppButton() {
  const { settings } = useCompanySettings();
  const whatsappNumber = settings?.whatsapp?.replace(/\D/g, "") || null;

  if (!whatsappNumber) return null;

  const message = encodeURIComponent("Olá! Gostaria de mais informações sobre frete.");

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30 transition-all hover:scale-110 group"
      aria-label="WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
      <span className="absolute right-full mr-3 bg-white text-gray-800 text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Fale no WhatsApp
      </span>
    </a>
  );
}