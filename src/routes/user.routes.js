import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser
} from "../controllers/user.controller.js";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { UserRolesEnum } from "../models/user.model.js";

const router = Router();

router.use(verifyJWT);

router.get(
  "/",
  authorizeRoles(UserRolesEnum.ADMIN, UserRolesEnum.MANAGER),
  getAllUsers
);
router.get("/:id", getUserById);
router.patch(
  "/:id/role",
  authorizeRoles(UserRolesEnum.ADMIN),
  updateUserRole
);
router.delete("/:id", authorizeRoles(UserRolesEnum.ADMIN), deleteUser);

export default router;
