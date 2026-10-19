import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserCheck, Calendar, ArrowLeftRight, Users, Bell, Clock } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import TimetablePage from './pages/TimetablePage';
import TeacherRoutinePage from './pages/TeacherRoutinePage';
import SubstitutionPage from './pages/SubstitutionPage';
import TeachersPage from './pages/TeachersPage';
import AdminPanelPage from './pages/AdminPanelPage';

export default function App() {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Faculty Routine', path: '/routine', icon: Clock },
    { label: 'Master Timetable', path: '/timetable', icon: Calendar },
    { label: 'Biometric Attendance', path: '/attendance', icon: UserCheck },
    { label: 'Auto-Substitution', path: '/substitution', icon: ArrowLeftRight },
    { label: 'Faculty Directory', path: '/teachers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-sm tracking-widest border border-slate-800 shadow-sm">
              APS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-slate-900 text-base leading-tight tracking-tight">Army Public School, LBS Marg</h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  CBSE Affiliated
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">Faculty Attendance & Substitution Allocation System</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="hidden sm:inline font-medium px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              System Live
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-56 flex-shrink-0">
          <nav className="bg-white rounded-lg border border-slate-200 p-2 space-y-0.5 shadow-xs sticky top-22">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-400" />
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
            <Route path="/routine" element={<TeacherRoutinePage />} />
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
