import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState(null); // { factorId, challengeId } quando o 2FA é exigido
  const [otp, setOtp] = useState("");

  // Redireciona conforme o papel após a sessão estar plenamente autenticada.
  const proceedAfterAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("user_profiles").select("role, active").eq("id", user.id).maybeSingle();
    const role = profile?.role || "pending";
    const blocked = profile && profile.active === false;
    window.location.href = blocked ? "/sem-acesso"
      : role === "motorista" ? "/motorista"
      : role === "client" ? "/portal"
      : role === "carrier" ? "/parceiro"
      : (role === "admin" || role === "operator") ? "/admin"
      : "/sem-acesso";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      // MFA (P07.2): se o usuário tem fator TOTP, a sessão fica em aal1 e precisa
      // do desafio para chegar a aal2 antes de entrar.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totp = factors?.totp?.[0];
        if (totp) {
          const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: totp.id });
          if (chErr) throw chErr;
          setMfa({ factorId: totp.id, challengeId: ch.id });
          setLoading(false);
          return;
        }
      }
      await proceedAfterAuth();
    } catch (err) {
      setError(err.message || "E-mail ou senha inválidos");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfa.factorId, challengeId: mfa.challengeId, code: otp.trim(),
      });
      if (vErr) throw vErr;
      await proceedAfterAuth();
    } catch (err) {
      setError(err.message || "Código inválido");
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta"
      footer={
        <>
          Não tem conta?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Criar conta
          </Link>
          {" · "}
          <Link to="/portal/cadastro" className="text-primary font-medium hover:underline">
            Sou cliente
          </Link>
          {" · "}
          <Link to="/parceiro/cadastro" className="text-primary font-medium hover:underline">
            Sou transportadora
          </Link>
        </>
      }
    >
      {mfa ? (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" /> Verificação em duas etapas
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp">Código do app autenticador</Label>
            <Input id="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="000000"
              className="h-12 tracking-[0.5em] text-center font-mono text-lg" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus required />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">{error}</p>}
          <Button type="submit" className="w-full h-12 font-semibold" disabled={loading || otp.length < 6}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Verificar e entrar
          </Button>
          <div className="text-center">
            <button type="button" className="text-sm text-muted-foreground hover:text-primary" onClick={() => { setMfa(null); setOtp(""); setError(""); }}>
              Voltar
            </button>
          </div>
        </form>
      ) : (
      <>
      <Button variant="outline" className="w-full h-12 text-sm font-medium mb-6" onClick={handleGoogle}>
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continuar com Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email" type="email" placeholder="seu@email.com"
              className="pl-10 h-12" value={email}
              onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password" type="password" placeholder="••••••••"
              className="pl-10 h-12" value={password}
              onChange={(e) => setPassword(e.target.value)} required
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">{error}</p>}
        <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
          Entrar
        </Button>
        <div className="text-center">
          <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-primary">
            Esqueceu sua senha?
          </Link>
        </div>
      </form>
      </>
      )}
    </AuthLayout>
  );
}
