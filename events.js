"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { eventSchema } from "@/app/lib/validators";

// -----------------------------
// Create a new event
// -----------------------------
export async function createEvent(data) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Validate form data
  const validatedData = eventSchema.parse(data);

  // Find the current user in DB
  const user = await db.user.findUnique({
    where: { clerkUserId: userId }, // Prisma now maps to "User"
  });
  if (!user) throw new Error("User not found");

  // Create new event
  const event = await db.event.create({
    data: {
      ...validatedData,
      userId: user.id,
    },
  });

  return event;
}

// -----------------------------
// Get all events for current user
// -----------------------------
export async function getUserEvents() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const events = await db.event.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true } },
    },
  });

  return { events, username: user.username };
}

// -----------------------------
// Delete an event
// -----------------------------
export async function deleteEvent(eventId) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  const event = await db.event.findUnique({
    where: { id: eventId },
  });
  if (!event || event.userId !== user.id) {
    throw new Error("Event not found or unauthorized");
  }

  await db.event.delete({ where: { id: eventId } });
  return { success: true };
}

// -----------------------------
// Get event details by username + eventId
// -----------------------------
export async function getEventDetails(username, eventId) {
  const event = await db.event.findFirst({
    where: {
      id: eventId,
      user: {
        username: username, // relation to "User"
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!event) throw new Error("Event not found");

  return event;
}
