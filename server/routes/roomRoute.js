// routes/room.routes.js
import express from "express";
import { createRoom, endRoom, getRoom, joinRoom, kickUser } from "../controllers/roomController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", verifyToken, createRoom);
router.get("/:roomId", verifyToken, getRoom);
router.post("/join", verifyToken, joinRoom);
router.post("/:roomId/end", verifyToken, endRoom);
router.post("/:roomId/kick/:userId", verifyToken, kickUser);

export default router;
