import React from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function NoAccess() {
  return (
    <div className="min-h-screen bg-velox-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <ShieldAlert className="w-14 h-14 text-velox-amber mx-auto mb-4 opacity-80" />
        <h1 className="font-display text-2xl font-bold text-white mb-2">Acesso não liberado</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          Sua conta está autenticada, mas ainda não tem um perfil liberado por um administrador.
          Fale com o gestor para receber seu acesso.
        </p>
        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10"
          onClick={() => supabase.auth.signOut().then(() => window.location.href = "/login")}>
          Sair
        </Button>
      </div>
    </div>
  );
}
