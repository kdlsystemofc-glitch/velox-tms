import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection, Field } from "@/components/shared/FormSection";
import { MapPin, Loader2 } from "lucide-react";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function fmtCep(value) {
  const d = (value || "").replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/**
 * Busca endereço no ViaCEP. Retorna {street, neighborhood, city, state} ou null.
 */
export async function lookupCep(cep) {
  const digits = (cep || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    return null;
  }
}

/**
 * Bloco de endereço reutilizável com autofill por CEP (ViaCEP).
 * - value: objeto { cep, street, number, complement, neighborhood, city, state }
 * - onChange(nextValue): recebe o objeto inteiro atualizado
 * - title: se informado, embrulha numa FormSection com cabeçalho; senão renderiza só a grade.
 */
export function AddressFields({ value = {}, onChange, title, icon = MapPin, description, cols = 6, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });

  const handleCep = async (raw) => {
    const formatted = fmtCep(raw);
    const digits = formatted.replace(/\D/g, "");
    set({ cep: formatted });
    if (digits.length === 8) {
      setLoading(true);
      const found = await lookupCep(digits);
      setLoading(false);
      if (found) {
        onChange({
          ...value,
          cep: formatted,
          street: found.street || value.street || "",
          neighborhood: found.neighborhood || value.neighborhood || "",
          city: found.city || value.city || "",
          state: found.state || value.state || "",
        });
      }
    }
  };

  const grid = (
    <>
      <Field label="CEP" hint={loading ? "Buscando endereço…" : "Preenche o endereço automaticamente"}>
        <div className="relative">
          <Input
            placeholder="00000-000"
            value={value.cep || ""}
            maxLength={9}
            disabled={disabled}
            onChange={(e) => handleCep(e.target.value)}
            onPaste={(e) => { e.preventDefault(); handleCep(e.clipboardData.getData("text")); }}
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
        </div>
      </Field>
      <Field label="Número">
        <Input placeholder="Nº" value={value.number || ""} disabled={disabled} onChange={(e) => set({ number: e.target.value })} />
      </Field>
      <Field label="Complemento" colSpan={2}>
        <Input placeholder="Sala, galpão, bloco…" value={value.complement || ""} disabled={disabled} onChange={(e) => set({ complement: e.target.value })} />
      </Field>
      <Field label="Rua / Logradouro" colSpan={4}>
        <Input placeholder="Preenchido pelo CEP (editável)" value={value.street || ""} disabled={disabled} onChange={(e) => set({ street: e.target.value })} />
      </Field>
      <Field label="Bairro" colSpan={2}>
        <Input placeholder="Preenchido pelo CEP" value={value.neighborhood || ""} disabled={disabled} onChange={(e) => set({ neighborhood: e.target.value })} />
      </Field>
      <Field label="Cidade" colSpan={3}>
        <Input placeholder="Preenchido pelo CEP" value={value.city || ""} disabled={disabled} onChange={(e) => set({ city: e.target.value })} />
      </Field>
      <Field label="UF">
        <Select value={value.state || ""} onValueChange={(v) => set({ state: v })} disabled={disabled}>
          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>{ESTADOS_BR.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </>
  );

  if (title) {
    return <FormSection title={title} description={description} icon={icon} cols={cols}>{grid}</FormSection>;
  }
  // Modo "bare": grade própria para encaixar dentro de outra seção
  return <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-x-4 gap-y-3.5`}>{grid}</div>;
}

export default AddressFields;
