const WebSocket = require('ws');
const http = require('http');

console.log('🚀 Starting Neural Terminal & Chat WebSocket server...');

const server = http.createServer();
const wss = new WebSocket.Server({ 
  server,
  path: '/'
});

const clients = new Set();
const logHistory = []; // Store last 100 logs
const chatHistory = []; // Store last 100 chat messages

function addLogToHistory(logEntry) {
  logHistory.push(logEntry);
  if (logHistory.length > 100) { // Keep only last 100 logs
    logHistory.shift();
  }
}

function addChatToHistory(chatEntry) {
  chatHistory.push(chatEntry);
  if (chatHistory.length > 100) { // Keep only last 100 chat messages
    chatHistory.shift();
  }
}

function sendLogHistory(ws) {
  logHistory.forEach(log => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(log));
    }
  });
  console.log(`📚 Sent ${logHistory.length} historical logs to a new client.`);
}

function sendChatHistory(ws) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      action: 'chat_history',
      messages: chatHistory,
      timestamp: new Date().toISOString()
    }));
  }
  console.log(`💬 Sent ${chatHistory.length} historical chat messages to a new client.`);
}

function broadcastLog(message, type = 'info') {
  const logEntry = {
    message,
    type,
    timestamp: new Date().toISOString()
  };
  
  addLogToHistory(logEntry); // Add to history
  const data = JSON.stringify(logEntry);
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
  
  console.log(`📡 Broadcasted log: ${message}`);
}

function broadcastChat(chatMessage) {
  addChatToHistory(chatMessage); // Add to chat history
  const data = JSON.stringify(chatMessage);
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
  
  console.log(`💬 Broadcasted chat: ${chatMessage.username || 'Admin'}: ${chatMessage.message}`);
}

wss.on('connection', (ws) => {
  console.log('👤 New client connected to Neural Terminal & Chat');
  clients.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    message: 'Connected to Neural Terminal & Chat',
    type: 'success',
    timestamp: new Date().toISOString()
  }));
  
  // Send historical logs and chat to new client
  setTimeout(() => {
    sendLogHistory(ws);
    sendChatHistory(ws);
  }, 100);
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received message:', message);
      
      // Handle different message types
      if (message.action === 'request_history') {
        // Send log history to this specific client
        sendLogHistory(ws);
      } else if (message.action === 'request_chat_history') {
        // Send chat history to this specific client
        sendChatHistory(ws);
      } else if (message.action === 'broadcast_chat') {
        // Broadcast chat message to all clients
        broadcastChat({
          type: message.type,
          id: message.id,
          username: message.username,
          message: message.message,
          timestamp: message.timestamp,
          color: message.color,
          messageType: message.messageType
        });
      } else if (message.action === 'broadcast' || message.message) {
        // If it's a broadcast request, broadcast it to all clients
        broadcastLog(message.message, message.type || 'info');
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('👋 Client disconnected from Neural Terminal & Chat');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      clients: clients.size,
      logHistorySize: logHistory.length,
      chatHistorySize: chatHistory.length,
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>Neural Terminal & Chat WebSocket Server</title></head>
        <body>
          <h1>🚀 Neural Terminal & Chat WebSocket Server</h1>
          <p>Status: ✅ Running</p>
          <p>Connected clients: ${clients.size}</p>
          <p>Log History size: ${logHistory.length}</p>
          <p>Chat History size: ${chatHistory.length}</p>
          <p>Ready to receive Neural distribution logs and chat messages</p>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Neural Terminal & Chat WebSocket server running on port ${PORT}`);
  console.log(`📡 Ready to accept connections from Neural dashboard`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = { broadcastLog, broadcastChat };
