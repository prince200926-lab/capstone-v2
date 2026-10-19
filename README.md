# 🏫 School Teacher Attendance & Automated Substitution Allocation System (Capstone v2)

[![Node.js](https://img.shields.io/badge/Node.js-v24+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18-blue.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-v4.18-lightgrey.svg)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent, full-stack school administrative platform designed to eliminate chaotic morning substitution scrambles. It integrates real-time biometric RFID/fingerprint punch ingestion with a 3-tier priority substitution allocation engine.

---

## 🌟 Key Features

- **Biometric Punch Ingestion:** Ingests live RFID / fingerprint punches from entrance gate devices via REST API.
- **Strict 8-Period Day Model:** 8 periods daily, 6 days a week (Mon–Sat) across **15 classrooms** (Classes 8A through 12C).
- **Realistic Curriculum & Stream Realism:**
  - **Classes 11 & 12:** PCM (Sections A & B) and PCB (Section C) with double laboratory blocks and synchronized Optionals (CS/PE/Economics).
  - **Classes 8, 9, 10:** Core general curriculum + Coding in lab, Third Language (Sanskrit), and Foreign Language (French).
  - **Verified Anti-Collision Grid:** 0 double-booked teacher conflicts across all 720 weekly period slots.
- **3-Tier Priority Substitution Engine:**
  - **Priority 1 (Classes 10 & 12 - Board Exam Urgency):** Top priority for syllabus completion. Assigned exclusively to exact subject specialists (or allied science/math).
  - **Priority 2 (Classes 9 & 11):** Senior curriculum matching; yields to P1 in any teacher conflict.
  - **Priority 3 (Class 8):** Subject preference with balanced workload rotation among all available faculty.
  - **Double-Period Continuity:** Automatically pairs consecutive periods under a single substitute to avoid mid-block disruptions.
- **Password-Protected Administrative Console (`/admin`):**
  - Interactive multi-select checklist to simulate morning biometric gate rushes.
  - Manual check-in overrides and leave status logs.
  - New faculty enrollment with department, designation, and class assignments.
- **Print-Optimized Substitution Circular:** One-click generation of the official daily morning notice formatted for school display.
- **Audit Logging:** Every candidate considered, their scores, and selection rationales are recorded in daily logs (`logs/app-*.log` and `logs/substitution-audit-*.log`).

---

## 📐 Architecture & Tech Stack

```
school-attendance-substitution/
├── backend/
│   ├── data/                 # Master seed data (teachers.json, timetable.json, attendance.json)
│   ├── engine/               # Priority allocation algorithm & workload balancer
│   ├── logs/                 # Daily application logs & audit trails
│   ├── routes/               # Attendance, substitution, timetable, & teacher REST routes
│   ├── server.js             # Express API entry point (Port 5000)
│   └── postman/              # Pre-configured collection for presentation simulations
└── frontend/
    ├── src/
    │   ├── components/       # Biometric feed, period block, circular, status badge
    │   ├── pages/            # Dashboard, Attendance, Timetable, Substitution, Teachers, Admin
    │   └── services/         # Axios API client
    ├── index.html
    └── vite.config.js        # Vite dev server with /api proxy (Port 3000)
```

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, React Router DOM
- **Backend:** Node.js, Express, Morgan, CORS, UUID
- **Storage:** JSON data persistence with daily automated logger

---

## 🚀 Quick Start & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/prince200926-lab/capstone-v2.git
cd capstone-v2
```

### 2. Backend Setup
```bash
cd backend
npm install
node server.js
# Backend runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev -- --port 3000
# Frontend runs on http://localhost:3000
```

---

## 🎬 Evaluation / Presentation Demo Guide

1. Open **`http://localhost:3000/`** to view the live dashboard and faculty status.
2. Navigate to the hidden Admin Console at **`http://localhost:3000/admin`** and enter the passcode (`admin123`).
3. Under **Custom Batch Punch**, click *"Preset: Leave T001 & T011 Absent"* and press *"Send Batch Punches"*.
4. Switch to **Biometric Attendance** (`/attendance`) — notice that 29 faculty members turn green (`PRESENT`), while Dr. Sharma (Physics) and Mr. Kumar (Maths) are flagged red (`ABSENT`).
5. Open **Auto-Substitution** (`/substitution`) and click **"Run Engine"**:
   - Point out **Class 12A (Priority 1):** The engine assigns Ms. Neha Rawat (the other senior Physics teacher) to keep Board preparation on track.
   - Point out **Class 10A (Priority 1):** Mathematics faculty is allocated with zero schedule collisions.
6. Click **"Printable Circular"** to preview the official morning circular ready for distribution.

---

## 📄 License
This project is open-source under the MIT License.
