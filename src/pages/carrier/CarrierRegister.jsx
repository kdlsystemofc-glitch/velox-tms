import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Truck, CheckCircle2 } from "lucide-react";

export default function CarrierRegister() {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", company: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name || !form.email || !form.company) return setError("Preencha nome, e-mail e transportadora.");
    if (form.password.length < 6) return setError("A senha precisa ter ao menos 6 caracteres.");
    setLoading(true);
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.full_name } },
      });
      if (signErr) throw signErr;
      if (data.session) {
        await supabase.rpc("set_my_carrier_request", { p_company: form.company });
        await supabase.auth.signOut(); // aguarda aprovação
      }
      setDone(true);
    } catch (err) {
      setError(err?.message || "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <h1 className="font-display text-xl font-bold text-foreground mb-2">Cadastro enviado!</h1>
          <p className="text-sm text-muted-foreground">Sua solicitação foi enviada. Assim que a Velox aprovar e vincular sua transportadora, você poderá entrar no Portal da Transportadora e receber ofertas de frete.</p>
          <Link to="/login" className="inline-block mt-5 text-sm font-semibold text-primary hover:underline">Ir para o login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div className="leading-none">
            <span className="font-display text-lg font-extrabold tracking-tight block">VELOX</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Portal da Transportadora</span>
          </div>
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">Criar acesso de parceiro</h1>
        <p className="text-sm text-muted-foreground mb-5">Cadastre sua transportadora para receber ofertas de frete da Velox. A Velox aprova e vincula.</p>

        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Seu nome *</label>
            <input className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Nome do responsável" value={form.full_name} onChange={e => set("full_name", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Transportadora (Razão social ou CNPJ) *</label>
            <input className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Ex: Transportes Beta Ltda — 00.000.000/0001-00" value={form.company} onChange={e => set("company", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">E-mail *</label>
            <input type="email" className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="voce@transportadora.com.br" value={form.email} onChange={e => set("email", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Senha *</label>
            <input type="password" className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => set("password", e.target.value)} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-brand-gradient text-white font-semibold py-2.5 rounded-lg text-sm disabled:opacity-60">
            {loading ? "Enviando…" : "Criar acesso"}
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-4">Já tem acesso? <Link to="/login" className="font-semibold text-primary hover:underline">Entrar</Link></p>
      </div>
    </div>
  );
}
