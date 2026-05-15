import type { Request, Response } from "express";
import {
  createCandidateProfile,
  deleteCandidateProfile,
  getCandidateProfile,
  listCandidateProfiles,
  updateCandidateProfile
} from "../services/candidate-profile.service";
import {
  createCandidateProfileSchema,
  updateCandidateProfileSchema
} from "../validators/candidate-profile.validators";
import { HttpError } from "../utils/http-error";

function getProfileId(request: Request) {
  const id = request.params.id;

  if (typeof id !== "string") {
    throw new HttpError(400, "Candidate profile id is required");
  }

  return id;
}

export async function createProfile(request: Request, response: Response) {
  const input = createCandidateProfileSchema.parse(request.body);
  const profile = await createCandidateProfile(request.user!.id, input);

  response.status(201).json({ profile });
}

export async function listProfiles(request: Request, response: Response) {
  const profiles = await listCandidateProfiles(request.user!.id);

  response.json({ profiles });
}

export async function getProfile(request: Request, response: Response) {
  const profile = await getCandidateProfile(request.user!.id, getProfileId(request));

  response.json({ profile });
}

export async function updateProfile(request: Request, response: Response) {
  const input = updateCandidateProfileSchema.parse(request.body);
  const profile = await updateCandidateProfile(request.user!.id, getProfileId(request), input);

  response.json({ profile });
}

export async function removeProfile(request: Request, response: Response) {
  await deleteCandidateProfile(request.user!.id, getProfileId(request));

  response.status(204).send();
}
