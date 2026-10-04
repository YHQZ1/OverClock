import type { Request, Response } from "express";
import { z } from "zod";
import type { AdminService } from "../services/admin.service.js";
import { UserError } from "../utils/errors.js";

const loginSchema = z.object({ passcode: z.string().min(1, "Enter the passcode.").max(128) });

/** POST /api/admin/login → { token } for the admin page and the big screen. */
export const login = (admin: AdminService) => (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
  try {
    res.json({ token: admin.login(parsed.data.passcode, req.ip ?? "unknown") });
  } catch (err) {
    if (err instanceof UserError) return res.status(401).json({ error: err.message });
    throw err;
  }
};
