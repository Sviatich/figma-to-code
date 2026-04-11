import { NextResponse } from "next/server";
import { buildFigmaAuthorizeUrl, writeStateCookie } from "@/lib/figma/auth";

export async function GET() {
  const { url, state } = buildFigmaAuthorizeUrl();
  const response = NextResponse.redirect(url);
  writeStateCookie(response.cookies, state);
  return response;
}
