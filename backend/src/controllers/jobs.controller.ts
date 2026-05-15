import type { Request, Response } from "express";
import {
  analyzeJob,
  analyzeJobEligibility,
  createJob,
  deleteJob,
  getJob,
  listJobs,
  updateJob
} from "../services/job.service";
import { createJobSchema, updateJobSchema } from "../validators/job.validators";
import { HttpError } from "../utils/http-error";

function getJobId(request: Request) {
  const id = request.params.id;

  if (typeof id !== "string") {
    throw new HttpError(400, "Job id is required");
  }

  return id;
}

export async function createJobRecord(request: Request, response: Response) {
  const input = createJobSchema.parse(request.body);
  const job = await createJob(request.user!.id, input);

  response.status(201).json({ job });
}

export async function listJobRecords(request: Request, response: Response) {
  const jobs = await listJobs(request.user!.id);

  response.json({ jobs });
}

export async function getJobRecord(request: Request, response: Response) {
  const job = await getJob(request.user!.id, getJobId(request));

  response.json({ job });
}

export async function updateJobRecord(request: Request, response: Response) {
  const input = updateJobSchema.parse(request.body);
  const job = await updateJob(request.user!.id, getJobId(request), input);

  response.json({ job });
}

export async function analyzeJobEligibilityRecord(request: Request, response: Response) {
  const result = await analyzeJobEligibility(request.user!.id, getJobId(request));

  response.json(result);
}

export async function analyzeJobRecord(request: Request, response: Response) {
  const result = await analyzeJob(request.user!.id, getJobId(request));

  response.json(result);
}

export async function removeJobRecord(request: Request, response: Response) {
  await deleteJob(request.user!.id, getJobId(request));

  response.status(204).send();
}
