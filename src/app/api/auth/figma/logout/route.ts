import { NextResponse } from "next/server";
import { clearSessionCookie, clearStateCookie } from "@/lib/figma/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response.cookies);
  clearStateCookie(response.cookies);
  return response;
}
