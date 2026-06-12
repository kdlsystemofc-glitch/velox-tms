import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Erro ao enviar e-mail");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout icon={CheckCircle} title="E-mail enviado" subtitle="Verifique sua caixa de entrada">
        <p className="text-center text-muted-foreground mb-4">
          Enviamos as instruções de redefinição para <strong>{email}</strong>.
        </p>
        <Link to="/login" className="text-primary font-medium hover:underline block text-center">
          Voltar para o login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={Mail} title="Esqueceu a senha?" subtitle="Enviaremos um link de recuperação"
      footer={<Link to="/login" className="text-primary font-medium hover:underline">Voltar para o login</Link>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>E-mail cadastrado</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" className="pl-10 h-12" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <Button type="submit" className="w-full h-12 font-semibold" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Enviar link de recuperação
        </Button>
      </form>
    </AuthLayout>
  );
}
