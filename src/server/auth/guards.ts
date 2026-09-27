import { redirect } from "next/navigation";
import type { UserRole, AccountStatus } from "@prisma/client";

import { auth } from "@/auth";

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  status: AccountStatus;
};

/**
 * Require an authenticated user. Redirects to /login if not signed in.
 * Redirects to /verify-email-pending if the account isn't active yet.
 */
export async function requireUser(): Promise<AuthUser> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.status !== "ACTIVE") {
    const email = session.user.email ?? "";
    redirect(
      `/verify-email-pending?email=${encodeURIComponent(email)}`,
    );
  }

  return session.user as AuthUser;
}

/**
 * Require a specific role. Redirects to /dashboard on mismatch.
 * Chain with requireUser() when you also need the user object.
 */
export async function requireRole(...allowed: UserRole[]): Promise<AuthUser> {
  const user = await requireUser();

  if (!allowed.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

/**
 * Require admin or super_admin.
 */
export async function requireAdmin(): Promise<AuthUser> {
  return requireRole("ADMIN", "SUPER_ADMIN");
}

/**
 * Get the current user without redirecting — returns null if not signed in.
 * Useful for pages that show different content when logged in.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as AuthUser;
}