import { Router } from "express";
import { auth } from "../middlewares/auth";
import { createSupport, deleteSupport, getAllSupport, getSupport, updateSupport } from "../controllers/supportController";

const router = Router();

router.post("/create", auth, createSupport);
router.get("/get-supports", auth, getSupport);
router.get("/get-all-support", auth, getAllSupport);
router.put("/update", auth, updateSupport);
router.delete("/delete", auth, deleteSupport);

export default router;


