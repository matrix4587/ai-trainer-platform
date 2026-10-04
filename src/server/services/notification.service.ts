import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  metadata: unknown;
  readAt: string | null;
  createdAt: string;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: unknown;
};

// ─────────────────────────────────────────────────────────────
// createNotification
// Best-effort. Never throws — a failed notification must never
// roll back the business action that triggered it.
// ─────────────────────────────────────────────────────────────

export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
  } catch (err) {
    console.error("[createNotification] failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// listMyNotifications
// ─────────────────────────────────────────────────────────────

export async function listMyNotifications(
  userId: string,
  limit = 50,
): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      metadata: true,
      readAt: true,
      createdAt: true,
    },
  });

  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    metadata: n.metadata,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));
}

// ─────────────────────────────────────────────────────────────
// countUnread
// ─────────────────────────────────────────────────────────────

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

// ─────────────────────────────────────────────────────────────
// markAsRead / markAllAsRead
// ─────────────────────────────────────────────────────────────

export async function markAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
