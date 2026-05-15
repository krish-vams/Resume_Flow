import type { Request, Response } from "express";
import { AUTH_COOKIE_NAME } from "../config/auth";
import { env } from "../config/env";
import { getCurrentUser, loginUser, registerUser } from "../services/auth.service";
import { loginSchema, registerSchema } from "../validators/auth.validators";
import { signAuthToken } from "../utils/jwt";

const authCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function issueAuthCookie(response: Response, user: { id: string; email: string }) {
  const token = signAuthToken({ id: user.id, email: user.email });
  response.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
  return token;
}

export async function register(request: Request, response: Response) {
  const input = registerSchema.parse(request.body);
  const user = await registerUser(input);
  const token = issueAuthCookie(response, user);

  response.status(201).json({ user, token });
}

export async function login(request: Request, response: Response) {
  const input = loginSchema.parse(request.body);
  const user = await loginUser(input);
  const token = issueAuthCookie(response, user);

  response.json({ user, token });
}

export async function me(request: Request, response: Response) {
  const user = await getCurrentUser(request.user!.id);
  response.json({ user });
}

export async function logout(_request: Request, response: Response) {
  response.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
  response.status(204).send();
}
