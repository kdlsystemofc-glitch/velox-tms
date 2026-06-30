import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { Plus, Trash2, CheckCircle2, ArrowLeft } from "lucide-react";
import { lookupCep } from "@/components/shared/AddressFields";
import { calculateFreightFull } from "@/utils/freightCalculator";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { parseBRNumber } from "@/utils/number";

const inputCls = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const emptyItem = { nf_number: "", volumes: "", weight_kg: "" };
const emptyRecipient = () => ({ name: "", cep: "", city: "", state: "", street: "", number: "", items: [{ ...emptyItem }] });

function Field({ label, children, className = "" }) {
  return <div className={className}><label className="text-xs font-medium text-gray-600">{label}</label>{children}</div>;
}

export default function ClientNewOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    origin: { cep: "", street: "", number: "", city: "", state: "" },
    collection_date: "",
    recipients: [emptyRecipient()],
    general_notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const { settings } = useCompanySettings();

  const setOrigin = (k, v) => setForm(f => ({ ...f, origin: { ...f.origin, [k]: v } }));
  const fillOriginCep = async (cep) => {
    const found = await lookupCep(cep);
    if (found) setForm(f => ({ ...f, origin: { ...f.origin, street: found.street || "", city: found.city || "", state: found.state || "" } }));
  };

  // Destinatários (U5: vários)
  const setRecipient = (ri, k, v) => setForm(f => ({ ...f, recipients: f.recipients.map((r, j) => j === ri ? { ...r, [k]: v } : r) }));
  const fillRecipientCep = async (ri, cep) => {
    const found = await lookupCep(cep);
    if (found) setForm(f => ({ ...f, recipients: f.recipients.map((r, j) => j === ri ? { ...r, street: found.street || "", city: found.city || "", state: found.state || "" } : r) }));
  };
  const addRecipient = () => setForm(f => ({ ...f, recipients: [...f.recipients, emptyRecipient()] }));
  const removeRecipient = (ri) => setForm(f => ({ ...f, recipients: f.recipients.filter((_, j) => j !== ri) }));
  const setItem = (ri, ii, k, v) => setForm(f => ({ ...f, recipients: f.recipients.map((r, j) => j !== ri ? r : { ...r, items: r.items.map((it, k2) => k2 === ii ? { ...it, [k]: v } : it) }) }));
  const addItem = (ri) => setForm(f => ({ ...f, recipients: f.recipients.map((r, j) => j === ri ? { ...r, items: [...r.items, { ...emptyItem }] } : r) }));
  const removeItem = (ri, ii) => setForm(f => ({ ...f, recipients: f.recipients.map((r, j) => j === ri ? { ...r, items: r.items.filter((_, k2) => k2 !== ii) } : r) }));

  // Estimativa de frete (U4): soma a estimativa de cada destinatário.
  const estimate = useMemo(() => {
    if (!form.origin.state) return 0;
    let total = 0;
    for (const r of form.recipients) {
      const items = (r.items || []).filter(it => it.volumes || it.weight_kg);
      if (!items.length || !r.state) continue;
      try {
        const bd = calculateFreightFull({
          items, distanceKm: null,
          nfCount: items.filter(i => i.nf_number).length || 1,
          pricing: settings?.pricing, settings,
          originState: form.origin.state, destState: r.state,
        });
        total += Number(bd?.total) || 0;
      } catch { /* ignora */ }
    }
    return Math.round(total * 100) / 100;
  }, [form.recipients, form.origin.state, settings]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.origin.cep || !form.collection_date) return setError("Informe o CEP de origem e a data de coleta.");
    if (form.recipients.some(r => !r.name || !r.city)) return setError("Cada destinatário precisa de nome e cidade.");
    setLoading(true);
    try {
      let total_volumes = 0, total_weight_kg = 0;
      const recipients = form.recipients.map(r => {
        const items = (r.items || []).filter(it => it.volumes || it.weight_kg || it.nf_number);
        items.forEach(it => { total_volumes += parseBRNumber(it.volumes); total_weight_kg += parseBRNumber(it.weight_kg); });
        return { ...r, items };
      });
      const payload = {
        origin: form.origin,
        collection_date: form.collection_date,
        recipients,
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
            <Field label="CEP *"><input className={inputCls} value={form.origin.cep} onChange={e => setOrigin("cep", e.target.value)} onBlur={e => fillOriginCep(e.target.value)} placeholder="00000-000" /></Field>
            <Field label="Cidade" className="col-span-2"><input className={inputCls} value={form.origin.city} onChange={e => setOrigin("city", e.target.value)} /></Field>
            <Field label="UF"><input className={inputCls} value={form.origin.state} onChange={e => setOrigin("state", e.target.value)} maxLength={2} /></Field>
            <Field label="Endereço" className="col-span-3"><input className={inputCls} value={form.origin.street} onChange={e => setOrigin("street", e.target.value)} /></Field>
            <Field label="Número"><input className={inputCls} value={form.origin.number} onChange={e => setOrigin("number", e.target.value)} /></Field>
            <Field label="Data de coleta *" className="col-span-2"><input type="date" className={inputCls} value={form.collection_date} onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} /></Field>
          </div>
        </section>

        {form.recipients.map((r, ri) => (
          <section key={ri} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Destinatário {form.recipients.length > 1 ? ri + 1 : ""}</h2>
              {form.recipients.length > 1 && (
                <button type="button" onClick={() => removeRecipient(ri)} className="text-red-400 hover:text-red-600 inline-flex items-center gap-1 text-xs"><Trash2 className="w-3.5 h-3.5" /> Remover</button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Nome / Razão social *" className="col-span-2"><input className={inputCls} value={r.name} onChange={e => setRecipient(ri, "name", e.target.value)} /></Field>
              <Field label="CEP"><input className={inputCls} value={r.cep} onChange={e => setRecipient(ri, "cep", e.target.value)} onBlur={e => fillRecipientCep(ri, e.target.value)} placeholder="00000-000" /></Field>
              <Field label="UF"><input className={inputCls} value={r.state} onChange={e => setRecipient(ri, "state", e.target.value)} maxLength={2} /></Field>
              <Field label="Cidade *" className="col-span-2"><input className={inputCls} value={r.city} onChange={e => setRecipient(ri, "city", e.target.value)} /></Field>
              <Field label="Endereço" className="col-span-3"><input className={inputCls} value={r.street} onChange={e => setRecipient(ri, "street", e.target.value)} /></Field>
              <Field label="Número"><input className={inputCls} value={r.number} onChange={e => setRecipient(ri, "number", e.target.value)} /></Field>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Itens / Notas fiscais</p>
                <button type="button" onClick={() => addItem(ri)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> Adicionar item</button>
              </div>
              <div className="space-y-2">
                {r.items.map((it, ii) => (
                  <div key={ii} className="grid grid-cols-12 gap-2 items-end">
                    <Field label="Nº NF" className="col-span-5"><input className={inputCls} value={it.nf_number} onChange={e => setItem(ri, ii, "nf_number", e.target.value)} placeholder="ex: 001234" /></Field>
                    <Field label="Volumes" className="col-span-3"><input className={inputCls} value={it.volumes} onChange={e => setItem(ri, ii, "volumes", e.target.value.replace(/\D/g, ""))} placeholder="ex: 12" /></Field>
                    <Field label="Peso (kg)" className="col-span-3"><input className={inputCls} value={it.weight_kg} onChange={e => setItem(ri, ii, "weight_kg", e.target.value)} placeholder="ex: 480" /></Field>
                    <div className="col-span-1">
                      {r.items.length > 1 && <button type="button" onClick={() => removeItem(ri, ii)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <button type="button" onClick={addRecipient} className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:border-primary/50 hover:text-primary inline-flex items-center justify-center gap-1.5">
          <Plus className="w-4 h-4" /> Adicionar destinatário
        </button>

        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <Field label="Observações"><textarea rows={2} className={inputCls + " resize-none"} value={form.general_notes} onChange={e => setForm(f => ({ ...f, general_notes: e.target.value }))} placeholder="Restrições de horário, instruções de coleta…" /></Field>
        </section>

        {estimate > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Estimativa de frete</p>
              <p className="text-[11px] text-gray-400">Valor aproximado — a Velox confirma ao programar.</p>
            </div>
            <p className="font-mono font-bold text-lg text-blue-700">R$ {estimate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-brand-gradient text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-60">
          {loading ? "Enviando…" : "Solicitar coleta"}
        </button>
      </form>
    </div>
  );
}
