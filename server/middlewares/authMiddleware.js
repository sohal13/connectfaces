import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  console.log("tokeeenss");

  const token = req.cookies.token ||
    req.headers.cookie?.split(";").find((cookie) => cookie.trim().startsWith("token="))?.split("=")[1]; // Check if req.headers.cookie exists
  console.log("token ", token);

  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
