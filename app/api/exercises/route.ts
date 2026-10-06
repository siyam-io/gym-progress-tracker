import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExerciseCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const muscle = searchParams.get("muscle")?.trim();
    const category = searchParams.get("category")?.trim();

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

    if (category && category !== "ALL" && Object.values(ExerciseCategory).includes(category as ExerciseCategory)) {
      where.category = category as ExerciseCategory;
    }

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: { name: "asc" },
      take: 1000,
    });

    return NextResponse.json({
      success: true,
      count: exercises.length,
      exercises,
    });
  } catch (error) {
    console.error("[Exercises API Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch exercises" },
      { status: 500 }
    );
  }
}
