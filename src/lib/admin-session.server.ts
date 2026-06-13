import { useSession } from "@tanstack/react-start/server";

export type AdminSession = { isAdmin?: boolean; loggedInAt?: number };

export function getAdminSession() {
  const sessionPassword = process.env.ADMIN_SESSION_SECRET;
  if (!sessionPassword || sessionPassword.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET environment variable is required and must be at least 32 characters long",
    );
  }
  return useSession<AdminSession>({
    password: sessionPassword,
    name: "bv_admin",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, sameSite: "lax", secure: true, path: "/" },
  });
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.data?.isAdmin) {
    throw new Error("Unauthorized");
  }
  return session;
}
