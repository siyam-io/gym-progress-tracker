import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { apiSuccess, apiError } from "@/lib/security/api-response";

const CreateWeightLogSchema = z.object({
  id: z.string().optional(),
  weight: z.number().positive().max(500),
  unit: z.enum(["kg", "lbs"]).default("kg"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  note: z.string().max(250).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const rateLimit = checkRateLimit(req, "weight-get", { limit: 60, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError("Too many requests", 429, undefined, rateLimit);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiSuccess({ logs: [] }, { rateLimit });
    }

    const logs = await prisma.bodyWeightLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 60,
    });

    return apiSuccess({ logs }, { rateLimit });
  } catch (err: unknown) {
    console.error("GET /api/weight error:", err);
    return apiError("Failed to fetch weights", 500, undefined, rateLimit);
  }
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, "weight-post", { limit: 30, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError("Too many requests", 429, undefined, rateLimit);
  }

  try {
    const session = await auth();
    const rawBody = await req.json();

    const parseResult = CreateWeightLogSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return apiError(
        "Invalid weight log payload",
        400,
        parseResult.error.flatten(),
        rateLimit
      );
    }

    const { id, weight, unit, date, note } = parseResult.data;
    const userId = session?.user?.id || null;

    if (!userId) {
      // Unauthenticated, client stores in local Dexie IndexedDB
      return apiSuccess({ localOnly: true }, { rateLimit });
    }

    // Upsert by userId + date
    const log = await prisma.bodyWeightLog.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      update: {
        weight,
        unit,
        note: note || null,
      },
      create: {
        id: id || undefined,
        userId,
        weight,
        unit,
        date,
        note: note || null,
      },
    });

    return apiSuccess({ log }, { rateLimit });
  } catch (err: unknown) {
    console.error("POST /api/weight error:", err);
    return apiError("Failed to save weight", 500, undefined, rateLimit);
  }
}

export async function DELETE(req: NextRequest) {
  const rateLimit = checkRateLimit(req, "weight-delete", { limit: 30, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError("Too many requests", 429, undefined, rateLimit);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiSuccess({ localOnly: true }, { rateLimit });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return apiError("Missing log ID", 400, undefined, rateLimit);
    }

    await prisma.bodyWeightLog.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return apiSuccess({ deleted: true }, { rateLimit });
  } catch (err: unknown) {
    console.error("DELETE /api/weight error:", err);
    return apiError("Failed to delete weight", 500, undefined, rateLimit);
  }
}
