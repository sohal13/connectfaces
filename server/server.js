// server.js
import express from "express";
import dotenv from 'dotenv'
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoute.js";
import roomRoutes from "./routes/roomRoute.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { socketHandler } from "./socket/socketHandler.js";

// ✅ Load environment variables
dotenv.config();

const app = express();

// ✅ Define allowed origins
const allowedOrigins = [process.env.CLIENT_URL || "http://localhost:5173"];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);

// ✅ Home Route
app.get("/", (req, res) => {
    res.json("Subscribe to SlrTech - server working");
});

const server = createServer(app);

const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: allowedOrigins[0],
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Delegating socket logic to a separate module
io.on("connection", (socket) => socketHandler(io, socket));

const PORT = process.env.PORT || 3000;

server.listen(PORT, async() => {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.log("❌ MongoDB connection error: ", err));
    console.log(`✅ Running server on port ${PORT}`);
});

