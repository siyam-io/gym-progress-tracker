import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ logs: [] });
    }

    const logs = await prisma.bodyWeightLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 60,
    });

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    console.error("GET /api/weight error:", err);
    return NextResponse.json({ error: "Failed to fetch weights" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const { id, weight, unit = "kg", date, note } = body;
    if (!weight || !date) {
      return NextResponse.json({ error: "Weight and date are required" }, { status: 400 });
    }

    const userId = session?.user?.id || null;

    if (!userId) {
      // Unauthenticated, client stores in local Dexie IndexedDB
      return NextResponse.json({ success: true, localOnly: true });
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
        weight: Number(weight),
        unit,
        note: note || null,
      },
      create: {
        id: id || undefined,
        userId,
        weight: Number(weight),
        unit,
        date,
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (err: unknown) {
    console.error("POST /api/weight error:", err);
    return NextResponse.json({ error: "Failed to save weight" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: true, localOnly: true });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing log ID" }, { status: 400 });
    }

    await prisma.bodyWeightLog.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/weight error:", err);
    return NextResponse.json({ error: "Failed to delete weight" }, { status: 500 });
  }
}
