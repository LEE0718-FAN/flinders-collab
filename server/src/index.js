const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const { initSockets } = require('./sockets');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const eventRoutes = require('./routes/events');
const fileRoutes = require('./routes/files');
const locationRoutes = require('./routes/location');
const messageRoutes = require('./routes/messages');
const taskRoutes = require('./routes/tasks');
const reportRoutes = require('./routes/reports');
const boardRoutes = require('./routes/board');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSockets(server);

// Make io accessible in routes if needed
app.set('io', io);

// Global middleware
app.use(helmet());
app.use(cors({
  origin: config.clientUrl.includes(',')
    ? config.clientUrl.split(',').map(url => url.trim())
    : config.clientUrl,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', eventRoutes);
app.use('/api', fileRoutes);
app.use('/api', locationRoutes);
app.use('/api', messageRoutes);
app.use('/api', taskRoutes);
app.use('/api', reportRoutes);
app.use('/api', boardRoutes);

// Serve built client in production
const path = require('path');
const clientDist = path.resolve(__dirname, '../../client/dist');
if (config.nodeEnv === 'production') {
  app.use(express.static(clientDist));
  // SPA fallback — any non-API route serves index.html
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Keep-alive ping to prevent Render free tier from sleeping
  if (config.nodeEnv === 'production') {
    const PING_URL = process.env.RENDER_EXTERNAL_URL || 'https://flinders-collab.onrender.com';
    setInterval(() => {
      const https = require('https');
      https.get(`${PING_URL}/api/health`, () => {}).on('error', () => {});
    }, 14 * 60 * 1000); // every 14 minutes
  }
});

module.exports = { app, server, io };
