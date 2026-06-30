import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/gate") || req.nextUrl.pathname.startsWith("/api/gate")) return NextResponse.next();
  if (req.cookies.get("app_auth")?.value === pw) return NextResponse.next();
  return NextResponse.redirect(new URL("/gate", req.url));
}

export const config = { matcher: ["/((?!_next|favicon).*)"] };
