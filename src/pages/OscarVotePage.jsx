import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Marquee from '../components/layout/Marquee.jsx';
import Header from '../components/layout/Header.jsx';
import { Banner } from '../components/games/RulesBits.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useOscar } from '../hooks/useOscar.js';
import { ballotQuestions } from '../utils/oscar.js';
import { submitVote } from '../firebase/oscar.js';
import { OSCAR_THANKS } from '../config/settings.js';

// NB: defined OUTSIDE the page component. When it was declared inside, React re-created it on every keystroke,
// the whole form (and the text fields in it) was re-mounted and you could type only one letter at a time.
function Wrap({ children }) {
  return (
    <>
      <Marquee className="bg-ink text-white" items={['OSCAR NIGHT BALLOT', 'ONE VOTE PER PARTICIPANT', 'VOTE CAREFULLY']} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <Header back />
        <Banner title="The Oscar ballot" cls="bg-sun">Choose your favourites in every category. You can send the ballot only once.</Banner>
        {children}
        <Link to="/oscar" className="btn bg-white self-start">← Back to Oscar Night</Link>
      </div>
    </>
  );
}

// One candidate: film picture and title on top, then the person (or the film) and the film they represent
function Candidate({ q, o, selected, onPick }) {
  const person = q.target === 'person';
  return (
    <label className={`border-[3px] border-ink rounded-xl overflow-hidden cursor-pointer flex flex-col shadow-b2 ${selected ? 'bg-neon ring-4 ring-ink' : 'bg-white'}`}>
      <div className="relative aspect-video bg-ink flex items-center justify-center text-white text-5xl">
        {o.cover ? <img src={o.cover} alt={o.film} className="w-full h-full object-cover" /> : '🎬'}
        <div className="absolute inset-x-0 bottom-0 bg-ink/80 text-white px-3 py-1.5 font-extrabold uppercase text-sm leading-tight truncate">{o.film}</div>
      </div>
      <div className="p-3 flex items-start gap-3">
        <input type="radio" name={q.id} className="w-5 h-5 mt-1 accent-ink shrink-0" checked={selected} onChange={onPick} />
        <span className="min-w-0">
          <span className="block text-lg font-extrabold uppercase leading-tight break-words">{o.label}</span>
          <span className="block font-mono text-xs text-mute break-words">{person ? `Represents the film: ${o.film}` : o.sub}</span>
        </span>
      </div>
    </label>
  );
}

// The ballot is built from what the crews have sent to the voting. Only the admin opens it.
export default function OscarVotePage() {
  const { profile, isAdmin, accountId, openAccount } = useApp();
  const { teams, questions, status, nameOf, hasVoted } = useOscar();
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const items = useMemo(() => ballotQuestions(questions, teams, nameOf), [questions, teams, nameOf]);
  const required = items.filter(({ q }) => q.required !== false && q.target !== 'text');
  const answered = required.filter(({ q }) => answers[q.id]).length;
  const set = (id, v) => { setAnswers((a) => ({ ...a, [id]: v })); setMsg(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (answered < required.length) return setMsg(`Please answer all required categories (${answered} of ${required.length}).`);
    const clean = {};
    Object.entries(answers).forEach(([k, v]) => { if (String(v).trim()) clean[k] = String(v).trim(); });
    setBusy(true); setMsg('');
    try { await submitVote(accountId, clean); setDone(true); }
    catch (err) { setMsg(err.message); setBusy(false); }
  };

  if (!profile && !isAdmin) return <Wrap><div className="box p-6 flex flex-col gap-3 items-start"><p className="font-medium">Sign in to vote.</p><button className="btn bg-neon" onClick={() => openAccount(null)}>Sign in / Register</button></div></Wrap>;
  if (done || (hasVoted && !isAdmin)) return (
    <Wrap><div className="box shadow-b8 p-8 bg-neon"><div className="text-5xl">🏆</div><h2 className="mt-2 text-2xl sm:text-3xl font-extrabold uppercase">{OSCAR_THANKS}</h2><p className="mt-2 font-medium">You cannot vote again.</p></div></Wrap>
  );
  if (status !== 'open' && !isAdmin) return (
    <Wrap><div className="box p-6"><p className="font-bold">{status === 'closed' ? 'The voting is closed.' : 'The voting is not open yet. The organizers will open it after the screening.'}</p></div></Wrap>
  );

  return (
    <Wrap>
      {status !== 'open' && isAdmin && <div className="border-[3px] border-ink rounded-xl bg-sun px-4 py-3 font-mono text-sm font-bold">Admin preview — the voting is {status === 'closed' ? 'closed' : 'hidden'} for participants. You cannot submit from here.</div>}
      <form onSubmit={submit} className="flex flex-col gap-6">
        {items.map(({ q, options }, i) => (
          <fieldset key={q.id} className="box overflow-hidden">
            <legend className="sr-only">{q.title}</legend>
            <div className="bg-paper border-b-[3px] border-ink px-4 py-3">
              <div className="font-mono text-xs font-bold uppercase text-mute">Category {String(i + 1).padStart(2, '0')} {q.required !== false && q.target !== 'text' ? '· required' : '· optional'}</div>
              <div className="text-xl font-extrabold uppercase">{q.title}</div>
              {q.text && <div className="text-sm font-medium">{q.text}</div>}
            </div>
            <div className={q.target === 'text' ? 'p-3' : 'p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}>
              {q.target === 'text'
                ? <textarea className="w-full border-[3px] border-ink rounded-xl px-3 py-2 font-sans text-sm" rows={3} maxLength={500} placeholder="Write here…" value={answers[q.id] || ''} onChange={(e) => set(q.id, e.target.value)} />
                : options.map((o) => <Candidate key={o.id} q={q} o={o} selected={answers[q.id] === o.id} onPick={() => set(q.id, o.id)} />)}
            </div>
          </fieldset>
        ))}
        {items.length === 0 && <div className="box p-6 font-mono text-sm">No crew has been sent to the voting yet.</div>}
        <div className="sticky bottom-2 z-10 border-[3px] border-ink rounded-xl bg-white shadow-b6 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-sm font-bold">{answered} of {required.length} required categories answered{msg && <div className="text-hot">{msg}</div>}</div>
          <div className="flex gap-3">
            <button type="button" className="btn bg-white" onClick={() => setAnswers({})}>Reset</button>
            <button type="submit" disabled={busy || status !== 'open' || items.length === 0} className="btn bg-neon disabled:opacity-50">{busy ? '…' : '🏆 Submit ballot'}</button>
          </div>
        </div>
      </form>
    </Wrap>
  );
}
