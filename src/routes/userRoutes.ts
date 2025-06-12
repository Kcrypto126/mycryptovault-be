import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getAllUser,
  deleteUser,
  updateBonus,
  updateBalance,
  updatePassword,
} from "../controllers/userController";
import { auth } from "../middlewares/auth";
import {
  validateUpdateProfile,
  validateEmail,
  validateUpdatePassword,
} from "../validators/userValidators";
import multer from "multer";
import path from "path";

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/avatars/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Please upload only images"));
    }
  },
});

// User routes
router.get("/profile", auth, getProfile);

// Update user profile
router.put(
  "/profile",
  auth,
  validateUpdateProfile,
  upload.single("avatar"),
  updateProfile
);

router.put("/password", auth, validateUpdatePassword, updatePassword);

// By admin
router.get("/all-user", auth, getAllUser);
router.delete("/delete", auth, deleteUser);

// Handle balance and bonus
router.post("/balance", auth, updateBalance);
router.post("/bonus", auth, validateEmail, updateBonus);

export default router;
