import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { SyncBatchRequestSchema } from "@/lib/validations/sync-schema";
import {
  resolveDbUserId,
  fetchUserSyncData,
  processServerMutations,
} from "@/lib/server/services/sync-service";

/**
 * GET /api/workouts/sync
 * Pull all cloud records for the authenticated user for bi-directional synchronization.
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = await resolveDbUserId(session?.user?.id, session?.user?.email);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to sync." },
        { status: 401 }
      );
    }

    const syncData = await fetchUserSyncData(userId);

    return NextResponse.json({
      success: true,
      ...syncData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Sync GET Route] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workouts/sync
 * Ingest batched mutations (UPSERT/DELETE) from client offline outbox into PostgreSQL.
 */
export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, "sync-post", { limit: 120, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many sync requests. Please retry in a moment." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(rateLimit.resetTime / 1000).toString(),
        },
      }
    );
  }

  try {
    const session = await auth();
    const authenticatedUserId = await resolveDbUserId(session?.user?.id, session?.user?.email);

    const rawBody = await req.json();
    const parseResult = SyncBatchRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid sync batch payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { syncedIds, errors } = await processServerMutations(
      parseResult.data.mutations,
      authenticatedUserId
    );

    return NextResponse.json({
      success: true,
      syncedIds,
      errors: errors.length > 0 ? errors : undefined,
      processedCount: syncedIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Sync POST Route] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
