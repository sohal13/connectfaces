const users = {};
const socketToRoom = {};

export const socketHandler = (io, socket) => {
    console.log("Socket connected: ", socket.id);

    // --- Join Room ---
    socket.on("join room", (roomID, userData) => {
        //console.log("Users in room before join:", users[roomID]);
        // Ensure the room exists
        if (!users[roomID]) {
            console.log(`Room ${roomID} does not exist, creating it.`);
            users[roomID] = [];
        }
        // Check if the user already exists in the room
        const existingUserIndex = users[roomID].findIndex((user) => user.id === userData.id);
        if (existingUserIndex !== -1) {
            // Remove the old socketId for the same user
            const existingUser = users[roomID][existingUserIndex];
            //console.log(`Removing old socketId for user: ${existingUser.socketId}`);
            users[roomID].splice(existingUserIndex, 1);
        }
        // Add the new user with the new socketId
        users[roomID].push({ socketId: socket.id, ...userData });
        socketToRoom[socket.id] = roomID;
        // Exclude the current user from the list of users sent back
        const usersInThisRoom = users[roomID].filter((user) => user.socketId !== socket.id);
        console.log("Users in room after join:", usersInThisRoom);
        // Emit the list of users in the room (without the new user)
        socket.emit("all users", usersInThisRoom);
        // Inform others that a new user has joined
        socket.to(roomID).emit("user joined", {
            signal: null, // We are not sending any signal initially
            callerID: socket.id,
            user: userData,
        });
    });

    // --- Sending Signal ---
    socket.on("sending signal", (payload) => {
        // console.log("Sending signal to user:", payload);
        const targetSocket = io.sockets.sockets.get(payload.userToSignal);
        if (targetSocket) {
           console.log(`Sending signal from ${socket.id} to ${payload.userToSignal}`);
            io.to(payload.userToSignal).emit("user joined", {
                signal: payload.signal,
                callerID: payload.callerID,
                user: payload.userData,
            });
        } else {
            console.error(`Target user ${payload.userToSignal} not found`);
        }
    });

    // --- Returning Signal ---
    socket.on("returning signal", (payload) => {
        //console.log("Returning signal to user:", payload);
        const targetSocket = io.sockets.sockets.get(payload.callerID);
        if (targetSocket) {
            console.log(`Returning signal from ${socket.id} to ${payload.callerID}`);
            io.to(payload.callerID).emit("receiving returned signal", {
                signal: payload.signal,
                id: socket.id,
            });
        } else {
            console.error(`Caller user ${payload.callerID} not found`);
        }
    });

    // --- Handle User Disconnection ---
    socket.on("disconnect", () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            // Find the disconnected user
            const disconnectedUser = room.find((user) => user.socketId === socket.id);

            // Remove the user from the room
            room = room.filter((user) => user.socketId !== socket.id);
            users[roomID] = room;
           // console.log("Users in room after disconnect:", users[roomID]);

            // If the room is empty, delete it
            if (users[roomID].length === 0) {
                delete users[roomID];
            }

            // Remove the socketId from socketToRoom
            delete socketToRoom[socket.id];

            // Notify other users in the room about the disconnection
            if (disconnectedUser) {
                socket.broadcast.emit("user-left", {
                    socketId: socket.id,
                    username: disconnectedUser.username,
                });
            }
        }
    });
};
