import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useOscar } from '../../hooks/useOscar.js';
import { saveOscarConfig, removeTeam } from '../../firebase/oscar.js';
import { tally, TARGETS } from '../../utils/oscar.js';
import { OSCAR_QUESTIONS } from '../../config/settings.js';

const STATUS = {
  draft: { label: 'HIDDEN', cls: 'bg-paper' },
  open: { label: 'OPEN', cls: 'bg-neon' },
  closed: { label: 'CLOSED', cls: 'bg-hot text-white' },
};

export default function OscarAdminPanel() {
  const { users, setError } = useApp();
  const { teams, config, questions, status, votes, nameOf } = useOscar();
  const [draft, setDraft] = useState(questions);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setDraft(questions); }, [questions, dirty]);

  const run = async (fn) => { try { await fn(); } catch (e) { setError(e.message); } };
  const setStatus = (s) => run(() => saveOscarConfig({ status: s, questions: dirty ? config.questions : questions }));
  const saveQuestions = () => run(async () => { await saveOscarConfig({ status, questions: draft.filter((q) => q.title.trim()) }); setDirty(false); });
  const edit = (i, patch) => { setDraft((d) => d.map((q, k) => (k === i ? { ...q, ...patch } : q))); setDirty(true); };
  const move = (i, dir) => { setDraft((d) => { const n = [...d]; const j = i + dir; if (j < 0 || j >= n.length) return d; [n[i], n[j]] = [n[j], n[i]]; return n; }); setDirty(true); };
  const add = () => { setDraft((d) => [...d, { id: `q${Date.now().toString(36)}`, title: 'New question', text: '', target: 'film', required: true }]); setDirty(true); };
  const del = (i) => { setDraft((d) => d.filter((_, k) => k !== i)); setDirty(true); };
  const reset = () => { if (confirm('Replace all questions with the defaults from settings.js?')) { setDraft(OSCAR_QUESTIONS); setDirty(true); } };
  const delTeam = (t) => { if (confirm(`Remove the crew “${t.title}”? Its members become free.`)) run(() => removeTeam(t.id)); };
  const startVoting = () => { if (confirm('Open the voting? Crews can no longer change their nominations.')) setStatus('open'); };
  const stopVoting = () => { if (confirm('Close the voting? Nobody can vote after that.')) setStatus('closed'); };

  const results = tally(questions, teams, votes, nameOf);
  const st = STATUS[status];

  return (
    <section className="box overflow-hidden">
      <div className="bg-ink text-white border-b-[3px] border-ink px-4 py-3 font-mono font-bold uppercase flex flex-wrap items-center justify-between gap-2">
        <span>🏆 Oscar Night · {teams.length} crews · {teams.filter((t) => t.nominated).length} in voting</span>
        <span className={`tag text-ink ${st.cls}`}>VOTING {st.label}</span>
      </div>

      {/* voting switch */}
      <div className="p-4 border-b-[3px] border-ink flex flex-wrap items-center gap-3">
        <button className="btn bg-neon text-xs" disabled={status === 'open'} onClick={startVoting}>▶ Open voting</button>
        <button className="btn bg-hot text-white text-xs" disabled={status !== 'open'} onClick={stopVoting}>■ Close voting</button>
        <button className="btn bg-white text-xs" disabled={status === 'draft'} onClick={() => confirm('Hide the voting again? Existing ballots stay.') && setStatus('draft')}>Hide</button>
        <span className="font-mono text-sm font-bold ml-auto">{votes.length} of {users.length} participants voted</span>
      </div>

      {/* crews */}
      <div className="p-4 border-b-[3px] border-ink">
        <h3 className="font-mono text-xs font-bold uppercase mb-2">Crews</h3>
        <div className="flex flex-col divide-y-2 divide-ink/10">
          {teams.map((t) => (
            <div key={t.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0"><b>{t.title}</b> <span className={`tag ${t.nominated ? 'bg-neon' : 'bg-paper'}`}>{t.nominated ? 'IN VOTING' : 'NOT SENT'}</span>
                <div className="font-mono text-xs text-mute">Dir: {nameOf(t.directorId)} · {(t.memberIds || []).map(nameOf).join(', ')}</div></div>
              <button className="tag bg-white" onClick={() => delTeam(t)}>REMOVE</button>
            </div>
          ))}
          {teams.length === 0 && <p className="font-mono text-sm">No crews yet.</p>}
        </div>
      </div>

      {/* questions */}
      <div className="p-4 border-b-[3px] border-ink bg-paper flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-mono text-xs font-bold uppercase">Ballot questions (edit the text and who is chosen)</h3>
          <div className="flex gap-2"><button className="tag bg-white" onClick={reset}>DEFAULTS</button><button className="tag bg-white" onClick={add}>+ ADD QUESTION</button></div>
        </div>
        {draft.map((q, i) => (
          <div key={q.id} className="border-[3px] border-ink rounded-xl bg-white p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
            <input className="input !py-2 !shadow-none md:col-span-4 !text-sm font-bold" value={q.title} onChange={(e) => edit(i, { title: e.target.value })} placeholder="Title" />
            <input className="input !py-2 !shadow-none md:col-span-4 !text-sm" value={q.text || ''} onChange={(e) => edit(i, { text: e.target.value })} placeholder="Description" />
            <select className="input !py-2 !shadow-none md:col-span-2 !text-xs" value={q.target} onChange={(e) => edit(i, { target: e.target.value })}>
              {TARGETS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <div className="md:col-span-2 flex items-center justify-between gap-2 font-mono text-xs">
              <label className="flex items-center gap-1"><input type="checkbox" className="accent-ink" checked={q.required !== false && q.target !== 'text'} disabled={q.target === 'text'} onChange={(e) => edit(i, { required: e.target.checked })} />req.</label>
              <span className="flex gap-1"><button className="tag bg-white" onClick={() => move(i, -1)}>↑</button><button className="tag bg-white" onClick={() => move(i, 1)}>↓</button><button className="tag bg-hot text-white" onClick={() => del(i)}>✕</button></span>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button className="btn bg-neon text-xs disabled:opacity-50" disabled={!dirty} onClick={saveQuestions}>Save questions</button>
          {dirty && <span className="font-mono text-xs font-bold text-hot">Unsaved changes</span>}
          <span className="font-mono text-[11px] text-mute">“Person” = crew members the crews nominated (shown with the film title); “Film” = a crew; “Free text” = a text answer.</span>
        </div>
      </div>

      {/* results */}
      <div className="p-4 flex flex-col gap-4">
        <h3 className="font-mono text-xs font-bold uppercase">Results (visible to admins only) — {votes.length} ballots</h3>
        {results.map(({ q, total, rows, texts }) => (
          <div key={q.id} className="border-[3px] border-ink rounded-xl overflow-hidden">
            <div className="bg-sun border-b-[3px] border-ink px-3 py-2 flex justify-between gap-2 font-mono text-sm font-bold uppercase"><span>{q.title}</span><span>{total} {q.target === 'text' ? 'answers' : 'votes'}</span></div>
            <div className="p-3 flex flex-col gap-2">
              {q.target === 'text'
                ? (texts.length ? texts.map((t, i) => <p key={i} className="text-sm border-l-4 border-ink pl-2">“{t}”</p>) : <p className="font-mono text-xs text-mute">No answers.</p>)
                : rows.map((r, i) => (
                  <div key={r.id}>
                    <div className="flex justify-between gap-2 text-sm"><span className="min-w-0 truncate">{i === 0 && r.count > 0 ? '🏆 ' : ''}<b>{r.label}</b> <span className="font-mono text-xs text-mute">— {r.sub}</span></span><span className="font-mono font-bold shrink-0">{r.pct}% · {r.count}</span></div>
                    <div className="h-3 border-2 border-ink rounded bg-white overflow-hidden"><div className={`h-full ${i === 0 && r.count > 0 ? 'bg-neon' : 'bg-cobalt'}`} style={{ width: `${r.pct}%` }} /></div>
                  </div>
                ))}
              {q.target !== 'text' && rows.length === 0 && <p className="font-mono text-xs text-mute">Nobody was nominated.</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
