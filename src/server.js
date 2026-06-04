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

// Response formatter middleware: enforces { success, code, message, data } format
app.use((req, res, next) => {
  const originalJson = res.json;

  res.json = function(body) {
    // If it's already fully formatted as our 4-key JSON envelope, pass it through directly
    if (body && typeof body === 'object' && 'success' in body && 'code' in body && 'message' in body && 'data' in body) {
      return originalJson.call(this, body);
    }

    const success = res.statusCode >= 200 && res.statusCode < 300;
    let message = success ? 'Request completed successfully' : 'An error occurred';
    let dataPayload = null;

    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object') {
        // Extract message or error message
        if (body.message) {
          message = body.message;
        } else if (body.error) {
          message = body.error;
        }

        // Determine the data payload
        if (Array.isArray(body)) {
          dataPayload = body;
        } else {
          // It's a non-null object. Let's see if it has other properties besides 'message' and 'error'.
          const keys = Object.keys(body);
          const hasOtherKeys = keys.some(k => k !== 'message' && k !== 'error');
          if (hasOtherKeys) {
            const temp = { ...body };
            delete temp.message;
            delete temp.error;
            dataPayload = temp;
          } else {
            dataPayload = null;
          }
        }
      } else {
        dataPayload = body;
      }
    }

    const formattedResponse = {
      success,
      code: res.statusCode,
      message,
      data: dataPayload
    };

    return originalJson.call(this, formattedResponse);
  };

  next();
});

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
