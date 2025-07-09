import { Router } from "express";
import { getUserProfile } from "../controller/userController";
import { verifyToken } from "../middleware/authMiddleware";
import {
  addAddress,
  deleteAddress,
  getAddressById,
  getAddressCount,
  getUserAddresses,
  updateAddress,
} from "../controller/addressController";

const router = Router();

// Profile Routes

router.get("/profile", verifyToken, getUserProfile);

// Address Routes
router.post("/address", verifyToken, addAddress);
router.get("/addresses", verifyToken, getUserAddresses);
router.get("/addresses/count", verifyToken, getAddressCount);
router.get("/addresses/:id", verifyToken, getAddressById);
router.put("/addresses/:id", verifyToken, updateAddress);
router.delete("/addresses/:id", verifyToken, deleteAddress);

export default router;
