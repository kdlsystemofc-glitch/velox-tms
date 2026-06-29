import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Plus, Trash2, CheckCircle2, ArrowLeft } from "lucide-react";

const inputCls = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const emptyItem = { nf_number: "", volumes: "", weight_kg: "" };

function Field({ label, children, className = "" }) {
  return <div className={className}><label className="text-xs font-medium text-gray-600">{label}</label>{children}</div>;
}

export default function ClientNewOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    origin: { cep: "", street: "", number: "", city: "", state: "" },
    collection_date: "",
    recipient: { name: "", cep: "", city: "", state: "", street: "", number: "" },
    items: [{ ...emptyItem }],
    general_notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const setOrigin = (k, v) => setForm(f => ({ ...f, origin: { ...f.origin, [k]: v } }));
  const setRecipient = (k, v) => setForm(f => ({ ...f, recipient: { ...f.recipient, [k]: v } }));
  const setItem = (i, k, v) => setForm(f => ({ ...f, items: f.items.map((it, j) => j === i ? { ...it, [k]: v } : it) }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.origin.cep || !form.collection_date) return setError("Informe o CEP de origem e a data de coleta.");
    if (!form.recipient.name || !form.recipient.city) return setError("Informe o destinatário (nome e cidade).");
    setLoading(true);
    try {
      const items = form.items.filter(it => it.volumes || it.weight_kg || it.nf_number);
      const total_volumes = items.reduce((s, it) => s + (Number(it.volumes) || 0), 0);
      const total_weight_kg = items.reduce((s, it) => s + (Number(String(it.weight_kg).replace(",", ".")) || 0), 0);
      const payload = {
        origin: form.origin,
        collection_date: form.collection_date,
        recipients: [{ ...form.recipient, items }],
        total_volumes: String(total_volumes || ""),
        total_weight_kg: String(total_weight_kg || ""),
        general_notes: form.general_notes,
      };
      const { data, error: rpcErr } = await supabase.rpc("create_client_order", { p: payload });
      if (rpcErr) throw rpcErr;
      setDone(data);
    } catch (err) {
      setError(err?.message || "Não foi possível criar o pedido.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
        <h1 className="font-display text-xl font-bold text-gray-900 mb-1">Pedido criado!</h1>
        <p className="text-sm text-gray-600">Protocolo <span className="font-mono font-bold">{done}</span>. Acompanhe o andamento em Meus Pedidos.</p>
        <button onClick={() => navigate("/portal")} className="mt-5 bg-brand-gradient text-white font-semibold px-5 py-2.5 rounded-lg text-sm">Ver Meus Pedidos</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => navigate("/portal")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Voltar</button>
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Novo pedido</h1>
        <p className="text-sm text-gray-500">Solicite uma coleta. A Velox confirma a data e o valor.</p>
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <form onSubmit={submit} className="space-y-5">
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-3">Coleta (origem)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="CEP *"><input className={inputCls} value={form.origin.cep} onChange={e => setOrigin("cep", e.target.value)} placeholder="00000-000" /></Field>
            <Field label="Cidade" className="col-span-2"><input className={inputCls} value={form.origin.city} onChange={e => setOrigin("city", e.target.value)} /></Field>
            <Field label="UF"><input className={inputCls} value={form.origin.state} onChange={e => setOrigin("state", e.target.value)} maxLength={2} /></Field>
            <Field label="Endereço" className="col-span-3"><input className={inputCls} value={form.origin.street} onChange={e => setOrigin("street", e.target.value)} /></Field>
            <Field label="Número"><input className={inputCls} value={form.origin.number} onChange={e => setOrigin("number", e.target.value)} /></Field>
            <Field label="Data de coleta *" className="col-span-2"><input type="date" className={inputCls} value={form.collection_date} onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} /></Field>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-3">Destinatário</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Nome / Razão social *" className="col-span-2"><input className={inputCls} value={form.recipient.name} onChange={e => setRecipient("name", e.target.value)} /></Field>
            <Field label="CEP"><input className={inputCls} value={form.recipient.cep} onChange={e => setRecipient("cep", e.target.value)} placeholder="00000-000" /></Field>
            <Field label="UF"><input className={inputCls} value={form.recipient.state} onChange={e => setRecipient("state", e.target.value)} maxLength={2} /></Field>
            <Field label="Cidade *" className="col-span-2"><input className={inputCls} value={form.recipient.city} onChange={e => setRecipient("city", e.target.value)} /></Field>
            <Field label="Endereço" className="col-span-3"><input className={inputCls} value={form.recipient.street} onChange={e => setRecipient("street", e.target.value)} /></Field>
            <Field label="Número"><input className={inputCls} value={form.recipient.number} onChange={e => setRecipient("number", e.target.value)} /></Field>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Itens / Notas fiscais</h2>
            <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> Adicionar item</button>
          </div>
          <div className="space-y-2">
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <Field label="Nº NF" className="col-span-5"><input className={inputCls} value={it.nf_number} onChange={e => setItem(i, "nf_number", e.target.value)} placeholder="ex: 001234" /></Field>
                <Field label="Volumes" className="col-span-3"><input className={inputCls} value={it.volumes} onChange={e => setItem(i, "volumes", e.target.value.replace(/\D/g, ""))} placeholder="ex: 12" /></Field>
                <Field label="Peso (kg)" className="col-span-3"><input className={inputCls} value={it.weight_kg} onChange={e => setItem(i, "weight_kg", e.target.value)} placeholder="ex: 480" /></Field>
                <div className="col-span-1">
                  {form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <Field label="Observações"><textarea rows={2} className={inputCls + " resize-none"} value={form.general_notes} onChange={e => setForm(f => ({ ...f, general_notes: e.target.value }))} placeholder="Restrições de horário, instruções de coleta…" /></Field>
        </section>

        <button type="submit" disabled={loading} className="w-full bg-brand-gradient text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-60">
          {loading ? "Enviando…" : "Solicitar coleta"}
        </button>
      </form>
    </div>
  );
}
