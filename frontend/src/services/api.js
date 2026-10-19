/**
 * api.js – Centralized Axios API service for the School Attendance System.
 *
 * All API calls funnel through a single axios instance configured with
 * the base URL '/api' (which Vite proxies to http://localhost:5000/api).
 */

import axios from 'axios';

// Shared axios instance – keeps baseURL, headers, and interceptors in one place
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15-second timeout for all requests
});

// ──────────────────────────────────────────────
// Attendance endpoints
// ──────────────────────────────────────────────

/** Record a single biometric punch (check-in). */
export const punchAttendance = (data) => api.post('/attendance/punch', data);

/** Batch-sync attendance records (e.g., bulk import from biometric device). */
export const batchSync = (data) => api.post('/attendance/batch-sync', data);

/** Fetch today's attendance list for all teachers. */
export const getTodayAttendance = () => api.get('/attendance/today');

/** Mark a teacher as on-leave for a given date. */
export const markLeave = (data) => api.post('/attendance/leave', data);

/** Mark a teacher as absent for a given date. */
export const markAbsent = (data) => api.post('/attendance/absent', data);

// ──────────────────────────────────────────────
// Substitution endpoints
// ──────────────────────────────────────────────

/** Generate substitution assignments based on absent teachers. */
export const generateSubstitutions = (data) => api.post('/substitution/generate', data);

/** Fetch today's generated substitution list. */
export const getTodaySubstitutions = () => api.get('/substitution/today');

/** Override a substitution assignment (manual reassign). */
export const overrideSubstitution = (data) => api.put('/substitution/override', data);

// ──────────────────────────────────────────────
// Timetable endpoints
// ──────────────────────────────────────────────

/** Get full weekly timetable for a specific class-section (e.g., "10A"). */
export const getClassTimetable = (classSection) =>
  api.get(`/timetable/class/${classSection}`);

/** Get a specific teacher's weekly schedule by teacher ID. */
export const getTeacherSchedule = (teacherId) =>
  api.get(`/timetable/teacher/${teacherId}`);

/** Get all classes' timetable for a specific day (e.g., "Monday"). */
export const getDayTimetable = (day) => api.get(`/timetable/day/${day}`);

/** Get all teacher assignments for a specific period on a specific day. */
export const getPeriodTimetable = (day, period) => api.get(`/timetable/period/${day}/${period}`);

// ──────────────────────────────────────────────
// Teacher endpoints
// ──────────────────────────────────────────────

/** Fetch list of all teachers with their basic info. */
export const getAllTeachers = () => api.get('/teachers');

/** Add a new teacher */
export const createTeacher = (data) => api.post('/teachers', data);

/** Fetch a teacher's substitution workload for the current week. */
export const getTeacherWorkload = (teacherId) =>
  api.get(`/teachers/${teacherId}/workload`);

export default api;
