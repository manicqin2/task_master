// Test file for Secret Detection: Database Password
// This file contains hardcoded database credentials
// Expected: Pipeline should FAIL with high/critical severity finding

const mysql = require('mysql2');

// SECURITY ISSUE: Hardcoded database credentials
const DB_CONFIG = {
  host: 'production-db.example.com',
  user: 'admin',
  password: 'SuperSecret123!AdminPassword',  // Hardcoded password
  database: 'production_db',
  port: 3306
};

// Alternative hardcoded credentials
const BACKUP_DB_PASSWORD = "backup_P@ssw0rd_2024";

// Create database connection with hardcoded credentials
function createDatabaseConnection() {
  const connection = mysql.createConnection(DB_CONFIG);

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      return;
    }
    console.log('Connected to production database');
  });

  return connection;
}

// Hardcoded API key for external service
const API_KEY = "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz";

async function fetchUserData(userId) {
  const db = createDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId],
      (error, results) => {
        if (error) reject(error);
        else resolve(results[0]);
      }
    );
  });
}

module.exports = { createDatabaseConnection, fetchUserData };
