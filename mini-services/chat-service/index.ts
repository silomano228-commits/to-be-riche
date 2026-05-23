import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3003;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Track online admins
const onlineAdmins = new Set<string>();

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
    onlineAdmins.add(userId);
    socket.join('admins');
    // Notify all users that admin is online
    io.emit('admin-presence', { online: true, adminCount: onlineAdmins.size });
    console.log(`[CHAT] Admin ${userName} (${userId}) connected. Total admins online: ${onlineAdmins.size}`);
  } else {
    console.log(`[CHAT] User ${userName} (${userId}) connected`);
    // Send current admin presence to the newly connected user
    socket.emit('admin-presence', { online: onlineAdmins.size > 0, adminCount: onlineAdmins.size });
  }

  // ========== USER EVENTS ==========

  // User sends a message to admin
  socket.on('user-message', (data: { content: string; userId: string; userName: string }) => {
    const msgData = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      content: data.content,
      userId: data.userId,
      userName: data.userName || 'Utilisateur',
      isAdmin: false,
      timestamp: Date.now(),
      t: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    };

    // Broadcast to all admins
    io.to('admins').emit('new-user-message', msgData);
  });

  // ========== ADMIN EVENTS ==========

  // Admin sends a reply to a specific user
  socket.on('admin-reply', (data: { targetUserId: string; content: string; adminId: string; adminName: string }) => {
    const msgData = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      content: data.content,
      userId: data.targetUserId,
      adminId: data.adminId,
      adminName: data.adminName || 'Admin',
      isAdmin: true,
      timestamp: Date.now(),
      t: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    };

    // Send to the specific user
    io.to(`user:${data.targetUserId}`).emit('admin-message', msgData);
    // Also broadcast to all admins (so other admin tabs see it)
    io.to('admins').emit('admin-message-sent', msgData);
  });

  // Admin requests online status
  socket.on('get-admin-presence', () => {
    socket.emit('admin-presence', { online: onlineAdmins.size > 0, adminCount: onlineAdmins.size });
  });

  // ========== DISCONNECT ==========

  socket.on('disconnect', () => {
    if (userRole === 'admin') {
      onlineAdmins.delete(userId);
      // Notify all users about admin presence change
      io.emit('admin-presence', { online: onlineAdmins.size > 0, adminCount: onlineAdmins.size });
      console.log(`[CHAT] Admin ${userName} disconnected. Remaining admins: ${onlineAdmins.size}`);
    } else {
      console.log(`[CHAT] User ${userName} disconnected`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[CHAT-SERVICE] Socket.io server running on port ${PORT}`);
});
