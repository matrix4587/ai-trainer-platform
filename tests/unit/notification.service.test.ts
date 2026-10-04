import { describe, it, expect, vi, beforeEach } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  createNotification,
  countUnread,
  listMyNotifications,
  markAsRead,
  markAllAsRead,
} from "@/server/services/notification.service";

describe("notification.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createNotification inserts a row with the given fields", async () => {
    vi.mocked(prisma.notification.create).mockResolvedValueOnce({} as never);

    await createNotification({
      userId: "u1",
      type: "TASK_APPROVED",
      title: "Approved",
      body: "You earned $8",
      link: "/wallet",
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(prisma.notification.create).mock.calls[0][0];
    expect(arg?.data).toMatchObject({
      userId: "u1",
      type: "TASK_APPROVED",
      title: "Approved",
      body: "You earned $8",
      link: "/wallet",
    });
  });

  it("createNotification swallows errors", async () => {
    vi.mocked(prisma.notification.create).mockRejectedValueOnce(
      new Error("DB down"),
    );

    await expect(
      createNotification({
        userId: "u1",
        type: "SYSTEM",
        title: "Hello",
      }),
    ).resolves.toBeUndefined();
  });

  it("countUnread filters by userId and readAt null", async () => {
    vi.mocked(prisma.notification.count).mockResolvedValueOnce(3);

    const result = await countUnread("u1");

    expect(result).toBe(3);
    const arg = vi.mocked(prisma.notification.count).mock.calls[0][0];
    expect(arg?.where).toEqual({ userId: "u1", readAt: null });
  });

  it("listMyNotifications maps rows to the view shape and sorts desc", async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValueOnce([
      {
        id: "n1",
        type: "TASK_APPROVED",
        title: "Approved",
        body: null,
        link: "/wallet",
        metadata: { submissionId: "s1" },
        readAt: null,
        createdAt: new Date("2026-10-04T12:00:00Z"),
      },
    ] as never);

    const result = await listMyNotifications("u1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "n1",
      type: "TASK_APPROVED",
      title: "Approved",
      body: null,
      link: "/wallet",
      metadata: { submissionId: "s1" },
      readAt: null,
      createdAt: "2026-10-04T12:00:00.000Z",
    });

    const arg = vi.mocked(prisma.notification.findMany).mock.calls[0][0];
    expect(arg?.where).toEqual({ userId: "u1" });
    expect(arg?.orderBy).toEqual({ createdAt: "desc" });
  });

  it("markAsRead scopes the update to the user and unread rows", async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({
      count: 1,
    } as never);

    await markAsRead("u1", "n1");

    const arg = vi.mocked(prisma.notification.updateMany).mock.calls[0][0];
    expect(arg?.where).toEqual({ id: "n1", userId: "u1", readAt: null });
    expect(arg?.data).toHaveProperty("readAt");
  });

  it("markAllAsRead scopes to the user's unread rows", async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValueOnce({
      count: 5,
    } as never);

    await markAllAsRead("u1");

    const arg = vi.mocked(prisma.notification.updateMany).mock.calls[0][0];
    expect(arg?.where).toEqual({ userId: "u1", readAt: null });
  });
});