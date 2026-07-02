import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { ShieldCheck, ShieldOff, Loader2, KeyRound } from "lucide-react";

/**
 * Página Segurança (Projeto 07.2) — autogestão de MFA (TOTP) do próprio usuário.
 * Opt-in: qualquer usuário pode ativar/remover o seu 2FA. O reset por admin
 * (recuperação de lockout) fica em Usuários (P07.3).
 */
export default function Security() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState(null);     // fator TOTP verificado atual
  const [enroll, setEnroll] = useState(null);      // { id, qr, secret } durante o cadastro
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactor((data?.totp || []).find((f) => f.status === "verified") || null);
    } catch {
      setFactor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e) {
      toast({ title: "Erro ao iniciar 2FA", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async () => {
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enroll.id });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: enroll.id, challengeId: ch.id, code: code.trim() });
      if (vErr) throw vErr;
      setEnroll(null); setCode("");
      toast({ title: "2FA ativado", description: "Sua conta agora pede o código ao entrar." });
      await refresh();
    } catch (e) {
      toast({ title: "Código inválido", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (enroll?.id) { try { await supabase.auth.mfa.unenroll({ factorId: enroll.id }); } catch { /* ignora */ } }
    setEnroll(null); setCode("");
  };

  const removeFactor = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
      toast({ title: "2FA removido" });
      await refresh();
    } catch (e) {
      toast({ title: "Erro ao remover 2FA", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader icon={ShieldCheck} title="Segurança" subtitle="Verificação em duas etapas (2FA) da sua conta" />

      <Card>
        <CardHeader className="py-3 border-b border-border bg-muted/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-velox-amber" /> Autenticação em duas etapas (TOTP)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</div>
          ) : factor ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm flex items-center gap-2 text-green-700 dark:text-green-300">
                <ShieldCheck className="w-4 h-4" /> 2FA ativo — sua conta pede o código do app autenticador ao entrar.
              </p>
              <Button variant="outline" size="sm" className="text-red-600 dark:text-red-300 gap-1" onClick={removeFactor} disabled={busy}>
                <ShieldOff className="w-3.5 h-3.5" /> Remover 2FA
              </Button>
            </div>
          ) : enroll ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">1. Escaneie o QR no seu app autenticador (Google Authenticator, Authy, 1Password…).</p>
              {/* enroll.qr é um SVG data-URI retornado pelo Supabase */}
              <img src={enroll.qr} alt="QR code do 2FA" className="w-44 h-44 bg-white rounded-lg p-2 border border-border" />
              <p className="text-xs text-muted-foreground">Ou use o código manual: <span className="font-mono select-all">{enroll.secret}</span></p>
              <p className="text-sm text-muted-foreground">2. Digite o código gerado para confirmar:</p>
              <Input inputMode="numeric" placeholder="000000" className="h-11 w-40 tracking-[0.4em] text-center font-mono"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmEnroll} disabled={busy || code.length < 6}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Ativar 2FA
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEnroll} disabled={busy}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">O 2FA adiciona uma camada extra: além da senha, é pedido um código do app autenticador ao entrar.</p>
              <Button size="sm" className="gap-1" onClick={startEnroll} disabled={busy}>
                <ShieldCheck className="w-3.5 h-3.5" /> Ativar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground px-1">Perdeu o acesso ao app? Um administrador pode redefinir seu 2FA em Usuários.</p>
    </div>
  );
}
