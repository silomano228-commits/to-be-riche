import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';

const PORT = 3003;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Track online admins with connection count
const adminConnections = new Map<string, number>(); // userId -> connection count

// ========== HTTP ENDPOINT FOR WITHDRAWAL NOTIFICATIONS ==========
// API routes can POST to this endpoint to notify admins without importing socket.io-client
httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST' && req.url === '/notify-withdrawal') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log(`[CHAT] Withdrawal notification via HTTP: ${data.type} ${data.amount}$ from ${data.userName}`);
        // Broadcast to all admins
        io.to('admins').emit('new-withdrawal', data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId as string | undefined;
  const userRole = socket.handshake.auth?.userRole as string | undefined;
  const userName = socket.handshake.auth?.userName as string | undefined;

  if (!userId) {
    console.log('[CHAT] Connection rejected: no userId');
    socket.disconnect();
    return;
  }

  // Join user's personal room (for receiving targeted messages)
  socket.join(`user:${userId}`);

  // Track admin presence
  if (userRole === 'admin') {
    adminConnections.set(userId, (adminConnections.get(userId) || 0) + 1);
    socket.join('admins');
    // Notify all users that admin is online
    io.emit('admin-presence', { online: adminConnections.size > 0, adminCount: adminConnections.size });
    console.log(`[CHAT] Admin ${userName} (${userId}) connected. Total admins online: ${adminConnections.size}`);
  } else {
    console.log(`[CHAT] User ${userName} (${userId}) connected`);
    // Send current admin presence to the newly connected user
    socket.emit('admin-presence', { online: adminConnections.size > 0, adminCount: adminConnections.size });
  }

  // ========== USER EVENTS ==========

  // User sends a message to admin — forward data with real DB ID from client
  socket.on('user-message', (data: { id: string; content: string; userId: string; userName: string; t: string; date: string }) => {
    const msgData = {
      id: data.id,
      content: data.content,
      userId: data.userId,
      userName: data.userName || 'Utilisateur',
      isAdmin: false,
      t: data.t,
      date: data.date,
    };

    // Broadcast to all admins
    io.to('admins').emit('new-user-message', msgData);
  });

  // ========== WITHDRAWAL NOTIFICATION ==========
  // Backend API will emit this event when a new withdrawal is created
  socket.on('withdrawal-created', (data: {
    withdrawalId: string;
    type: 'trx' | 'yas';
    userId: string;
    userName: string;
    amount: number;
    amountCfa?: number;
    yasAccount?: string;
    trxAddress?: string;
  }) => {
    console.log(`[CHAT] Withdrawal notification: ${data.type} ${data.amount}$ from ${data.userName}`);
    // Forward to all admins
    io.to('admins').emit('new-withdrawal', data);
  });

  // ========== ADMIN EVENTS ==========

  // Admin sends a reply to a specific user — forward data with real DB ID from client
  socket.on('admin-reply', (data: { id: string; targetUserId: string; content: string; adminId: string; adminName: string; t: string; date: string }) => {
    const msgData = {
      id: data.id,
      content: data.content,
      userId: data.targetUserId,
      adminId: data.adminId,
      adminName: data.adminName || 'Admin',
      isAdmin: true,
      t: data.t,
      date: data.date,
    };

    // Send to the specific user
    io.to(`user:${data.targetUserId}`).emit('admin-message', msgData);
    // Also broadcast to all admins (so other admin tabs see it)
    io.to('admins').emit('admin-message-sent', msgData);
  });

  // Admin requests online status
  socket.on('get-admin-presence', () => {
    socket.emit('admin-presence', { online: adminConnections.size > 0, adminCount: adminConnections.size });
  });

  // ========== DISCONNECT ==========

  socket.on('disconnect', () => {
    if (userRole === 'admin') {
      const currentCount = adminConnections.get(userId) || 0;
      if (currentCount <= 1) {
        adminConnections.delete(userId);
      } else {
        adminConnections.set(userId, currentCount - 1);
      }
      // Notify all users about admin presence change
      io.emit('admin-presence', { online: adminConnections.size > 0, adminCount: adminConnections.size });
      console.log(`[CHAT] Admin ${userName} disconnected. Remaining admins: ${adminConnections.size}`);
    } else {
      console.log(`[CHAT] User ${userName} disconnected`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[CHAT-SERVICE] Socket.io server running on port ${PORT}`);
});
