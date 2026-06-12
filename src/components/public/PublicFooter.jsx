import React, { useState } from "react";
import { Truck } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PublicFooter() {
  const { settings } = useCompanySettings();
  const [modal, setModal] = useState(null); // "privacy" | "terms"

  return (
    <>
    <footer className="bg-velox-dark text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 bg-velox-amber rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-velox-dark" />
              </div>
              <div>
                <span className="font-display text-2xl font-extrabold tracking-tight">VELOX</span>
                <span className="block text-[10px] text-velox-amber/80 uppercase tracking-[0.25em] -mt-1">
                  Transportadora
                </span>
              </div>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">
              Conectando origens a destinos com pontualidade, segurança e compromisso.
            </p>
            {/* Social links */}
            <div className="flex gap-3 mt-4">
              {settings?.social_instagram && (
                <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-velox-amber text-xs transition-colors">Instagram</a>
              )}
              {settings?.social_linkedin && (
                <a href={settings.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-velox-amber text-xs transition-colors">LinkedIn</a>
              )}
              {settings?.social_facebook && (
                <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-velox-amber text-xs transition-colors">Facebook</a>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-white/70 mb-4">Links Rápidos</h4>
            <ul className="space-y-2.5">
              {[["Início", "/"], ["Serviços", "/#servicos"], ["Sobre Nós", "/#sobre"], ["Contato", "/#contato"], ["Rastrear", "/rastrear"]].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-white/40 hover:text-velox-amber text-sm transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-white/70 mb-4">Serviços</h4>
            <ul className="space-y-2.5">
              {["Frete Dedicado", "Frete Fracionado", "Coleta Programada", "Entrega Expressa"].map((s) => (
                <li key={s}>
                  <a href="#servicos" className="text-white/40 hover:text-velox-amber text-sm transition-colors">{s}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-white/70 mb-4">Contato</h4>
            <div className="space-y-2.5 text-white/40 text-sm">
              {settings?.phone && <p>{settings.phone}</p>}
              {settings?.email && <p>{settings.email}</p>}
              {settings?.cnpj && <p>CNPJ: {settings.cnpj}</p>}
            </div>
          </div>
        </div>

        {/* Divider + copyright */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} {settings?.company_name || "Velox Transportadora"}. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <button onClick={() => setModal("privacy")} className="text-white/30 hover:text-velox-amber text-xs transition-colors">Política de Privacidade</button>
            <button onClick={() => setModal("terms")} className="text-white/30 hover:text-velox-amber text-xs transition-colors">Termos de Uso</button>
          </div>
        </div>
      </div>
    </footer>

    <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{modal === "privacy" ? "Política de Privacidade" : "Termos de Uso"}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          {modal === "privacy" ? (
            <>
              <p>Esta plataforma coleta apenas os dados necessários para a prestação do serviço de transporte de cargas, incluindo nome, CPF/CNPJ, endereço e informações de contato.</p>
              <p>Seus dados não são compartilhados com terceiros sem o seu consentimento expresso, exceto quando exigido por lei ou necessário para a execução do serviço contratado.</p>
              <p>Os dados são armazenados de forma segura e utilizados exclusivamente para fins operacionais relacionados ao transporte e logística.</p>
              <p>Para exercer seus direitos de acesso, correção ou exclusão de dados, entre em contato conosco pelo e-mail ou telefone informados neste site.</p>
            </>
          ) : (
            <>
              <p>Ao utilizar os serviços da {settings?.company_name || "Velox Transportadora"}, o cliente concorda com os presentes termos e condições.</p>
              <p>Os serviços de transporte estão sujeitos à disponibilidade de frota e à confirmação por parte da empresa. O valor do frete é definido após análise da carga e do trajeto.</p>
              <p>O cliente é responsável pela veracidade das informações fornecidas sobre a carga, incluindo peso, dimensões e valor declarado.</p>
              <p>A empresa não se responsabiliza por atrasos decorrentes de situações de força maior, condições climáticas adversas ou restrições de tráfego.</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}