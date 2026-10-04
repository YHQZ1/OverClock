import { Router } from "express";
import { login } from "../controllers/admin.controller.js";
import type { AdminService } from "../services/admin.service.js";

/** Staff sign-in. Everything else staff do goes over the socket. */
export const adminRoutes = (admin: AdminService) => Router().post("/login", login(admin));
