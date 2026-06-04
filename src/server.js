const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Support BigInt serialization for PostgreSQL bigint IDs
BigInt.prototype.toJSON = function() {
  return Number(this);
};

const authRoutes = require('./routes/authRoutes');
const crudRoutes = require('./routes/crudRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Apply Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static files for the premium frontend UI
app.use(express.static(path.join(__dirname, 'public')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedule', schedulerRoutes);
app.use('/api', crudRoutes); // Entity CRUD and Uploads

// Fallback to index.html for SPA frontend routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Node.js Exam Scheduling Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
