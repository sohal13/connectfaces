import Room from "../models/Room.js";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

export const createRoom = async (req, res) => {
  try {
    const roomId = nanoid(12);
    const { password } = req.body;
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const room = await Room.create({
      roomId,
      createdBy: req.user._id,
      participants: [req.user._id],
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Room created",
      data: {
        roomId: room.roomId,
        createdBy: room.createdBy,
        isActive: room.isActive,
        createdAt: room.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId, isActive: true }).populate("participants", "username");

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found or inactive" });
    }

    res.status(200).json({ success: true, data: room });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId, password } = req.body;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId, isActive: true }).select("+password");

    if (!room) return res.status(404).json({ success: false, message: "Room not found or inactive" });

    if (room.password) {
      const valid = await bcrypt.compare(password, room.password);
      if (!valid) return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      await room.save();
    }

    res.status(200).json({ success: true, message: "Joined successfully", data: room.roomId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to join room" });
  }
};

export const endRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });

    if (!room || !room.createdBy.equals(userId)) {
      return res.status(403).json({ success: false, message: "Unauthorized or Room not found" });
    }

    room.isActive = false;
    await room.save();

    res.status(200).json({ success: true, message: "Room ended" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to end room" });
  }
};

export const kickUser = async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const requester = req.user._id;

    const room = await Room.findOne({ roomId });

    if (!room || !room.createdBy.equals(requester)) {
      return res.status(403).json({ success: false, message: "Unauthorized or Room not found" });
    }

    room.participants = room.participants.filter(p => p.toString() !== userId);
    await room.save();

    res.status(200).json({ success: true, message: "User removed from room" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to kick user" });
  }
};
