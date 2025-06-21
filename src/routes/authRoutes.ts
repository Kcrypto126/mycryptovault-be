import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyToken,
  verifyEmail
} from "../controllers/authController";
import {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
} from "../validators/authValidators";

const router = Router();

// Auth routes
router.post("/signup", validateRegistration, register);
router.post("/signin", validateLogin, login);

router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);

router.post("/verify-token", verifyToken);
router.post("/verify-email", verifyEmail);

export default router;
