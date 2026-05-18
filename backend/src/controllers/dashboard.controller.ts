import type { Request, Response } from "express";
import { getDashboardSummary } from "../services/dashboard.service";

export async function getDashboardSummaryRecord(request: Request, response: Response) {
  const summary = await getDashboardSummary(request.user!.id);

  response.json({ summary });
}
