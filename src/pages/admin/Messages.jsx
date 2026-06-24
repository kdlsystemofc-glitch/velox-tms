import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Mail, Phone, FilePlus, Search, Download } from "lucide-react";
import { downloadCsv, csvDate } from "@/utils/exportCsv";

/**
 * Mensagens — funil de leads vindos do site público.
 * novo → em contato → convertido / perdido / arquivado.
 */
const STATUS = {
  novo:       { label: "Novo",       cls: "bg-blue-100 text-blue-700" },
  em_contato: { label: "Em contato", cls: "bg-amber-100 text-amber-700" },
  convertido: { label: "Convertido", cls: "bg-green-100 text-green-700" },
  perdido:    { label: "Perdido",    cls: "bg-red-100 text-red-700" },
  arquivado:  { label: "Arquivado",  cls: "bg-gray-100 text-gray-600" },
};
const statusOf = (m) => m.status || (m.read ? "em_contato" : "novo");

export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedMsg, setExpandedMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ativos");
  const [noteDraft, setNoteDraft] = useState({});

  const { data: messages = [] } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: () => base44.entities.ContactMessage.list("-created_date"),
  });

  const patch = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContactMessage.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-messages"] }),
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });

  const markRead = (msg) => { if (!msg.read) patch.mutate({ id: msg.id, data: { read: true } }); };
  const setStatus = (msg, status) => patch.mutate({ id: msg.id, data: { status, read: true } });
  // Registrar um contato (responder e-mail/WhatsApp): move para "em contato" e marca a data.
  const logContact = (msg) => {
    const st = statusOf(msg);
    const data = { read: true, last_contact_at: new Date().toISOString() };
    if (st === "novo") data.status = "em_contato";
    patch.mutate({ id: msg.id, data });
  };
  const saveNote = (msg) => {
    const note = noteDraft[msg.id];
    if (note === undefined || note === (msg.internal_notes || "")) return;
    patch.mutate({ id: msg.id, data: { internal_notes: note } });
    toast({ title: "Nota salva" });
  };

  const markAllRead = () => {
    messages.filter(m => !m.read).forEach(m => patch.mutate({ id: m.id, data: { read: true } }));
  };

  const createOrderFromMessage = (msg) => {
    setStatus(msg, "em_contato");
    navigate("/admin/coletas/nova", { state: { fromMessage: {
      message_id: msg.id,
      client_name: msg.name || "",
      client_phone: msg.phone || "",
      client_email: msg.email || "",
      general_notes: msg.message ? `Origem: contato do site.\n"${msg.message}"` : "",
    } } });
  };

  // ── Métricas ──
  const counts = { novo: 0, em_contato: 0, convertido: 0, perdido: 0, arquivado: 0 };
  messages.forEach(m => { counts[statusOf(m)] = (counts[statusOf(m)] || 0) + 1; });
  const tratados = messages.filter(m => statusOf(m) !== "arquivado").length;
  const convRate = tratados > 0 ? (counts.convertido / tratados) * 100 : 0;
  const unreadCount = messages.filter(m => !m.read).length;
  // Tempo médio até a 1ª resposta (Msg-3).
  const responded = messages.filter(m => m.last_contact_at && m.created_date);
  const avgRespH = responded.length ? responded.reduce((s, m) => s + (new Date(m.last_contact_at) - new Date(m.created_date)) / 3.6e6, 0) / responded.length : null;
  const fmtDur = (h) => h == null ? "—" : h < 1 ? "<1h" : h < 24 ? `${h.toFixed(0)}h` : `${(h / 24).toFixed(1)}d`;

  // ── Filtro + busca ──
  const q = search.trim().toLowerCase();
  const visible = messages.filter(m => {
    const st = statusOf(m);
    if (filter === "ativos" ? (st === "arquivado") : (filter !== "all" && st !== filter)) return false;
    if (q && !`${m.name || ""} ${m.email || ""} ${m.phone || ""} ${m.message || ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const TABS = [["ativos", "Ativos"], ["novo", "Novos"], ["em_contato", "Em contato"], ["convertido", "Convertidos"], ["perdido", "Perdidos"], ["arquivado", "Arquivados"], ["all", "Todos"]];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Mensagens</h1>
            <p className="text-muted-foreground text-xs">
              Leads recebidos pelo site
              {unreadCount > 0 && <span className="ml-1 text-primary font-medium">· {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled={messages.length === 0}
            onClick={() => downloadCsv(`leads-${new Date().toISOString().slice(0,10)}`, messages, [
              { key: "name", label: "Nome" }, { key: "email", label: "E-mail" }, { key: "phone", label: "Telefone" },
              { key: "status", label: "Status", format: (_v, m) => STATUS[statusOf(m)]?.label || "Novo" },
              { key: "converted_order_protocol", label: "Pedido" },
              { key: "created_date", label: "Recebido em", format: csvDate },
              { key: "message", label: "Mensagem" },
            ])}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
          {unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllRead}>Marcar todas como lidas</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Novos</p><p className="text-2xl font-bold text-blue-600">{counts.novo}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Em contato</p><p className="text-2xl font-bold text-amber-600">{counts.em_contato}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Convertidos</p><p className="text-2xl font-bold text-green-600">{counts.convertido}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Taxa de conversão</p><p className="text-2xl font-bold">{convRate.toFixed(0)}%</p><p className="text-[11px] text-muted-foreground mt-0.5">1ª resposta: {fmtDur(avgRespH)}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail, telefone…" className="pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(([v, l]) => (
            <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} className={filter === v ? "bg-velox-dark text-white" : ""} onClick={() => setFilter(v)}>
              {l}{v !== "all" && v !== "ativos" && counts[v] > 0 ? ` ${counts[v]}` : ""}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          {visible.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">Nenhuma mensagem {filter === "ativos" ? "ativa" : "neste filtro"}.</p>
          ) : (
            <div className="space-y-2">
              {visible.map((msg) => {
                const st = statusOf(msg);
                const sc = STATUS[st] || STATUS.novo;
                return (
                  <div key={msg.id} className={`rounded-md border overflow-hidden ${msg.read ? "bg-background border-border" : "bg-primary/5 border-primary/30"}`}>
                    <button className="w-full p-3.5 flex items-start justify-between text-left gap-4" onClick={() => { setExpandedMsg(expandedMsg === msg.id ? null : msg.id); markRead(msg); }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!msg.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                          <span className="font-semibold text-sm">{msg.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{msg.email}</span>
                          {msg.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{msg.phone}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{msg.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 text-right">
                        <span className="block">{msg.created_date ? new Date(msg.created_date).toLocaleDateString("pt-BR") : "—"}</span>
                        <span className="text-[10px] opacity-70">via site</span>
                      </span>
                    </button>
                    {expandedMsg === msg.id && (
                      <div className="border-t border-border px-3.5 pb-3.5 pt-3 space-y-3">
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        {msg.last_contact_at && (
                          <p className="text-[11px] text-muted-foreground">Último contato: {new Date(msg.last_contact_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                        )}

                        {msg.converted_order_id && (
                          <button onClick={() => navigate(`/admin/coletas/${msg.converted_order_id}`)} className="text-xs text-green-700 font-medium hover:underline">
                            ✓ Pedido gerado{msg.converted_order_protocol ? `: ${msg.converted_order_protocol}` : ""}
                          </button>
                        )}

                        <div>
                          <label className="text-xs text-muted-foreground">Nota interna</label>
                          <Textarea rows={2} className="resize-none mt-1 text-sm"
                            placeholder="Anotações sobre o atendimento deste lead…"
                            value={noteDraft[msg.id] ?? msg.internal_notes ?? ""}
                            onChange={e => setNoteDraft(d => ({ ...d, [msg.id]: e.target.value }))}
                            onBlur={() => saveNote(msg)} />
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" className="text-xs gap-1 font-bold" onClick={() => createOrderFromMessage(msg)}>
                            <FilePlus className="w-3 h-3" /> Criar pedido
                          </Button>
                          {msg.email && (
                            <a href={`mailto:${msg.email}`} onClick={() => logContact(msg)}><Button size="sm" variant="outline" className="text-xs gap-1"><Mail className="w-3 h-3" /> Responder por e-mail</Button></a>
                          )}
                          {msg.phone && (
                            <a href={`https://wa.me/55${msg.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={() => logContact(msg)}><Button size="sm" variant="outline" className="text-xs gap-1"><Phone className="w-3 h-3" /> WhatsApp</Button></a>
                          )}
                          <div className="flex-1" />
                          {st !== "perdido" && <Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => setStatus(msg, "perdido")}>Perdido</Button>}
                          {st !== "arquivado"
                            ? <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setStatus(msg, "arquivado")}>Arquivar</Button>
                            : <Button size="sm" variant="ghost" className="text-xs" onClick={() => setStatus(msg, "novo")}>Reabrir</Button>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
