import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedEventName,
  trackAnalyticsEvent,
} from "@/lib/analytics";
import { geoFromRequestHeaders } from "@/lib/geo";

export const dynamic = "force-dynamic";

/** Public, allowlisted event collector for the sale page. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      artwork_id?: string | null;
      meta?: Record<string, unknown>;
    };

    if (!body.name || !isAllowedEventName(body.name)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    // payment_succeeded is server-only (Stripe webhook)
    if (body.name === "payment_succeeded") {
      return NextResponse.json({ error: "Forbidden event" }, { status: 403 });
    }

    const geo = geoFromRequestHeaders(request.headers);
    const meta: Record<string, unknown> = {
      ...(body.meta ?? {}),
      ...geo,
    };

    await trackAnalyticsEvent({
      name: body.name,
      artwork_id: body.artwork_id,
      meta,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/analytics/collect", error);
    return NextResponse.json({ error: "Track failed" }, { status: 500 });
  }
}
