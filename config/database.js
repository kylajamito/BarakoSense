const mysql = require('mysql2');

// Create connection pool for better performance
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',           // Change if your MySQL username is different
  password: '',           // ADD YOUR MYSQL PASSWORD HERE
  database: 'barakosense_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }
  console.log('✅ Successfully connected to MySQL database!');
  connection.release();
});

// Export promise-based pool
module.exports = pool.promise();