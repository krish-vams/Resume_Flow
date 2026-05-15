import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error";

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: "Validation failed",
      errors: error.flatten()
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      message: error.message,
      details: error.details
    });
    return;
  }

  console.error(error);
  response.status(500).json({ message: "Internal server error" });
};
