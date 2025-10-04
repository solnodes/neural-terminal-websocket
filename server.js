const WebSocket = require('ws');
const http = require('http');

console.log('Starting Neural Terminal & Chat server...');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Set();
const messageHistory = [];

function broadcast(message) {
  messageHistory.push(message);
  if (messageHistory.length > 100) {
    messageHistory.shift();
  }
  
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
  
  console.log('Broadcasted:', message.message || message.type);
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  ws.send(JSON.stringify({
    message: 'Connected to Neural Terminal',
    type: 'success',
    timestamp: new Date().toISOString()
  }));
  
  // Send all message history after connection
  setTimeout(() => {
    messageHistory.forEach(msg => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    });
  }, 100);
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      if (msg.action === 'broadcast') {
        broadcast({
          message: msg.message,
          type: msg.type || 'info',
          timestamp: new Date().toISOString()
        });
      } else if (msg.action === 'broadcast_chat') {
        broadcast({
          type: msg.type,
          id: msg.id,
          username: msg.username,
          message: msg.message,
          timestamp: msg.timestamp,
          color: msg.color,
          messageType: msg.messageType
        });
      } else if (msg.action === 'request_history') {
        // Send terminal log history
        messageHistory.forEach(historyMsg => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(historyMsg));
          }
        });
      } else if (msg.action === 'request_chat_history') {
        // Send chat history - filter for chat messages only
        const chatMessages = messageHistory.filter(m => m.type === 'chat_message' || m.type === 'admin_message');
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            action: 'chat_history',
            messages: chatMessages,
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error.message);
    clients.delete(ws);
  });
});

server.on('request', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<h1>Neural Server</h1><p>Status: Running</p><p>Clients: ${clients.size}</p><p>Messages: ${messageHistory.length}</p>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { broadcast };
