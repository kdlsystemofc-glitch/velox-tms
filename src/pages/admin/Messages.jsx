import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Mail, Phone, FilePlus } from "lucide-react";

/**
 * Mensagens — caixa de entrada de contatos vindos do site público (leads).
 * Saiu de Configurações por ser operacional, não um parâmetro.
 */
export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedMsg, setExpandedMsg] = useState(null);

  const createOrderFromMessage = (msg) => {
    markRead(msg);
    navigate("/admin/coletas/nova", { state: { fromMessage: {
      client_name: msg.name || "",
      client_phone: msg.phone || "",
      client_email: msg.email || "",
      general_notes: msg.message ? `Origem: contato do site.\n"${msg.message}"` : "",
    } } });
  };

  const { data: messages = [] } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: () => base44.entities.ContactMessage.list("-created_date"),
  });
  const unreadCount = messages.filter(m => !m.read).length;

  const markRead = async (msg) => {
    if (msg.read) return;
    await base44.entities.ContactMessage.update(msg.id, { read: true });
    queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
  };

  const markAllRead = async () => {
    const unread = messages.filter(m => !m.read);
    await Promise.all(unread.map(m => base44.entities.ContactMessage.update(m.id, { read: true })));
    queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Mensagens</h1>
            <p className="text-muted-foreground text-xs">
              Contatos recebidos pelo site público
              {unreadCount > 0 && <span className="ml-1 text-primary font-medium">· {unreadCount} não lida{unreadCount !== 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>Marcar todas como lidas</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-3">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">Nenhuma mensagem recebida.</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className={`rounded-md border overflow-hidden ${msg.read ? "bg-background border-border" : "bg-primary/5 border-primary/30"}`}>
                  <button className="w-full p-3.5 flex items-start justify-between text-left gap-4" onClick={() => { setExpandedMsg(expandedMsg === msg.id ? null : msg.id); markRead(msg); }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!msg.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                        <span className="font-semibold text-sm">{msg.name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{msg.email}</span>
                        {msg.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{msg.phone}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{msg.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{msg.created_date ? new Date(msg.created_date).toLocaleDateString("pt-BR") : "—"}</span>
                  </button>
                  {expandedMsg === msg.id && (
                    <div className="border-t border-border px-3.5 pb-3.5 pt-3 space-y-3">
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" className="text-xs gap-1 bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" onClick={() => createOrderFromMessage(msg)}>
                          <FilePlus className="w-3 h-3" /> Criar pedido
                        </Button>
                        {msg.email && (
                          <a href={`mailto:${msg.email}`}>
                            <Button size="sm" variant="outline" className="text-xs gap-1"><Mail className="w-3 h-3" /> Responder por e-mail</Button>
                          </a>
                        )}
                        {msg.phone && (
                          <a href={`https://wa.me/55${msg.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="text-xs gap-1"><Phone className="w-3 h-3" /> WhatsApp</Button>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
