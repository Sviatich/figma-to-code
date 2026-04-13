import { NextResponse } from "next/server";
import { readFigmaSnapshot } from "@/lib/figma/snapshots";

export async function GET(_request: Request, context: RouteContext<"/api/figma/snapshots/[snapshotId]">) {
  try {
    const { snapshotId } = await context.params;
    const snapshot = await readFigmaSnapshot(snapshotId);

    return new NextResponse(snapshot.content, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `inline; filename="${snapshotId}.json"`,
        "x-transfig-snapshot-path": snapshot.snapshotPath,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Не удалось открыть сохраненный снимок Figma.",
      },
      { status: 404 },
    );
  }
}
