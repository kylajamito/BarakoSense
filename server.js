const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const db = require('./config/database');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'html'))); // Serve HTML files (includes admin folder inside)
app.use('/uploads', express.static('uploads')); // Serve uploaded images
app.use('/script', express.static('script')); // Serve JavaScript files

// Default route - redirect to index
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png) are allowed!'));
    }
  }
});

// ==================== API ROUTES ====================

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date() });
});

// ==================== ADMIN AUTHENTICATION ====================

// Simple admin login (you should use proper password hashing in production)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // TEMPORARY: Hardcoded credentials (replace with database check)
    if (username === 'admin' && password === 'admin123') {
      res.json({
        success: true,
        message: 'Login successful!',
        token: 'admin-token-' + Date.now() // Simple token (use JWT in production)
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ANALYTICS ROUTES ====================

// Get analytics summary
app.get('/api/analytics/summary', async (req, res) => {
  try {
    // Total predictions
    const [totalPredictions] = await db.query('SELECT COUNT(*) as count FROM results');
    
    // Predictions by day (last 7 days)
    const [predictionsByDay] = await db.query(`
      SELECT DATE(date_predicted) as date, COUNT(*) as count
      FROM results
      WHERE date_predicted >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(date_predicted)
      ORDER BY date
    `);
    
    // Prediction results breakdown
    const [resultsBreakdown] = await db.query(`
      SELECT final_result, COUNT(*) as count
      FROM results
      GROUP BY final_result
    `);
    
    res.json({
      success: true,
      data: {
        totalPredictions: totalPredictions[0].count,
        predictionsByDay,
        resultsBreakdown
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get common sensory notes (most frequent lexicon categories)
app.get('/api/analytics/sensory-notes', async (req, res) => {
  try {
    const [notes] = await db.query(`
      SELECT category, COUNT(*) as count
      FROM lexicon
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `);
    
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Sensory notes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HISTORY ROUTES ====================

// Get history by type (leaves, bark, cherries)
app.get('/api/history/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let imageColumn, predictionColumn, confidenceColumn;
    
    switch(type) {
      case 'leaves':
        imageColumn = 'leaf_image';
        predictionColumn = 'leaf_prediction';
        confidenceColumn = 'leaf_confidence';
        break;
      case 'bark':
        imageColumn = 'bark_image';
        predictionColumn = 'bark_prediction';
        confidenceColumn = 'bark_confidence';
        break;
      case 'cherries':
        imageColumn = 'cherry_image';
        predictionColumn = 'cherry_prediction';
        confidenceColumn = 'cherry_confidence';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid type' });
    }
    
    const [rows] = await db.query(`
      SELECT 
        u.${imageColumn} as image,
        r.${predictionColumn} as prediction,
        r.${confidenceColumn} as confidence,
        r.date_predicted
      FROM results r
      JOIN uploads u ON r.upload_id = u.upload_id
      WHERE u.${imageColumn} IS NOT NULL
      ORDER BY r.date_predicted DESC
    `);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== UPLOAD ROUTES ====================
app.post('/api/upload', upload.fields([
  { name: 'leaf_image', maxCount: 1 },
  { name: 'bark_image', maxCount: 1 },
  { name: 'cherry_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const leafImage = req.files['leaf_image'] ? req.files['leaf_image'][0].filename : null;
    const barkImage = req.files['bark_image'] ? req.files['bark_image'][0].filename : null;
    const cherryImage = req.files['cherry_image'] ? req.files['cherry_image'][0].filename : null;

    const [result] = await db.query(
      'INSERT INTO uploads (leaf_image, bark_image, cherry_image) VALUES (?, ?, ?)',
      [leafImage, barkImage, cherryImage]
    );

    res.json({
      success: true,
      upload_id: result.insertId,
      message: 'Images uploaded successfully!'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save prediction results
app.post('/api/results', async (req, res) => {
  try {
    const {
      upload_id,
      leaf_prediction,
      leaf_confidence,
      bark_prediction,
      bark_confidence,
      cherry_prediction,
      cherry_confidence,
      final_result,
      final_confidence
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO results 
       (upload_id, leaf_prediction, leaf_confidence, bark_prediction, bark_confidence, 
        cherry_prediction, cherry_confidence, final_result, final_confidence) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [upload_id, leaf_prediction, leaf_confidence, bark_prediction, bark_confidence,
       cherry_prediction, cherry_confidence, final_result, final_confidence]
    );

    res.json({
      success: true,
      result_id: result.insertId,
      message: 'Prediction results saved successfully!'
    });
  } catch (error) {
    console.error('Save result error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all results with upload information
app.get('/api/results', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, u.leaf_image, u.bark_image, u.cherry_image, u.date_uploaded
      FROM results r
      JOIN uploads u ON r.upload_id = u.upload_id
      ORDER BY r.date_predicted DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific result by ID
app.get('/api/results/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, u.leaf_image, u.bark_image, u.cherry_image, u.date_uploaded
      FROM results r
      JOIN uploads u ON r.upload_id = u.upload_id
      WHERE r.result_id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== LEXICON ROUTES ====================

// Get all lexicon entries
app.get('/api/lexicon', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM lexicon';
    let params = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, descriptor';
    
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get lexicon error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add lexicon entry
app.post('/api/lexicon', async (req, res) => {
  try {
    const { descriptor, category, definition, intensity } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO lexicon (descriptor, category, definition, intensity) VALUES (?, ?, ?, ?)',
      [descriptor, category, definition, intensity]
    );

    res.json({
      success: true,
      id: result.insertId,
      message: 'Lexicon entry added successfully!'
    });
  } catch (error) {
    console.error('Add lexicon error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lexicon entry
app.put('/api/lexicon/:id', async (req, res) => {
  try {
    const { descriptor, category, definition, intensity } = req.body;
    
    const [result] = await db.query(
      'UPDATE lexicon SET descriptor = ?, category = ?, definition = ?, intensity = ? WHERE id = ?',
      [descriptor, category, definition, intensity, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Lexicon entry not found' });
    }

    res.json({ success: true, message: 'Lexicon entry updated successfully!' });
  } catch (error) {
    console.error('Update lexicon error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete lexicon entry
app.delete('/api/lexicon/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM lexicon WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Lexicon entry not found' });
    }

    res.json({ success: true, message: 'Lexicon entry deleted successfully!' });
  } catch (error) {
    console.error('Delete lexicon error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📁 Serving HTML files from: ${path.join(__dirname, 'html')}`);
  console.log(`🌐 Access your app at: http://localhost:${PORT}/index.html`);
});