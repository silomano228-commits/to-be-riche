'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

export default function TradingScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [duration, setDuration] = useState(60);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadTrades = useCallback(async () => {
    try {
      const res = await authFetch('/api/trade/active');
      const data = await res.json();
      if (data.success) setActiveTrades(data.trades || []);
    } catch { /* */ }
  }, []);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  // Auto-resolve finished trades
  useEffect(() => {
    activeTrades.forEach((trade) => {
      if (new Date(trade.endsAt).getTime() <= now && !trade.resolved) {
        authFetch('/api/trade/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId: trade.id }) })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              addToast(data.result === 'win' ? `Gagné ! +${formatMoney(data.profit)}` : data.result === 'lose' ? 'Perdu !' : 'Match nul', data.result === 'win' ? 'success' : data.result === 'lose' ? 'error' : 'info');
              loadTrades();
              fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.success) setUser(d.user); });
            }
          })
          .catch(() => { /* */ });
      }
    });
  }, [now, activeTrades]);

  const handleCreateTrade = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1 || amt > 5) { addToast('Montant: 1-5 $', 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/trade/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, direction, durationSec: duration }) });
      const data = await res.json();
      if (data.success) { addToast('Trade lancé !', 'success'); setAmount(''); loadTrades(); fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.success) setUser(d.user); }); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  if (!user) return null;
  const durations = [{ sec: 60, label: '1 min' }, { sec: 180, label: '3 min' }, { sec: 300, label: '5 min' }, { sec: 600, label: '10 min' }];

  return (
    <>
      <Header title="Ultra Market" icon="fa-bolt" iconColor="#3B82F6" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Balance */}
        <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] text-white rounded-2xl p-4 mb-4 border border-[rgba(59,130,246,0.15)]">
          <div className="text-[0.7rem] opacity-40 uppercase tracking-[1.5px] mb-1">Compte de Trading</div>
          <div className="text-[1.5rem] font-black text-[#93C5FD]">{formatMoney(user.tradeBalance)}</div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="text-[0.72rem] text-[#93C5FD] font-semibold mt-1"><i className="fas fa-plus mr-1"></i>Verser des fonds</button>
        </div>

        {/* Trade Form */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <h4 className="text-[0.82rem] font-bold text-[#1A2332] mb-3">Nouveau trade</h4>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant (1-5 $)" className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-3 focus:border-[#3B82F6]" />
          
          {/* Direction */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => setDirection('up')} className={`py-3 rounded-xl font-semibold text-[0.85rem] border-none cursor-pointer transition-transform active:scale-95 ${direction === 'up' ? 'bg-gradient-to-r from-[#00E676] to-[#00C853] text-white shadow-[0_4px_20px_rgba(0,200,83,0.2)]' : 'bg-[#F1F5F9] text-[#64748B]'}`}><i className="fas fa-arrow-up mr-1"></i>HAUT ↑</button>
            <button onClick={() => setDirection('down')} className={`py-3 rounded-xl font-semibold text-[0.85rem] border-none cursor-pointer transition-transform active:scale-95 ${direction === 'down' ? 'bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white shadow-[0_4px_20px_rgba(239,68,68,0.2)]' : 'bg-[#F1F5F9] text-[#64748B]'}`}><i className="fas fa-arrow-down mr-1"></i>BAS ↓</button>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {durations.map((d) => (
              <button key={d.sec} onClick={() => setDuration(d.sec)} className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer ${duration === d.sec ? 'bg-[#3B82F6] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{d.label}</button>
            ))}
          </div>

          <div className="text-[0.65rem] text-[#94A3B8] mb-3 text-center">Gain max: +85% | Perte max: -100% | Équilibre = remboursement</div>

          <button onClick={handleCreateTrade} disabled={creating} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-semibold text-[0.88rem] border-none cursor-pointer disabled:opacity-60 shadow-[0_4px_20px_rgba(59,130,246,0.2)]"><i className="fas fa-bolt mr-2"></i>{creating ? 'Chargement...' : 'Lancer le trade'}</button>
        </div>

        {/* Active Trades */}
        {activeTrades.filter(t => !t.resolved).length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Trades en cours</h3>
            {activeTrades.filter(t => !t.resolved).map((trade) => {
              const remaining = new Date(trade.endsAt).getTime() - now;
              const mins = Math.max(0, Math.floor(remaining / 60000));
              const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));
              return (
                <div key={trade.id} className="bg-[#1E293B] text-white rounded-xl p-4 mb-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.direction === 'up' ? 'bg-[rgba(0,200,83,0.2)]' : 'bg-[rgba(239,68,68,0.2)]'}`}><i className={`fas fa-arrow-${trade.direction}`} style={{ color: trade.direction === 'up' ? '#00E676' : '#EF4444' }}></i></div><div><div className="text-[0.8rem] font-bold">{trade.direction === 'up' ? 'HAUT' : 'BAS'}</div><div className="text-[0.65rem] text-[rgba(255,255,255,0.5)]">{formatMoney(trade.amount)}</div></div></div>
                    <div className="text-right"><div className="text-[0.7rem] text-[rgba(255,255,255,0.5)]">Temps restant</div><div className="text-[1.1rem] font-mono font-bold">{mins}:{secs.toString().padStart(2, '0')}</div></div>
                  </div>
                  {/* Fake chart line */}
                  <div className="h-[40px] relative overflow-hidden rounded-lg bg-[rgba(255,255,255,0.05)]">
                    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${trade.direction === 'up' ? '#00E676' : '#EF4444'}33, ${trade.direction === 'up' ? '#00E676' : '#EF4444'})` }}></div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* No active trades info */}
        {activeTrades.filter(t => !t.resolved).length === 0 && (
          <div className="text-center py-4"><i className="fas fa-chart-area text-[2rem] text-[#CBD5E1] mb-2"></i><p className="text-[0.82rem] text-[#94A3B8]">Aucun trade actif. Lancez-en un !</p></div>
        )}
      </div>
    </>
  );
}
