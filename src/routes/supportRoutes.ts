import { Router } from "express";
import { auth } from "../middlewares/auth";
import { createSupport, deleteSupport, getAllSupport, getSupport, updateSupport, updateSupportStatus } from "../controllers/supportController";

const router = Router();

router.post("/create", auth, createSupport);
router.get("/get-support", auth, getSupport);
router.get("/get-all", auth, getAllSupport);
router.post("/update", auth, updateSupport);
router.post("/delete", auth, deleteSupport);
router.post("/update-status", auth, updateSupportStatus);

export default router;


