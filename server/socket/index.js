import Room from "../models/Room.js";

// WebRTC Signaling + Room Management Handler
export const socketHandler = (io, socket) => {

  console.log(`🔌 User connected: ${socket.id}`);

  let currentRoomId = null;
  let currentUserId = null;
  let isAdmin = false;

  // --- Join Room ---
  socket.on("join-room", async ({ roomId, userId }) => {
    //console.log("roomId",roomId,"userId",userId);
    try {
      const room = await Room.findOne({ roomId, isActive: true }).populate("participants", "username _id");
      //console.log(room);
      if (!room) return socket.emit("error", "❌ Room not found or inactive");

      // Save context
      currentRoomId = roomId;
      currentUserId = userId;
      isAdmin = String(room.createdBy) === userId;
      socket.userId = userId;
      socket.join(roomId);

      // Add user to room if not already there
      if (!room.participants.some(p => String(p._id) === userId)) {
        room.participants.push(userId);
        await room.save();
      }
      // Find the username of the user who joined
      const user = room.participants.find(p => String(p._id) === userId);
      const username = await user?.username;
      //console.log("User joined:", username);

      // Inform others in the room
      socket.to(roomId).emit("user-joined", {
        userId,
        username,
        socketId: socket.id,
      });

      // Send current users to new user
      /*const sockets = await io.in(roomId).fetchSockets();
      const otherUsers = sockets
        .filter(s => s.id !== socket.id)
        .map(s => ({ userId: s.userId, socketId: s.id }))
        .filter(u => u.userId);

      socket.emit("all-users", otherUsers);
*/
      // Broadcast updated participant list
      const updatedRoom = await Room.findOne({ roomId }).populate("participants", "username _id");
      const sockets = await io.in(roomId).fetchSockets();
      console.log("Sockets in room:", sockets.map(s => ({ id: s.id, userId: s.userId }))); // Debugging

      const participantsWithSocketIds = updatedRoom.participants.map(participant => {
      const socket = sockets.find(s => s.userId === String(participant._id));
      console.log("Participant:", participant.username, "Socket ID:", socket?.id); // Debugging
        return {
          userId: participant._id,
          username: participant.username,
          socketId: socket?.id // Include socketId if available
        };
      });

      io.to(roomId).emit("room-users", participantsWithSocketIds);
    } catch (err) {
      console.error("join-room error:", err);
      socket.emit("error", "⚠️ Failed to join room");
    }
  });

  // --- WebRTC Signaling Exchange ---
  socket.on("signal", ({ to, from, signal }) => {
    if (!to) {
      console.error("Target socketId is undefined for signal:", signal);
      return;
  }
    console.log("Relaying signal from:", from, "to:", to); // Debugging
    io.to(to).emit("signal", { from, signal });
});

  // --- Kick User (Admin Only) ---
  socket.on("kick-user", async ({ roomId, targetUserId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room || String(room.createdBy) !== currentUserId) {
        return socket.emit("error", "❌ Unauthorized");
      }

      room.participants = room.participants.filter(p => String(p) !== String(targetUserId));
      await room.save();

      io.to(roomId).emit("user-kicked", targetUserId);

      // Force socket to leave
      const sockets = await io.in(roomId).fetchSockets();
      const targetSocket = sockets.find(s => s.userId === targetUserId);
      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.emit("kicked");
      }
    } catch (err) {
      console.error("kick-user error:", err);
    }
  });

  // --- End Room (Admin Only) ---
  socket.on("end-room", async () => {
    try {
      const room = await Room.findOne({ roomId: currentRoomId });
      if (!room || String(room.createdBy) !== currentUserId) return;

      room.isActive = false;
      await room.save();

      io.to(currentRoomId).emit("room-ended");
      io.in(currentRoomId).socketsLeave(currentRoomId);
    } catch (err) {
      console.error("end-room error:", err);
    }
  });

  // --- Leave Room (User Action) ---
  socket.on("leave-room", async () => {
    await handleUserLeave();
    socket.leave(currentRoomId);
  });

  // --- Disconnect ---
  socket.on("disconnect", async () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    await handleUserLeave();
  });

  // --- Get Current Room Users ---
  socket.on("get-room-users", async (roomId) => {
    try {
      const room = await Room.findOne({ roomId }).populate("participants", "username _id");
      if (room) {
        socket.emit("room-users", room.participants);
      } else {
        socket.emit("error", "Room not found");
      }
    } catch (err) {
      console.error("get-room-users error:", err);
    }
  });

  // --- Helper: Handle User Leave (disconnect/leave-room) ---
  const handleUserLeave = async () => {
    if (!currentRoomId || !currentUserId) return;

    try {
      const room = await Room.findOne({ roomId: currentRoomId });
      if (!room) return;

      room.participants = room.participants.filter(id => String(id) !== String(currentUserId));
      await room.save();

      socket.to(currentRoomId).emit("user-left", currentUserId);

      const updatedRoom = await Room.findOne({ roomId: currentRoomId }).populate("participants", "username _id");
      io.to(currentRoomId).emit("room-users", updatedRoom.participants);
    } catch (err) {
      console.error("handleUserLeave error:", err);
    }
  };
};
