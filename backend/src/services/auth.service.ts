import bcrypt from "bcrypt";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

const PASSWORD_SALT_ROUNDS = 12;

export async function registerUser(input: { name: string; email: string; password: string }) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (existingUser) {
    throw new HttpError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new HttpError(401, "Invalid email or password");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return user;
}
