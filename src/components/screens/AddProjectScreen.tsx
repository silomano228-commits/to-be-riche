'use client';

import { useState } from 'react';
import { useAppStore, type Project } from '@/lib/store';
import { Header } from '@/components/shared';

export default function AddProjectScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [loading, setLoading] = useState(false);

  if (!user) return null;
  const isUnlocked = user.hasInvested;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const name = (fd.get('name') as string)?.trim();
    const amount = fd.get('amount') as string;
    const desc = (fd.get('description') as string)?.trim();
    if (!name || !amount || !desc) { addToast('Remplissez tout', 'error'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/projects/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, amount: parseFloat(amount), description: desc }) });
      const data = await res.json();
      if (data.success) {
        (e.target as HTMLFormElement).reset();
        const newProj: Project = { id: data.project_id, name, amount: parseFloat(amount), receivedAmount: 0, description: desc, status: 'active' };
        setUser({ ...user, project: newProj });
        addToast('Projet soumis !', 'success');
        setPage('wallet');
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setLoading(false);
  };

  return (
    <>
      <Header title="Nouveau Projet" rightElement={<button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-times"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full">
        {!isUnlocked ? (
          <div className="text-center py-12 px-5">
            <div className="w-[72px] h-[72px] rounded-[20px] bg-[rgba(255,255,255,0.03)] mx-auto mb-5 flex items-center justify-center text-[1.6rem] text-[#CBD5E1] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"><i className="fas fa-lock"></i></div>
            <h3 className="mb-2 font-extrabold">Verrouillé</h3>
            <p className="text-[#64748B] mb-6 leading-relaxed text-[0.82rem]">Investissez minimum <strong>10 $</strong> pour débloquer.</p>
            <button className="bg-gradient-to-r from-[#00E676] to-[#00C853] text-white max-w-[220px] mx-auto w-full py-3.5 rounded-xl border-none cursor-pointer font-semibold text-[0.88rem] font-[Inter] shadow-[0_4px_20px_rgba(0,200,83,0.2)] transition-transform active:scale-[0.97] flex items-center justify-center gap-2" onClick={() => setPage('invest')}><i className="fas fa-rocket"></i> Investir</button>
          </div>
        ) : (
          <>
            <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#F0FDF4] border-l-[3px] border-[#00C853]">
              <i className="fas fa-check-circle text-[#166534] mt-0.5 shrink-0 text-[0.9rem]"></i>
              <div><h4 className="text-[0.82rem] mb-0.5 font-bold text-[#166534]">Débloqué</h4><p className="text-[0.78rem] leading-relaxed text-[#15803D]">Vous pouvez soumettre un projet.</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Nom du projet</label>
                <input name="name" type="text" required placeholder="Ex: Mon projet" className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#00C853]" />
              </div>
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Montant ($)</label>
                <input name="amount" type="number" required placeholder="5000" min={100} className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#00C853]" />
              </div>
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Description</label>
                <textarea name="description" required rows={3} placeholder="Décrivez..." className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#00C853] resize-y" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.2)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-paper-plane"></i> Soumettre</>}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
