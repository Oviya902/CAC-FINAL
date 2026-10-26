'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import { Search, Star, ThumbsUp, Send, BookOpen, MessageSquare, Bot, Book, Flame, Clock } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'home' | 'guidelines' | 'course' | 'school'>('home');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [courses, setCourses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [courseStats, setCourseStats] = useState<Record<string, { avgOverall: number; avgDiff: number; avgHw: number; total: number }>>({});
  
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ courses: any[]; schools: any[] }>({ courses: [], schools: [] });

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewForm, setReviewForm] = useState({
    schoolYear: '2025-2026',
    recommend: true,
    homework: 3,
    difficulty: 3,
    overall: 4,
    comment: '',
  });
  const [moderationError, setModerationError] = useState('');

  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState({ title: '', content: '' });
  const [answers, setAnswers] = useState<Record<string, any[]>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const [materials, setMaterials] = useState<any[]>([]);
  const [newMaterial, setNewMaterial] = useState({ name: '', description: '', link: '' });

  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [tutorQuery, setTutorQuery] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);

  useEffect(() => {
    async function initApp() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userProfile) {
          setProfile(userProfile);
        }
      }

      const { data: cData } = await supabase.from('courses').select('*');
      const { data: sData } = await supabase.from('schools').select('*');
      setCourses(cData || []);
      setSchools(sData || []);

      fetchAllCourseStats();
    }
    initApp();
  }, []);

  async function fetchAllCourseStats() {
    const { data: allReviews } = await supabase.from('reviews').select('course_id, overall_rating, difficulty_rating, homework_rating');
    
    if (!allReviews) return;

    const statsMap: Record<string, { totalOverall: number; totalDiff: number; totalHw: number; count: number }> = {};

    allReviews.forEach(r => {
      if (!statsMap[r.course_id]) {
        statsMap[r.course_id] = { totalOverall: 0, totalDiff: 0, totalHw: 0, count: 0 };
      }
      statsMap[r.course_id].totalOverall += Number(r.overall_rating || 0);
      statsMap[r.course_id].totalDiff += Number(r.difficulty_rating || 0);
      statsMap[r.course_id].totalHw += Number(r.homework_rating || 0);
      statsMap[r.course_id].count += 1;
    });

    const calculatedStats: Record<string, { avgOverall: number; avgDiff: number; avgHw: number; total: number }> = {};

    Object.keys(statsMap).forEach(courseId => {
      const item = statsMap[courseId];
      calculatedStats[courseId] = {
        avgOverall: Number((item.totalOverall / item.count).toFixed(1)),
        avgDiff: Number((item.totalDiff / item.count).toFixed(1)),
        avgHw: Number((item.totalHw / item.count).toFixed(1)),
        total: item.count,
      };
    });

    setCourseStats(calculatedStats);
  }

  async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data);
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults({ courses: [], schools: [] });
      return;
    }
    const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
    const filteredSchools = schools.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
    setSearchResults({ courses: filteredCourses, schools: filteredSchools });
  }

  async function openCoursePage(course: any) {
    setSelectedCourse(course);
    setView('course');
    fetchCourseData(course.id);
  }

  async function fetchCourseData(courseId: string) {
    const { data: rData } = await supabase.from('reviews').select('*, profiles(username, grade_level), schools(name)').eq('course_id', courseId);    
    const { data: qData } = await supabase.from('questions').select('*, profiles(username)').eq('course_id', courseId).order('upvotes', { ascending: false });
    const { data: mData } = await supabase.from('study_materials').select('*').eq('course_id', courseId).order('upvotes', { ascending: false });
    
    if (qData && qData.length > 0) {
      const qIds = qData.map(q => q.id);
      const { data: aData } = await supabase.from('answers').select('*, profiles(username)').in('question_id', qIds).order('created_at', { ascending: true });
      
      const answerMap: Record<string, any[]> = {};
      (aData || []).forEach(ans => {
        if (!answerMap[ans.question_id]) answerMap[ans.question_id] = [];
        answerMap[ans.question_id].push(ans);
      });
      setAnswers(answerMap);
    }

    const sortedReviews = [...(rData || [])].sort((a, b) => {
      if (selectedSchool) {
        if (a.school_id === selectedSchool.id && b.school_id !== selectedSchool.id) return -1;
        if (b.school_id === selectedSchool.id && a.school_id !== selectedSchool.id) return 1;
      } else if (profile?.school_id) {
        if (a.school_id === profile.school_id && b.school_id !== profile.school_id) return -1;
        if (b.school_id === profile.school_id && a.school_id !== profile.school_id) return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setReviews(sortedReviews);
    setQuestions(qData || []);
    setMaterials(mData || []);
    fetchAllCourseStats();
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setModerationError('');

    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    try {
      const modRes = await fetch('/api/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: reviewForm.comment }),
      });
      const modData = await modRes.json();

      if (!modData.safe) {
        setModerationError(`Review rejected by AI Moderator: ${modData.reason}`);
        return;
      }
    } catch (err) {
      console.warn("Moderation API skipped or failed:", err);
    }

    const { error } = await supabase.from('reviews').insert([{
      course_id: selectedCourse.id,
      user_id: user.id,
      school_id: profile?.school_id || null,
      school_year: reviewForm.schoolYear,
      recommend: reviewForm.recommend,
      homework_rating: reviewForm.homework,
      difficulty_rating: reviewForm.difficulty,
      overall_rating: reviewForm.overall,
      comment: reviewForm.comment,
    }]);

    if (error) {
      alert("Error submitting review: " + error.message);
      return;
    }

    setReviewForm({ schoolYear: '2025-2026', recommend: true, homework: 3, difficulty: 3, overall: 4, comment: '' });
    fetchCourseData(selectedCourse.id);
  }

  async function handleQuestionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setIsAuthOpen(true); return; }
    if (!newQuestion.title.trim()) return;

    const { error } = await supabase.from('questions').insert([{
      course_id: selectedCourse.id,
      user_id: user.id,
      title: newQuestion.title,
      content: newQuestion.content,
      upvotes: 0
    }]);

    if (error) {
      alert("Error posting question: " + error.message);
      return;
    }

    setNewQuestion({ title: '', content: '' });
    fetchCourseData(selectedCourse.id);
  }

  async function handleAnswerSubmit(e: React.FormEvent, questionId: string) {
    e.preventDefault();
    if (!user) { setIsAuthOpen(true); return; }
    const content = replyText[questionId];
    if (!content || !content.trim()) return;

    const { error } = await supabase.from('answers').insert([{
      question_id: questionId,
      user_id: user.id,
      content: content.trim()
    }]);

    if (error) {
      alert("Error submitting answer: " + error.message);
      return;
    }

    setReplyText({ ...replyText, [questionId]: '' });
    fetchCourseData(selectedCourse.id);
  }

  async function handleQuestionUpvote(qId: string, currentUpvotes: number) {
    const { error } = await supabase
      .from('questions')
      .update({ upvotes: (currentUpvotes || 0) + 1 })
      .eq('id', qId);

    if (!error) fetchCourseData(selectedCourse.id);
  }

  async function handleMaterialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setIsAuthOpen(true); return; }
    if (!newMaterial.name.trim() || !newMaterial.link.trim()) return;

    const { error } = await supabase.from('study_materials').insert([{
      course_id: selectedCourse.id,
      user_id: user.id,
      name: newMaterial.name,
      description: newMaterial.description,
      link: newMaterial.link,
      upvotes: 0
    }]);

    if (error) {
      alert("Error uploading material: " + error.message);
      return;
    }

    setNewMaterial({ name: '', description: '', link: '' });
    fetchCourseData(selectedCourse.id);
  }

  async function handleMaterialUpvote(mId: string, currentUpvotes: number) {
    const { error } = await supabase
      .from('study_materials')
      .update({ upvotes: (currentUpvotes || 0) + 1 })
      .eq('id', mId);

    if (!error) fetchCourseData(selectedCourse.id);
  }

  async function handleTutorSend(e: React.FormEvent) {
    e.preventDefault();
    if (!tutorQuery.trim()) return;

    const history = [...chatHistory, { role: 'user', text: tutorQuery }];
    setChatHistory(history);
    setTutorQuery('');
    setTutorLoading(true);

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: tutorQuery, courseTitle: selectedCourse.title }),
      });
      const data = await res.json();
      setChatHistory([...history, { role: 'bot', text: data.response || data.text || "I'm here to help with your AP course!" }]);
    } catch (err) {
      setChatHistory([...history, { role: 'bot', text: "Sorry, I couldn't connect to the AI tutor right now." }]);
    }
    setTutorLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="border-b border-slate-200 bg-white/90 sticky top-0 z-40 backdrop-blur px-6 py-3 flex justify-between items-center shadow-xs">
        <h1 onClick={() => setView('home')} className="text-xl font-bold text-blue-600 cursor-pointer">RateMyCourseAP</h1>
        
        <div className="flex gap-6 items-center text-sm font-medium">
          <button onClick={() => setView('home')} className="hover:text-blue-600 transition">Home</button>
          <button onClick={() => setView('guidelines')} className="hover:text-blue-600 transition">Guidelines</button>
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 text-blue-800 font-semibold hover:text-blue-600 focus:outline-none bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
              >
                <span>Hi, {profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'User'}</span>
                <span className="text-xs text-slate-500">▼</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  <a 
                    href="/account" 
                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 transition"
                  >
                    Edit Profile
                  </a>
                  <button 
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }} 
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthOpen(true)} 
              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-500 transition font-medium"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onAuthSuccess={checkUserSession} />

      {view === 'home' && (
        <main className="max-w-6xl mx-auto p-6 space-y-8">
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center space-y-4 shadow-sm">
            <h2 className="text-3xl font-extrabold text-slate-900">Review and Rate AP Courses on RateMyCourseAP</h2>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search AP course or High School..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-blue-50/50 rounded-xl border border-blue-200 text-slate-900 placeholder-slate-400 focus:outline-blue-500"
              />
            </div>

            {searchQuery && (
              <div className="bg-white border border-slate-200 rounded-xl text-left p-4 max-w-xl mx-auto space-y-3 shadow-md">
                {searchResults.courses.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase">Courses</span>
                    {searchResults.courses.map(c => (
                      <div key={c.id} onClick={() => openCoursePage(c)} className="p-2.5 hover:bg-blue-50 rounded-lg cursor-pointer flex justify-between items-center transition">
                        <span className="font-medium text-slate-800">{c.title}</span>
                        <span className="text-xs bg-blue-100 px-2 py-0.5 rounded text-blue-800">{c.category}</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.schools.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase">Schools</span>
                    {searchResults.schools.map(s => (
                      <div key={s.id} onClick={() => { setSelectedSchool(s); setView('school'); }} className="p-2.5 hover:bg-blue-50 rounded-lg cursor-pointer font-medium text-slate-800 transition">
                        {s.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {['Science', 'Math', 'Language Arts', 'World Language', 'Tech/Career', 'AP Capstone'].map(cat => (
            <div key={cat} className="space-y-3">
              <h3 className="text-xl font-bold border-b border-slate-200 pb-2 text-blue-800">{cat}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {courses.filter(c => c.category === cat).map(c => {
                  const stats = courseStats[c.id];
                  return (
                    <div key={c.id} onClick={() => openCoursePage(c)} className="p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium">{c.category}</span>
                        <h4 className="font-semibold text-lg text-slate-900">{c.title}</h4>
                      </div>

                      {}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-center text-xs">
                        <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                          <span className="text-amber-700 block font-semibold">★ {stats ? stats.avgOverall : 'N/A'}</span>
                          <span className="text-[10px] text-slate-500">Overall</span>
                        </div>
                        <div className="bg-red-50 p-1.5 rounded-lg border border-red-200">
                          <span className="text-red-700 block font-semibold">{stats ? stats.avgDiff : 'N/A'}</span>
                          <span className="text-[10px] text-slate-500">Diff</span>
                        </div>
                        <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-200">
                          <span className="text-blue-700 block font-semibold">{stats ? stats.avgHw : 'N/A'}</span>
                          <span className="text-[10px] text-slate-500">HW</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </main>
      )}

      {view === 'guidelines' && (
        <main className="max-w-4xl mx-auto p-6 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Community Guidelines</h2>
          <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-3 text-slate-700 shadow-sm">
            <p>1. Be constructive and honest in all course evaluations.</p>
            <p>2. Do not include personal attacks, vulgarity, or mention individual teacher names in reviews.</p>
            <p>3. AI moderation automatically evaluates reviews before publishing.</p>
          </div>
        </main>
      )}

      {view === 'school' && selectedSchool && (
        <main className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">{selectedSchool.name} Offered AP Courses</h2>
            <button onClick={() => { setSelectedSchool(null); setView('home'); }} className="text-sm text-blue-600 hover:underline">← Clear School Filter</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courses.map(c => {
              const stats = courseStats[c.id];
              return (
                <div key={c.id} onClick={() => openCoursePage(c)} className="p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md cursor-pointer transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium">{c.category}</span>
                    <h4 className="font-semibold text-lg text-slate-900">{c.title}</h4>
                  </div>
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                      <span className="text-amber-700 block font-semibold">★ {stats ? stats.avgOverall : 'N/A'}</span>
                      <span className="text-[10px] text-slate-500">Overall</span>
                    </div>
                    <div className="bg-red-50 p-1.5 rounded-lg border border-red-200">
                      <span className="text-red-700 block font-semibold">{stats ? stats.avgDiff : 'N/A'}</span>
                      <span className="text-[10px] text-slate-500">Diff</span>
                    </div>
                    <div className="bg-blue-50 p-1.5 rounded-lg border border-blue-200">
                      <span className="text-blue-700 block font-semibold">{stats ? stats.avgHw : 'N/A'}</span>
                      <span className="text-[10px] text-slate-500">HW</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {view === 'course' && selectedCourse && (
        <main className="max-w-5xl mx-auto p-6 space-y-8">
          {}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-4 shadow-sm">
            <button onClick={() => setView('home')} className="text-xs text-blue-600 hover:underline mb-1 inline-block">← Back to Courses</button>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md font-semibold">{selectedCourse.category}</span>
                <h2 className="text-3xl font-extrabold text-slate-900 mt-1">{selectedCourse.title}</h2>
              </div>

              {}
              {courseStats[selectedCourse.id] ? (
                <div className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center w-full md:w-auto">
                  <div className="px-3 border-r border-slate-200">
                    <span className="text-2xl font-black text-amber-500 block">★ {courseStats[selectedCourse.id].avgOverall}</span>
                    <span className="text-xs text-slate-500 font-medium">Overall ({courseStats[selectedCourse.id].total})</span>
                  </div>
                  <div className="px-3 border-r border-slate-200">
                    <span className="text-2xl font-black text-red-600 block">{courseStats[selectedCourse.id].avgDiff}</span>
                    <span className="text-xs text-slate-500 font-medium">Difficulty</span>
                  </div>
                  <div className="px-3">
                    <span className="text-2xl font-black text-blue-600 block">{courseStats[selectedCourse.id].avgHw}</span>
                    <span className="text-xs text-slate-500 font-medium">Homework</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-500">
                  No ratings submitted yet
                </div>
              )}
            </div>
          </div>

          {/* Student Reviews Section */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900"><Star className="w-5 h-5 text-blue-600" /> Student Reviews</h3>

            {user ? (
              <form onSubmit={handleReviewSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <h4 className="font-semibold text-slate-900">Leave a Review</h4>
                {moderationError && <p className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">{moderationError}</p>}
                
                <textarea
                  placeholder="Share workload, exam prep, and advice..."
                  value={reviewForm.comment}
                  onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="w-full p-3 bg-blue-50/50 border border-blue-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-blue-500"
                  rows={3}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <label className="text-slate-700 font-medium">Difficulty (1-5): <input type="number" min="1" max="5" value={reviewForm.difficulty} onChange={e => setReviewForm({ ...reviewForm, difficulty: +e.target.value })} className="w-16 bg-white text-center rounded-lg border border-slate-200 p-1 ml-2 text-slate-900" /></label>
                  <label className="text-slate-700 font-medium">Homework (1-5): <input type="number" min="1" max="5" value={reviewForm.homework} onChange={e => setReviewForm({ ...reviewForm, homework: +e.target.value })} className="w-16 bg-white text-center rounded-lg border border-slate-200 p-1 ml-2 text-slate-900" /></label>
                  <label className="text-slate-700 font-medium">Overall Rating: <input type="number" min="1" max="5" value={reviewForm.overall} onChange={e => setReviewForm({ ...reviewForm, overall: +e.target.value })} className="w-16 bg-white text-center rounded-lg border border-slate-200 p-1 ml-2 text-slate-900" /></label>
                </div>

                <button type="submit" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-500 transition shadow-xs">Submit Review</button>
              </form>
            ) : (
              <p className="text-slate-600 text-sm bg-white p-4 rounded-xl border border-slate-200">Please <button onClick={() => setIsAuthOpen(true)} className="text-blue-600 font-semibold underline">sign in</button> to leave a review.</p>
            )}

            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                      {review.schools?.name || 'Frisco ISD'}
                    </span>
                    {review.profiles?.grade_level && (
                      <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                        {review.profiles.grade_level}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 ml-auto font-medium">
                      By {review.profiles?.username || 'Anonymous Student'}
                    </span>
                  </div>
                  <p className="text-slate-800">{review.comment}</p>

                  <div className="flex gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <span>Overall: <strong>★ {review.overall_rating}</strong></span>
                    <span>Difficulty: <strong>{review.difficulty_rating}</strong></span>
                    <span>Homework: <strong>{review.homework_rating}</strong></span>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && <p className="text-sm text-slate-500 italic bg-white p-4 rounded-xl border border-slate-200">No reviews yet. Be the first to review this course!</p>}
            </div>
          </section>

          {/* Discussion Forum Section*/}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900"><MessageSquare className="w-5 h-5 text-blue-600" /> Discussion Forum</h3>
            
            {user && (
              <form onSubmit={handleQuestionSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                <h4 className="font-semibold text-slate-900 text-sm">Ask a Question</h4>
                <input
                  type="text"
                  placeholder="Question title..."
                  value={newQuestion.title}
                  onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })}
                  className="w-full p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-blue-500"
                  required
                />
                <textarea
                  placeholder="Provide context or details..."
                  value={newQuestion.content}
                  onChange={e => setNewQuestion({ ...newQuestion, content: e.target.value })}
                  className="w-full p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-blue-500"
                  rows={2}
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-500 transition">Post Question</button>
              </form>
            )}

            <div className="space-y-4">
              {questions.map(q => (
                <div key={q.id} className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-blue-800 text-base">{q.title}</h4>
                      <p className="text-sm text-slate-700">{q.content}</p>
                      <span className="text-xs text-slate-400 block pt-1">Asked by {q.profiles?.username || 'Student'}</span>
                    </div>
                    <button 
                      onClick={() => handleQuestionUpvote(q.id, q.upvotes)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-xs font-semibold shrink-0"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{q.upvotes || 0}</span>
                    </button>
                  </div>

                  {/* Answers List */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Replies ({answers[q.id]?.length || 0})</span>
                    
                    {answers[q.id]?.map(ans => (
                      <div key={ans.id} className="bg-slate-50 p-3 rounded-lg text-sm text-slate-800 space-y-1">
                        <p>{ans.content}</p>
                        <span className="text-xs text-slate-400 block">By {ans.profiles?.username || 'Student'}</span>
                      </div>
                    ))}

                    {/* Answer Input */}
                    {user && (
                      <form onSubmit={e => handleAnswerSubmit(e, q.id)} className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Write an answer..."
                          value={replyText[q.id] || ''}
                          onChange={e => setReplyText({ ...replyText, [q.id]: e.target.value })}
                          className="flex-1 p-2 bg-blue-50/50 border border-blue-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-blue-500"
                        />
                        <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-500 transition">Reply</button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              {questions.length === 0 && <p className="text-sm text-slate-500 italic bg-white p-4 rounded-xl border border-slate-200">No discussion questions yet.</p>}
            </div>
          </section>

          {/* Study Materials Section */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900"><BookOpen className="w-5 h-5 text-blue-600" /> Study Materials Hub</h3>

            {user && (
              <form onSubmit={handleMaterialSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                <h4 className="font-semibold text-slate-900 text-sm">Upload Study Material</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Resource Name (e.g. Unit 1 Study Guide)"
                    value={newMaterial.name}
                    onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })}
                    className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-blue-500"
                    required
                  />
                  <input
                    type="url"
                    placeholder="Link URL (https://...)"
                    value={newMaterial.link}
                    onChange={e => setNewMaterial({ ...newMaterial, link: e.target.value })}
                    className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-blue-500"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Short description..."
                  value={newMaterial.description}
                  onChange={e => setNewMaterial({ ...newMaterial, description: e.target.value })}
                  className="w-full p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-blue-500"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-500 transition">Upload Resource</button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map(m => (
                <div key={m.id} className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-xs space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-bold text-blue-800">{m.name}</h4>
                    <p className="text-sm text-slate-600">{m.description}</p>
                    <a href={m.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline font-medium inline-block pt-1">Open Resource ↗</a>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => handleMaterialUpvote(m.id, m.upvotes)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition text-xs font-semibold"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{m.upvotes || 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {materials.length === 0 && <p className="text-sm text-slate-500 italic bg-white p-4 rounded-xl border border-slate-200">No study materials shared yet.</p>}
          </section>

          {/* AI Tutor Section */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900"><Bot className="w-5 h-5 text-blue-600" /> {selectedCourse.title} AI Tutor</h3>
            <div className="h-64 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              {chatHistory.length === 0 && (
                <p className="text-slate-500 text-sm italic text-center mt-20">Ask a question about {selectedCourse.title} concepts, exam strategies, or topics!</p>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`p-3.5 rounded-xl max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-white border border-slate-200 text-slate-800 mr-auto shadow-xs'}`}>
                  {msg.text}
                </div>
              ))}
              {tutorLoading && <p className="text-slate-500 text-sm animate-pulse">Tutor is thinking...</p>}
            </div>

            <form onSubmit={handleTutorSend} className="flex gap-2">
              <input
                type="text"
                placeholder={`Ask a question on ${selectedCourse.title}...`}
                value={tutorQuery}
                onChange={e => setTutorQuery(e.target.value)}
                className="flex-1 p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-blue-500"
              />
              <button type="submit" className="bg-blue-600 text-white px-5 rounded-xl hover:bg-blue-500 transition flex items-center justify-center"><Send className="w-4 h-4" /></button>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}