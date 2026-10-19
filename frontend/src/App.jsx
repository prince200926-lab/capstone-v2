import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserCheck, Calendar, ArrowLeftRight, Users, Bell } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import TimetablePage from './pages/TimetablePage';
import SubstitutionPage from './pages/SubstitutionPage';
import TeachersPage from './pages/TeachersPage';
import AdminPanelPage from './pages/AdminPanelPage';

export default function App() {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Biometric Attendance', path: '/attendance', icon: UserCheck },
    { label: 'Master Timetable', path: '/timetable', icon: Calendar },
    { label: 'Auto-Substitution', path: '/substitution', icon: ArrowLeftRight },
    { label: 'Faculty Directory', path: '/teachers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
              S
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-tight">Delhi Public Senior Secondary School</h1>
              <p className="text-[11px] text-slate-500 font-medium">Biometric Attendance & Auto-Substitution Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="hidden sm:inline font-mono px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              API Online
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-1 shadow-sm sticky top-24">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/substitution" element={<SubstitutionPage />} />
            <Route path="/teachers" element={<TeachersPage />} />
            <Route path="/admin" element={<AdminPanelPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
