import React, { useState, useEffect } from 'react';
import { getAllTeachers } from '../services/api';
import { Search, User, BookOpen, Layers } from 'lucide-react';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getAllTeachers();
        const list = res.data?.teachers || (Array.isArray(res.data) ? res.data : []);
        setTeachers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.department.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Teaching Faculty Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Faculty designations, department affiliations, and designated Class Teacher appointments
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search faculty..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map(t => (
          <div
            key={t.id}
            className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded border border-slate-200 bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs">
                    {t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-slate-900">{t.name}</h3>
                    <p className="text-[11px] text-slate-500">{t.id} • {t.designation || 'Faculty'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {t.type}
                  </span>
                  {t.isClassTeacher && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                      ★ CT: {t.classTeacherOf}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 my-3 text-[11px]">
                <div className="flex items-center gap-2 text-slate-600">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dept: <strong className="text-slate-800">{t.department}</strong> ({t.subjects?.join(', ')})</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Classes: <strong className="text-slate-800">{t.assignedClasses?.join(', ')}</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Department Faculty</span>
              <span className="text-slate-700 font-medium">
                Active
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
