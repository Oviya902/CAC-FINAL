'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'; // or your shared client import

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
      <a href="/" className="font-bold text-xl text-blue-600">Frisco ISD AP Hub</a>
      
      {user ? (
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-slate-800 font-medium hover:text-blue-600"
          >
            <span>Hi, {user.user_metadata?.username || user.email?.split('@')[0]}</span>
            ▼
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
              <a href="/account" className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50">Edit Profile</a>
              <button 
                onClick={handleLogout} 
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500">Sign In</a>
      )}
    </nav>
  );
}