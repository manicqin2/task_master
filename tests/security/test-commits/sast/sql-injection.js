// Test file for SAST: SQL Injection Vulnerability
// Feature: 002-gitlab-security-pipeline
// Purpose: Test Semgrep detection of SQL injection via string concatenation
// Expected: HIGH severity finding - SQL injection via string concatenation

const express = require('express');
const sqlite3 = require('sqlite3');
const app = express();
const db = new sqlite3.Database(':memory:');

// VULNERABLE: SQL injection via direct string concatenation
// Semgrep Rule: javascript.express.security.audit.express-sql-injection
app.get('/user', (req, res) => {
  const userId = req.query.id;

  // ❌ UNSAFE: User input directly concatenated into SQL query
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";

  db.get(query, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

// VULNERABLE: SQL injection with template literals
app.get('/search', (req, res) => {
  const searchTerm = req.query.q;

  // ❌ UNSAFE: Template literal with unsanitized input
  const query = `SELECT * FROM products WHERE name LIKE '%${searchTerm}%'`;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Example Attack Vectors:
// GET /user?id=' OR '1'='1
// GET /user?id=1'; DROP TABLE users; --
// GET /search?q=%'; DELETE FROM products; --

// Expected SAST Findings:
// - CWE-89: SQL Injection
// - Severity: HIGH
// - Location: Line 14, Line 26
// - Solution: Use parameterized queries or prepared statements

// SECURE Alternative (for reference):
// const query = "SELECT * FROM users WHERE id = ?";
// db.get(query, [userId], (err, row) => { ... });

app.listen(3000);
