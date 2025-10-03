const WebSocket = require('ws');
const http = require('http');

console.log('🚀 Starting Neural Terminal WebSocket server for Glitch...');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/'
});

// Store connected clients
const clients = new Set();

// Broadcast function to send logs to all connected clients
function broadcastLog(message, type = 'info') {
  const logEntry = {
    message,
    type,
    timestamp: new Date().toISOString()
  };
  
  const data = JSON.stringify(logEntry);
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
  
  console.log(`📡 Broadcasted: ${message}`);
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('👤 New client connected to Neural Terminal');
  clients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    message: 'Connected to Neural Terminal',
    type: 'success',
    timestamp: new Date().toISOString()
  }));
  
  // Handle incoming messages and broadcast them
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received message:', message);
      
      // If it's a broadcast request, broadcast it to all clients
      if (message.action === 'broadcast' || message.message) {
        broadcastLog(message.message, message.type || 'info');
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('👋 Client disconnected from Neural Terminal');
    clients.delete(ws);
  });
  
  // Handle client errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      clients: clients.size,
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Neural Terminal WebSocket Server</title></head>
        <body>
          <h1>🚀 Neural Terminal WebSocket Server</h1>
          <p>Status: ✅ Running</p>
          <p>Connected clients: ${clients.size}</p>
          <p>Ready to receive Neural distribution logs</p>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Neural Terminal WebSocket server running on port ${PORT}`);
  console.log(`📡 Ready to accept connections from Neural dashboard`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Export the broadcast function for use in other scripts
module.exports = { broadcastLog };

// Keep the server running
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Neural Terminal WebSocket server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
