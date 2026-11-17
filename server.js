const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection (Coolify injects DATABASE_URL automatically when linked)
let pool = null;
let useMemoryFallback = false;

// Mock data fallback so the app works immediately even before DB is wired up
let memoryStudents = [
  { id: 1, student_code: 'SV2026001', full_name: 'Nguyễn Minh Khôi', email: 'khoi.nm@studyspace.edu.vn', class_name: 'Class XII Section B', gpa: 3.85, status: 'Good' },
  { id: 2, student_code: 'SV2026002', full_name: 'Trần Thảo Vy', email: 'vy.tt@studyspace.edu.vn', class_name: 'Class XII Section B', gpa: 3.92, status: 'Good' },
  { id: 3, student_code: 'SV2026003', full_name: 'Lê Hoàng Nam', email: 'nam.lh@studyspace.edu.vn', class_name: 'Class XI Section A', gpa: 2.75, status: 'Average' },
  { id: 4, student_code: 'SV2026004', full_name: 'Phạm Gia Hân', email: 'han.pg@studyspace.edu.vn', class_name: 'Class XII Section B', gpa: 3.60, status: 'Good' },
  { id: 5, student_code: 'SV2026005', full_name: 'Đỗ Quốc Bảo', email: 'bao.dq@studyspace.edu.vn', class_name: 'Class X Section C', gpa: 1.95, status: 'Poor' }
];

async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL not found. Running in In-Memory Demo Mode.');
    useMemoryFallback = true;
    return;
  }
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_code VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        class_name VARCHAR(50) NOT NULL,
        gpa NUMERIC(3,2) DEFAULT 3.00,
        status VARCHAR(20) DEFAULT 'Good',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const { rows } = await pool.query('SELECT COUNT(*) FROM students');
    if (parseInt(rows[0].count) === 0) {
      for (const s of memoryStudents) {
        await pool.query(
          'INSERT INTO students (student_code, full_name, email, class_name, gpa, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [s.student_code, s.full_name, s.email, s.class_name, s.gpa, s.status]
        );
      }
    }
    console.log('✅ Connected to PostgreSQL database on Coolify!');
  } catch (err) {
    console.error('❌ Database connection error, switching to memory mode:', err.message);
    useMemoryFallback = true;
  }
}

// API Health & Environment Check (Great for Cloud PaaS Demo!)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Coolify Open-Source PaaS',
    database: useMemoryFallback ? 'In-Memory Fallback' : 'PostgreSQL Connected',
    container_hostname: require('os').hostname(),
    timestamp: new Date().toISOString()
  });
});

// Get Dashboard Stats
app.get('/api/stats', async (req, res) => {
  try {
    let students = memoryStudents;
    if (!useMemoryFallback) {
      const result = await pool.query('SELECT * FROM students ORDER BY id DESC');
      students = result.rows;
    }
    const goodCount = students.filter(s => s.status === 'Good').length;
    const avgCount = students.filter(s => s.status === 'Average').length;
    const poorCount = students.filter(s => s.status === 'Poor').length;

    res.json({
      totalStudents: 9120 + students.length,
      totalTeachers: 80,
      performance: {
        good: 5500 + goodCount,
        average: 4200 + avgCount,
        poor: 90 + poorCount
      },
      recentStudents: students
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD Students
app.get('/api/students', async (req, res) => {
  try {
    if (useMemoryFallback) return res.json(memoryStudents);
    const result = await pool.query('SELECT * FROM students ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  const { student_code, full_name, email, class_name, gpa } = req.body;
  const numGpa = parseFloat(gpa) || 3.0;
  const status = numGpa >= 3.2 ? 'Good' : (numGpa >= 2.2 ? 'Average' : 'Poor');

  try {
    if (useMemoryFallback) {
      const newStudent = {
        id: Date.now(),
        student_code,
        full_name,
        email,
        class_name,
        gpa: numGpa,
        status
      };
      memoryStudents.unshift(newStudent);
      return res.status(201).json(newStudent);
    }
    const result = await pool.query(
      'INSERT INTO students (student_code, full_name, email, class_name, gpa, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [student_code, full_name, email, class_name, numGpa, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (useMemoryFallback) {
      memoryStudents = memoryStudents.filter(s => String(s.id) !== String(id));
      return res.json({ deleted: true });
    }
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StudySpace Cloud Student Management running on port ${PORT}`);
  });
});
