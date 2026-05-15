import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME } from "../config/auth";
import { verifyAuthToken } from "../utils/jwt";

function getBearerToken(request: Request): string | null {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.[AUTH_COOKIE_NAME] ?? getBearerToken(request);

  if (!token) {
    response.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    request.user = verifyAuthToken(token);
    next();
  } catch {
    response.status(401).json({ message: "Invalid or expired token" });
  }
}
