import { Router } from "express";
import {
  createProfile,
  getProfile,
  listProfiles,
  removeProfile,
  updateProfile
} from "../controllers/candidate-profiles.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const candidateProfilesRouter = Router();

candidateProfilesRouter.use(requireAuth);
candidateProfilesRouter.post("/", asyncHandler(createProfile));
candidateProfilesRouter.get("/", asyncHandler(listProfiles));
candidateProfilesRouter.get("/:id", asyncHandler(getProfile));
candidateProfilesRouter.put("/:id", asyncHandler(updateProfile));
candidateProfilesRouter.delete("/:id", asyncHandler(removeProfile));
