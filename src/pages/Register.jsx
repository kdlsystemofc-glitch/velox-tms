import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, CheckCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("As senhas não coincidem"); return; }
    if (password.length < 6) { setError("Senha deve ter ao menos 6 caracteres"); return; }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (signUpError) throw signUpError;
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Falha no cadastro");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
  };

  if (success) {
    return (
      <AuthLayout icon={CheckCircle} title="Verifique seu e-mail" subtitle="Quase lá!">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Enviamos um link de confirmação para <strong>{email}</strong>.
            Clique no link para ativar sua conta.
          </p>
          <Link to="/login" className="text-primary font-medium hover:underline block">
            Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={UserPlus} title="Criar conta" subtitle="Acesse o sistema Velox"
      footer={<>Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link></>}>
      <Button variant="outline" className="w-full h-12 mb-6" onClick={handleGoogle}>
        <GoogleIcon className="w-5 h-5 mr-2" /> Continuar com Google
      </Button>
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" className="pl-10 h-12" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" className="pl-10 h-12" placeholder="Mínimo 6 caracteres"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Confirmar senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" className="pl-10 h-12" placeholder="Repita a senha"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
