import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "connected";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (error) {
    dbStatus = "error";
    console.error("[Health Check] DB Connection Error:", error);
  }

  const totalDuration = Date.now() - startTime;
  const isHealthy = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.round(process.uptime()) : 0,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      durationMs: totalDuration,
      version: "0.1.0",
      environment: process.env.NODE_ENV || "development",
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
