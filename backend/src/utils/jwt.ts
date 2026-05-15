import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthUser } from "../types/auth";

type JwtPayload = AuthUser & jwt.JwtPayload;

export function signAuthToken(user: AuthUser): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  };

  return jwt.sign(user, env.JWT_SECRET, options);
}

export function verifyAuthToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

  if (!payload.id || !payload.email) {
    throw new Error("Invalid token payload");
  }

  return {
    id: payload.id,
    email: payload.email
  };
}
