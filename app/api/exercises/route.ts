import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExerciseCategory } from "@prisma/client";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { apiSuccess, apiError } from "@/lib/security/api-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate limiting: 60 requests per minute
  const rateLimit = checkRateLimit(req, "exercises-get", { limit: 60, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return apiError("Rate limit exceeded. Please slow down.", 429, undefined, rateLimit);
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const muscle = searchParams.get("muscle")?.trim();
    const category = searchParams.get("category")?.trim();
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get("limit") || "1000", 10)));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { primaryMuscle: { contains: search, mode: "insensitive" } },
      ];
    }

    if (muscle && muscle !== "All") {
      where.primaryMuscle = { equals: muscle, mode: "insensitive" };
    }

    if (
      category &&
      category !== "ALL" &&
      Object.values(ExerciseCategory).includes(category as ExerciseCategory)
    ) {
      where.category = category as ExerciseCategory;
    }

    const [totalCount, exercises] = await Promise.all([
      prisma.exercise.count({ where }),
      prisma.exercise.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
      }),
    ]);

    return apiSuccess(
      {
        count: exercises.length,
        total: totalCount,
        limit,
        offset,
        exercises,
      },
      { rateLimit }
    );
  } catch (error) {
    console.error("[Exercises API Error]:", error);
    return apiError("Failed to fetch exercises", 500, undefined, rateLimit);
  }
}
