import { Router } from "express";
import { getUserProfile } from "../controller/userController";
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

router.get("/profile", verifyToken, getUserProfile);

export default router;
