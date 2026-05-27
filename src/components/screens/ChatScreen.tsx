'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
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
  date?: string;
}

const QUICK_REPLIES = [
  { text: "Bonjour !", icon: 'fa-hand-wave' },
  { text: "J'ai un problème de dépôt", icon: 'fa-wallet' },
  { text: "Question sur mon compte", icon: 'fa-user-circle' },
  { text: "Problème de retrait", icon: 'fa-arrow-up' },
];

export default function ChatScreen() {
  const { user, setPage, addToast } = useAppStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminOnline, setAdminOnline] = useState(false);
  const [lastAdminSeen, setLastAdminSeen] = useState<string>('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFetchIdRef = useRef<string>('0');
  const inputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Connect to Socket.io
  useEffect(() => {
    if (!user) return;

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: {
        userId: user.id,
        userRole: user.role,
        userName: user.name,
      },
      query: { XTransformPort: '3003' },
    });

    socket.on('connect', () => {
      console.log('[CHAT] Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[CHAT] Socket disconnected');
    });

    // Real-time admin presence
    socket.on('admin-presence', (data: { online: boolean; adminCount: number }) => {
      setAdminOnline(data.online);
    });

    // Real-time admin message — uses real DB ID for dedup
    socket.on('admin-message', (msgData: {
      id: string;
      content: string;
      t: string;
      date: string;
      isAdmin: boolean;
    }) => {
      setMessages(prev => {
        // Dedup by ID (real DB ID)
        const existingIds = new Set(prev.map(m => m.id));
        if (existingIds.has(msgData.id)) return prev;
        // Also dedup by content+time to catch any edge cases
        const isDuplicate = prev.some(m => m.text === msgData.content && m.t === msgData.t);
        if (isDuplicate) return prev;
        const newMsg: ChatMsg = {
          id: msgData.id,
          text: msgData.content,
          me: false,
          isAdmin: true,
          isAdminMsg: true,
          ticketId: null,
          t: msgData.t,
          date: msgData.date,
        };
        const updated = [...prev, newMsg];
        setAdminOnline(true);
        setLastAdminSeen(msgData.t);
        return updated;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  // Initial message fetch (load history)
  const fetchMessages = useCallback(async () => {
    try {
      const res = await authFetch(`/api/chat/messages?lastId=${lastFetchIdRef.current}`);
      const data = await res.json();
      if (data.success && data.messages?.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          // Dedup by both ID and content+time for robustness
          const newMsgs = data.messages.filter((m: ChatMsg) => {
            if (existingIds.has(m.id)) return false;
            if (prev.some(p => p.text === m.text && p.t === m.t)) return false;
            return true;
          });
          if (newMsgs.length > 0) {
            const updated = [...prev, ...newMsgs];
            lastFetchIdRef.current = newMsgs[newMsgs.length - 1].id;
            const hasAdminMsg = newMsgs.some((m: ChatMsg) => m.isAdminMsg || m.isAdmin);
            if (hasAdminMsg) {
              setAdminOnline(true);
              const lastAdmin = [...updated].reverse().find(m => m.isAdminMsg || m.isAdmin);
              if (lastAdmin) setLastAdminSeen(lastAdmin.t);
            }
            return updated;
          }
          return prev;
        });
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  // Load initial messages on mount, then poll less frequently (backup)
  useEffect(() => {
    fetchMessages();
    // Reduced polling: every 15 seconds as backup (Socket.io handles real-time)
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (customText?: string) => {
    const text = (customText || input).trim();
    if (!text || sending) return;
    setInput('');
    setShowQuickReplies(false);

    setSending(true);
    try {
      const res = await authFetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        // Add message to local state from server response (with real DB ID)
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          if (existingIds.has(data.message.id)) return prev;
          return [...prev, data.message];
        });
        lastFetchIdRef.current = data.message.id;

        // Emit via Socket.io with real DB ID and server timestamp for admin delivery
        if (socketRef.current?.connected) {
          socketRef.current.emit('user-message', {
            id: data.message.id,
            content: text,
            userId: user?.id,
            userName: user?.name,
            t: data.message.t,
            date: data.message.date,
          });
        }
      } else if (data.success) {
        // Fallback: refetch if server didn't return message
        setTimeout(() => fetchMessages(), 300);
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setSending(false);
    inputRef.current?.focus();
  };

  if (!user) return null;

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMsg[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    if (msg.date && msg.date !== currentDate) {
      currentDate = msg.date;
      groupedMessages.push({ date: currentDate, msgs: [msg] });
    } else if (groupedMessages.length > 0) {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    } else {
      groupedMessages.push({ date: currentDate || "Aujourd'hui", msgs: [msg] });
    }
  }

  return (
    <>
      <Header
        title={
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-md">
                <i className="fas fa-headset text-white text-[0.85rem]"></i>
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${adminOnline ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`} style={adminOnline ? { animation: 'pulse 2s infinite' } : {}} />
            </div>
            <div>
              <div className="text-[0.92rem] font-black text-[#1F2937] leading-tight">Support Admin</div>
              <div className="text-[0.6rem] font-medium text-[#22C55E] leading-tight">
                {adminOnline ? `En ligne · Répond rapidement` : 'Hors ligne · Répond sous 24h'}
              </div>
            </div>
          </div>
        }
        leftElement={
          <button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.6)] backdrop-blur-sm text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        }
      />

      <div className="flex-1 flex flex-col w-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #F0FDF4 0%, #F8F9FA 15%, #F8F9FA 100%)' }}>
        {/* Chat Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-1">
          {loading && messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-10 h-10 rounded-2xl bg-[rgba(34,197,94,0.1)] flex items-center justify-center mx-auto mb-3">
                <div className="w-5 h-5 border-2 border-[rgba(34,197,94,0.2)] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
              </div>
              <p className="text-[0.75rem] text-[rgba(0,0,0,0.45)]">Chargement des messages...</p>
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10">
              {/* Welcome Card */}
              <div className="w-full max-w-[300px] bg-white rounded-2xl p-5 shadow-sm border border-[rgba(0,0,0,0.06)] text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center mx-auto mb-3 shadow-lg" style={{ boxShadow: '0 8px 24px rgba(34,197,94,0.25)' }}>
                  <i className="fas fa-comments text-white text-[1.5rem]"></i>
                </div>
                <h3 className="text-[1.05rem] font-black text-[#1F2937] mb-1">Chat Support</h3>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.5)] leading-relaxed mb-4">
                  Besoin d&apos;aide ? Écrivez-nous et notre équipe vous répondra rapidement.
                </p>
                <div className="flex items-center justify-center gap-2 text-[0.65rem] text-[rgba(0,0,0,0.4)]">
                  <i className="fas fa-shield-alt text-[#22C55E]"></i>
                  <span>Vos conversations sont sécurisées</span>
                </div>
              </div>

              {/* Quick Replies */}
              <div className="w-full max-w-[300px] space-y-2">
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(qr.text)}
                    className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-white border border-[rgba(0,0,0,0.06)] cursor-pointer transition-all hover:border-[rgba(34,197,94,0.3)] hover:shadow-sm active:scale-[0.98] text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.08)] flex items-center justify-center shrink-0">
                      <i className={`fas ${qr.icon} text-[0.7rem] text-[#22C55E]`}></i>
                    </div>
                    <span className="text-[0.78rem] font-medium text-[#1F2937]">{qr.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {groupedMessages.map((group, gi) => (
            <div key={gi}>
              {/* Date Separator */}
              {group.date && messages.length > 1 && (
                <div className="flex items-center justify-center my-3">
                  <div className="bg-white/80 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-full px-3 py-1">
                    <span className="text-[0.6rem] font-semibold text-[rgba(0,0,0,0.35)] uppercase tracking-[0.5px]">{group.date}</span>
                  </div>
                </div>
              )}

              {group.msgs.map((msg, mi) => {
                const isFirstInGroup = mi === 0 || group.msgs[mi - 1]?.me !== msg.me;
                const isLastInGroup = mi === group.msgs.length - 1 || group.msgs[mi + 1]?.me !== msg.me;

                return (
                  <div key={msg.id} className={`flex ${msg.me ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}>
                    <div className={`max-w-[78%] ${msg.me ? 'order-2' : 'order-1'}`}>
                      {/* Admin Avatar for first message */}
                      {!msg.me && isFirstInGroup && (
                        <div className="flex items-center gap-2 mb-1 ml-1">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-sm">
                            <i className="fas fa-headset text-white text-[0.4rem]"></i>
                          </div>
                          <span className="text-[0.6rem] font-bold text-[rgba(0,0,0,0.4)]">Admin Be Rich</span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`${
                        msg.me
                          ? `bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white ${isLastInGroup ? 'rounded-2xl rounded-br-md' : 'rounded-2xl'}`
                          : `bg-white border border-[rgba(0,0,0,0.06)] text-[#1F2937] ${isLastInGroup ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl'} shadow-sm`
                      } px-3.5 py-2.5`}>
                        <p className="text-[0.8rem] leading-relaxed whitespace-pre-wrap break-words">{esc(msg.text)}</p>
                      </div>

                      {/* Timestamp for last message in group */}
                      {isLastInGroup && (
                        <div className={`flex items-center gap-1 mt-0.5 ${msg.me ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
                          <span className="text-[0.5rem] text-[rgba(0,0,0,0.25)]">{msg.t}</span>
                          {msg.me && (
                            <i className="fas fa-check-double text-[0.45rem] text-[rgba(34,197,94,0.6)]"></i>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Sending indicator */}
          {sending && (
            <div className="flex justify-end mt-2">
              <div className="max-w-[78%]">
                <div className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white rounded-2xl rounded-br-md px-3.5 py-2.5 opacity-60">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-white" style={{ animation: 'pulse 0.8s infinite' }} />
                    <div className="w-1 h-1 rounded-full bg-white" style={{ animation: 'pulse 0.8s infinite 0.2s' }} />
                    <div className="w-1 h-1 rounded-full bg-white" style={{ animation: 'pulse 0.8s infinite 0.4s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Replies Bar (when there are some messages but few) */}
        {showQuickReplies && messages.length > 0 && messages.length <= 4 && (
          <div className="px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
            {QUICK_REPLIES.map((qr, i) => (
              <button
                key={i}
                onClick={() => handleSend(qr.text)}
                className="whitespace-nowrap py-2 px-3.5 rounded-full bg-white border border-[rgba(34,197,94,0.15)] text-[0.68rem] text-[#1F2937] font-medium cursor-pointer hover:bg-[rgba(34,197,94,0.06)] transition-all shrink-0 shadow-sm active:scale-95"
              >
                {qr.text}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar — Modern messaging style */}
        <div className="px-3 py-2.5 bg-white border-t border-[rgba(0,0,0,0.06)] flex items-end gap-2 shrink-0" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Écrire un message..."
              className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.06)] rounded-2xl text-[0.85rem] outline-none focus:border-[#22C55E] focus:bg-white text-gray-900 placeholder:text-[rgba(0,0,0,0.3)] transition-all"
              disabled={sending}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white flex items-center justify-center border-none cursor-pointer disabled:opacity-30 shrink-0 transition-all active:scale-90 shadow-md"
            style={{ boxShadow: input.trim() ? '0 4px 12px rgba(34,197,94,0.35)' : 'none' }}
          >
            <i className="fas fa-paper-plane text-[0.85rem]" style={{ transform: 'translateX(1px)' }}></i>
          </button>
        </div>
      </div>
    </>
  );
}
