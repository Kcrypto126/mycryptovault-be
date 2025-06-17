import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import transactionRoutes from "./transactionRoutes";
import supportRoutes from "./supportRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/support", supportRoutes);
router.use("/transactions", transactionRoutes);

export default router;
