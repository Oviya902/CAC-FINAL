'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: any) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [grade, setGrade] = useState(10);
  const [schools, setSchools] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.from('schools').select('*').then(({ data }) => setSchools(data || []));
  }, []);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'signup') {
      const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) return setError(signUpErr.message);

      if (data.user) {
        await supabase.from('profiles').insert([{
          id: data.user.id,
          email,
          username,
          school_id: schoolId || null,
          grade_level: grade,
        }]);
        onAuthSuccess();
        onClose();
      }
    } else if (mode === 'login') {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) return setError(loginErr.message);
      onAuthSuccess();
      onClose();
    } else if (mode === 'forgot') {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email);
      if (resetErr) return setError(resetErr.message);
      setMessage('Password reset email sent!');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-blue-200 border border-blue-400 p-6 rounded-xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-white">✕</button>
        <h2 className="text-xl font-bold mb-4 capitalize">{mode}</h2>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {message && <p className="text-green-400 text-sm mb-3">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2 bg-slate-200 rounded border border-slate-100" />
          
          {mode !== 'forgot' && (
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-2 bg-slate-200 rounded border border-slate-100" />
          )}

          {mode === 'signup' && (
            <>
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required className="w-full p-2 bg-slate-200 rounded border border-slate-100" />
              <select value={schoolId} onChange={e => setSchoolId(e.target.value)} required className="w-full p-2 bg-slate-200 rounded border border-slate-100">
                <option value="">Select Frisco ISD High School</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={grade} onChange={e => setGrade(+e.target.value)} className="w-full p-2 bg-slate-200 rounded border border-slate-100">
                {[9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </>
          )}

          <button type="submit" className="w-full py-2 bg-blue-600 rounded font-semibold hover:bg-blue-500">Submit</button>
        </form>

        <div className="flex justify-between text-xs mt-4 text-blue-400">
          {mode !== 'login' && <button onClick={() => setMode('login')}>Already have an account? Sign In</button>}
          {mode !== 'signup' && <button onClick={() => setMode('signup')}>Create Account</button>}
          {mode !== 'forgot' && <button onClick={() => setMode('forgot')}>Forgot Password?</button>}
        </div>
      </div>
    </div>
  );
}