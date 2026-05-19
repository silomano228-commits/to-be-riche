'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, esc, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

interface ChatMsg {
  id: string;
  text: string;
  me: boolean;
  isAdmin: boolean;
  isAdminMsg: boolean;
  ticketId: string | null;
  t: string;
}

interface Ticket {
  id: string;
  reason: string;
  status: string;
}

const QUICK_QUESTIONS = [
  'Comment déposer de l\'argent ?',
  'Comment fonctionne le trading ?',
  'Quels sont les risques ?',
  'Comment retirer mes gains ?',
  'Comment fonctionne le parrainage ?',
];

const ESCALATE_REASONS = [
  { value: 'Problème de dépôt non reçu', icon: 'fa-wallet', color: '#F59E0B' },
  { value: 'Problème de retrait bloqué', icon: 'fa-ban', color: '#EF4444' },
  { value: 'Transaction manquante', icon: 'fa-search-dollar', color: '#8B5CF6' },
  { value: 'Problème technique', icon: 'fa-bug', color: '#F97316' },
  { value: 'Réclamation', icon: 'fa-exclamation-triangle', color: '#EF4444' },
  { value: 'Autre', icon: 'fa-question-circle', color: '#6B7280' },
];

export default function ChatScreen() {
  const { user, setPage, addToast } = useAppStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [escalating, setEscalating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFetchIdRef = useRef<string>('0');

  const fetchMessages = useCallback(async () => {
    try {
      const res = await authFetch(`/api/chat/messages?lastId=${lastFetchIdRef.current}`);
      const data = await res.json();
      if (data.success && data.messages?.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.messages.filter((m: ChatMsg) => !existingIds.has(m.id));
          if (newMsgs.length > 0) {
            const updated = [...prev, ...newMsgs];
            lastFetchIdRef.current = newMsgs[newMsgs.length - 1].id;
            return updated;
          }
          return prev;
        });
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  const checkTicket = useCallback(async () => {
    try {
      const res = await authFetch('/api/chat/ticket');
      const data = await res.json();
      if (data.success && data.ticket) {
        setActiveTicket(data.ticket);
      } else {
        setActiveTicket(null);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    fetchMessages();
    checkTicket();
    const interval = setInterval(() => {
      fetchMessages();
      checkTicket();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages, checkTicket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleEscalate = async () => {
    const reason = escalateReason === 'Autre' ? customReason.trim() : escalateReason;
    if (!reason) {
      addToast('Veuillez sélectionner ou saisir une raison', 'error');
      return;
    }
    setEscalating(true);
    try {
      const res = await authFetch('/api/chat/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Transfert en cours vers un administrateur', 'success');
        setShowEscalateModal(false);
        setEscalateReason('');
        setCustomReason('');
        checkTicket();
        setTimeout(() => fetchMessages(), 500);
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setEscalating(false);
  };

  const handleSend = async (customText?: string) => {
    const text = (customText || input).trim();
    if (!text || sending) return;
    setInput('');

    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const userMsg: ChatMsg = {
      id: tempId,
      text,
      me: true,
      isAdmin: false,
      isAdminMsg: false,
      ticketId: activeTicket?.id || null,
      t: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);

    setSending(true);
    try {
      const res = await authFetch('/api/chat/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.escalated) {
          checkTicket();
        }
        if (data.response) {
          const aiMsg: ChatMsg = {
            id: `ai-${Date.now()}`,
            text: data.response,
            me: false,
            isAdmin: true,
            isAdminMsg: data.adminMode || false,
            ticketId: data.ticketId || activeTicket?.id || null,
            t: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages(prev => [...prev, aiMsg]);
        }
        setTimeout(() => fetchMessages(), 1000);
      } else {
        addToast(data.error || 'Erreur', 'error');
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch {
      addToast('Erreur réseau', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  if (!user) return null;

  return (
    <>
      <Header
        title={activeTicket ? "Support Admin" : "Assistant IA"}
        icon={activeTicket ? "fa-headset" : "fa-robot"}
        iconColor="#6366F1"
        leftElement={
          <button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        }
        rightElement={
          !activeTicket ? (
            <button
              onClick={() => setShowEscalateModal(true)}
              className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(20,184,166,0.12)] text-[#14B8A6] cursor-pointer border-none"
              title="Contacter un admin"
            >
              <i className="fas fa-headset text-[0.75rem]"></i>
            </button>
          ) : undefined
        }
      />
      <div className="flex-1 flex flex-col w-full overflow-hidden">
        {activeTicket && (
          <div className="bg-[#FFFFFF] px-4 py-2 flex items-center gap-2 shrink-0 border-b border-[rgba(20,184,166,0.15)]">
            <div className="w-7 h-7 rounded-full bg-[rgba(20,184,166,0.15)] flex items-center justify-center shrink-0">
              <i className="fas fa-headset text-[#14B8A6] text-[0.55rem]"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.7rem] font-bold text-[#818CF8]">Mode Administrateur</div>
              <div className="text-[0.6rem] text-[rgba(0,0,0,0.55)] truncate">Raison : {esc(activeTicket.reason)}</div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#6366F1]" style={{ animation: 'pulse 1.5s infinite' }} />
              <span className="text-[0.55rem] text-[rgba(0,0,0,0.55)] font-medium">En attente</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F8F9FA]">
          {loading && messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-[rgba(0,0,0,0.08)] border-t-[#6366F1] rounded-full mx-auto mb-3" style={{ animation: 'spin 0.7s linear infinite' }} />
              <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)]">Chargement...</p>
            </div>
          )}

          {!loading && messages.length === 0 && !activeTicket && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-robot text-[#14B8A6] text-[1.5rem]"></i>
              </div>
              <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Assistant Be Rich</h3>
              <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-5">Posez-moi une question sur la plateforme !</p>
              <div className="space-y-2 max-w-[280px] mx-auto">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => handleSend(q)} className="w-full py-2.5 px-4 rounded-xl bg-[#F3F4F6] text-[0.72rem] text-[#1F2937] font-medium border border-[rgba(0,0,0,0.08)] cursor-pointer text-left hover:bg-[rgba(99,102,241,0.1)] hover:border-[rgba(99,102,241,0.2)] transition-all">
                    <i className="fas fa-comment-dots text-[#14B8A6] mr-2 text-[0.65rem]"></i>{q}
                  </button>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.08)]">
                <button
                  onClick={() => setShowEscalateModal(true)}
                  className="py-2.5 px-5 rounded-xl bg-[rgba(20,184,166,0.12)] text-[0.72rem] text-[#14B8A6] font-semibold border border-[rgba(20,184,166,0.15)] cursor-pointer hover:bg-[rgba(20,184,166,0.18)] transition-all"
                >
                  <i className="fas fa-headset mr-1.5"></i>Parler à un administrateur
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.me ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.me ? 'order-2' : 'order-1'}`}>
                {!msg.me && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      msg.isAdminMsg
                        ? 'bg-[rgba(99,102,241,0.15)]'
                        : 'bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)]'
                    }`}>
                      <i className={`fas ${msg.isAdminMsg ? 'fa-headset text-[#6366F1]' : 'fa-robot text-[#14B8A6]'} text-[0.45rem]`}></i>
                    </div>
                    <span className="text-[0.6rem] font-semibold text-[rgba(0,0,0,0.35)]">
                      {msg.isAdminMsg ? 'Admin Be Rich' : 'Be Rich IA'}
                    </span>
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-2.5 ${
                  msg.me
                    ? 'bg-[#6366F1] text-[#050506] rounded-br-md'
                    : msg.isAdminMsg
                      ? 'bg-[rgba(99,102,241,0.15)] text-[#818CF8] border border-[rgba(99,102,241,0.2)] rounded-bl-md'
                      : 'bg-[rgba(20,184,166,0.08)] text-[#1F2937] border border-[rgba(20,184,166,0.15)] rounded-bl-md'
                }`}>
                  <p className="text-[0.78rem] leading-relaxed whitespace-pre-wrap">{esc(msg.text)}</p>
                </div>
                <div className={`text-[0.55rem] text-[rgba(0,0,0,0.25)] mt-0.5 ${msg.me ? 'text-right' : 'text-left'}`}>{msg.t}</div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="max-w-[80%]">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-full bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] flex items-center justify-center">
                    <i className="fas fa-robot text-[#14B8A6] text-[0.45rem]"></i>
                  </div>
                  <span className="text-[0.6rem] font-semibold text-[rgba(0,0,0,0.35)]">Be Rich IA</span>
                </div>
                <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" style={{ animation: 'pulse 1s infinite' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" style={{ animation: 'pulse 1s infinite 0.2s' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" style={{ animation: 'pulse 1s infinite 0.4s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {messages.length > 0 && messages.length <= 2 && !activeTicket && (
          <div className="px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0 bg-[#F8F9FA]">
            {QUICK_QUESTIONS.slice(0, 3).map((q, i) => (
              <button key={i} onClick={() => handleSend(q)} className="whitespace-nowrap py-1.5 px-3 rounded-full bg-[#F3F4F6] text-[0.65rem] text-[#1F2937] font-medium border border-[rgba(0,0,0,0.08)] cursor-pointer hover:bg-[rgba(99,102,241,0.1)] transition-all shrink-0">
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.length > 2 && !activeTicket && (
          <div className="px-4 py-1.5 shrink-0 bg-[#F8F9FA]">
            <button
              onClick={() => setShowEscalateModal(true)}
              className="w-full py-2 rounded-xl bg-[rgba(20,184,166,0.12)] text-[0.68rem] text-[#14B8A6] font-semibold border border-[rgba(20,184,166,0.15)] cursor-pointer hover:bg-[rgba(20,184,166,0.18)] transition-all flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-headset text-[0.6rem]"></i>
              Besoin d&apos;aide ? Contacter un administrateur
            </button>
          </div>
        )}

        <div className="px-3 py-2.5 bg-[#FFFFFF] border-t border-[rgba(0,0,0,0.08)] flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={activeTicket ? "Écrire à l'administrateur..." : "Posez votre question..."}
            className="flex-1 py-2.5 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] outline-none focus:border-[#6366F1] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-xl bg-[#6366F1] text-[#050506] flex items-center justify-center border-none cursor-pointer disabled:opacity-40 shrink-0 transition-transform active:scale-90"
          >
            <i className="fas fa-paper-plane text-[0.8rem]"></i>
          </button>
        </div>
      </div>

      {showEscalateModal && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.3)] backdrop-blur-sm z-[6000] flex items-end sm:items-center justify-center" onClick={() => setShowEscalateModal(false)}>
          <div
            className="bg-[#FFFFFF] rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-[420px] border border-[rgba(0,0,0,0.08)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(20,184,166,0.12)] flex items-center justify-center">
                <i className="fas fa-headset text-[#14B8A6] text-[1rem]"></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#1F2937]">Contacter un administrateur</h3>
                <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)]">Pour les problèmes complexes nécessitant un humain</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-2 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Raison du transfert</label>
              <div className="grid grid-cols-2 gap-2">
                {ESCALATE_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setEscalateReason(r.value)}
                    className={`py-2.5 px-3 rounded-xl text-[0.7rem] font-medium border cursor-pointer transition-all text-left flex items-center gap-2 ${
                      escalateReason === r.value
                        ? 'bg-[rgba(20,184,166,0.15)] border-[#14B8A6] text-[#14B8A6]'
                        : 'bg-[#F3F4F6] border-[rgba(0,0,0,0.08)] text-[#1F2937] hover:border-[rgba(20,184,166,0.3)]'
                    }`}
                  >
                    <i className={`fas ${r.icon} text-[0.6rem]`} style={{ color: r.color }}></i>
                    {r.value}
                  </button>
                ))}
              </div>
            </div>

            {escalateReason === 'Autre' && (
              <div className="mb-4">
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Décrivez votre problème..."
                  className="w-full py-2.5 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.82rem] outline-none focus:border-[#14B8A6] resize-none text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowEscalateModal(false); setEscalateReason(''); setCustomReason(''); }}
                className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95"
              >
                Annuler
              </button>
              <button
                onClick={handleEscalate}
                disabled={escalating || (!escalateReason || (escalateReason === 'Autre' && !customReason.trim()))}
                className="flex-1 py-3 rounded-xl bg-[#6366F1] text-[#050506] font-bold text-[0.82rem] cursor-pointer transition-transform active:scale-95 disabled:opacity-40 border-none"
              >
                {escalating ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                    Transfert...
                  </span>
                ) : (
                  <span><i className="fas fa-headset mr-1.5"></i>Transférer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
