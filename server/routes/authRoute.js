import express from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/authController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// Protected route example
router.get("/me", verifyToken, (req, res) => {
  res.status(200).json(req.user);
});

export default router;
