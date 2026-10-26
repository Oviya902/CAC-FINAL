'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [password, setPassword] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadData() {
      const { data: schoolsData } = await supabase.from('schools').select('*').order('name');
      if (schoolsData) setSchools(schoolsData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, school_id, grade_level')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setUsername(profileData.username || '');
          setSchoolId(profileData.school_id || '');
          setGradeLevel(profileData.grade_level || '');
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage('Error: No authenticated user found.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        username, 
        school_id: schoolId || null, 
        grade_level: gradeLevel || null 
      })
      .eq('id', user.id);

    if (profileError) {
      setMessage('Error updating profile: ' + profileError.message);
      setLoading(false);
      return;
    }

    if (password.trim() !== '') {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        setMessage('Profile updated, but password error: ' + passwordError.message);
        setLoading(false);
        return;
      }
    }

    setMessage('Account settings updated successfully!');
    setPassword('');
    setLoading(false);
    
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

  return (
    <div className="max-w-xl mx-auto p-8 mt-12 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <a href="/" className="text-sm text-blue-600 hover:underline">← Back to Home</a>
      </div>
      
      {message && (
        <div className={`p-3 mb-4 rounded-lg text-sm ${message.includes('success') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message}
        </div>
      )}

      <form onSubmit={updateProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
          <input 
            type="email" 
            disabled 
            value={email} 
            className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-blue-500"
            placeholder="Your display name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Home School</label>
          <select 
            value={schoolId} 
            onChange={(e) => setSchoolId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-blue-500"
          >
            <option value="">Select your high school...</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level</label>
          <select 
            value={gradeLevel} 
            onChange={(e) => setGradeLevel(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-blue-500"
          >
            <option value="">Select grade level...</option>
            <option value="9th Grade">9th Grade (Freshman)</option>
            <option value="10th Grade">10th Grade (Sophomore)</option>
            <option value="11th Grade">11th Grade (Junior)</option>
            <option value="12th Grade">12th Grade (Senior)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Password (Optional)</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-900 focus:outline-blue-500"
            placeholder="Leave blank to keep current password"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}