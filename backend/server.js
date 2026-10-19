const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { logMiddleware, log } = require('./middleware/logger');
const attendanceRoutes = require('./routes/attendanceRoutes');
const substitutionRoutes = require('./routes/substitutionRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const teacherRoutes = require('./routes/teacherRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure logs and data directories exist
const logsDir = path.join(__dirname, 'logs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Core middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));
app.use(logMiddleware);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'School Attendance & Substitution Engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount Routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/substitution', substitutionRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/teachers', teacherRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  log('ERROR', `Unhandled Exception: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  const msg = `🚀 Server active on http://localhost:${PORT}`;
  console.log(msg);
  log('INFO', msg);
});
