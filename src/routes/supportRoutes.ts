import { Router } from "express";
import { auth } from "../middlewares/auth";
import { createSupport, deleteSupport, getAllSupport, getSupport, updateSupport } from "../controllers/supportController";

const router = Router();

router.post("/create", auth, createSupport);
router.get("/get-support", auth, getSupport);
router.get("/get-supports", auth, getAllSupport);
router.put("/update", auth, updateSupport);
router.delete("/delete", auth, deleteSupport);

export default router;


