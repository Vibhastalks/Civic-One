require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// Express
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// use files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL Connection 
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});


pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to PostgreSQL');
  release();
});



// 1. GET Stats 
app.get('/api/stats', async (req, res) => {
  try {
    const totalResult = await pool.query('SELECT COUNT(*) FROM issues');
    const resolvedResult = await pool.query("SELECT COUNT(*) FROM issues WHERE status = 'Resolved'");
    
    const total = parseInt(totalResult.rows[0].count);
    const resolved = parseInt(resolvedResult.rows[0].count);
    const pending = total - resolved;

    res.json({ total, resolved, pending });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error while fetching stats' });
  }
});

// POST a New Issue
app.post('/api/report', async (req, res) => {
  const { category, description } = req.body;
  try {
    const newIssue = await pool.query(
      'INSERT INTO issues (category, description, status) VALUES ($1, $2, $3) RETURNING *',
      [category, description, 'Pending']
    );
    res.status(201).json(newIssue.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error while reporting issue' });
  }
});

// GET Issues by Category (For the count numbers on cards)
app.get('/api/category-counts', async (req, res) => {
  try {
    const result = await pool.query('SELECT category, COUNT(*) FROM issues GROUP BY category');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error while fetching category counts' });
  }
});

// Route for the main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CivicOne Server running at http://localhost:${PORT}`);
});
// om added