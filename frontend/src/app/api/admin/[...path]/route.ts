import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = () => {
  const raw = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `https://${raw}`;
};

const BACKEND_URL = getBackendUrl();

/**
 * Generic admin API proxy.
 *
 * Next.js `rewrites()` in next.config.ts does NOT forward the Cookie header
 * to the backend. This means the `admin_session` HttpOnly cookie is never
 * sent, so every admin endpoint returns 404 (unauthenticated).
 *
 * This catch-all route handler manually forwards:
 *  - Request cookies → backend
 *  - Response Set-Cookie headers → client
 *
 * It handles all HTTP methods so the full admin REST surface works.
 */
async function proxyAdminRequest(request: NextRequest, segments: string[]) {
  const path = segments.join("/");
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_URL}/api/admin/${path}${url.search}`;

  // Forward all incoming cookies verbatim
  const cookieHeader = request.headers.get("cookie") || "";

  // Build proxied request headers
  const proxyHeaders: Record<string, string> = {
    "content-type": request.headers.get("content-type") || "application/json",
    "accept": request.headers.get("accept") || "application/json",
    "user-agent": request.headers.get("user-agent") || "MakInvoices-AdminProxy/1.0",
    "x-forwarded-for": request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
    "x-real-ip": request.headers.get("x-real-ip") || "",
  };

  if (cookieHeader) {
    proxyHeaders["cookie"] = cookieHeader;
  }

  // Read request body for mutation methods
  let body: BodyInit | undefined = undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    try {
      const text = await request.text();
      if (text) body = text;
    } catch {
      // No body — fine
    }
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body,
      // Do NOT follow redirects automatically — pass them through
      redirect: "manual",
      // @ts-ignore — Node fetch cache control
      cache: "no-store",
    });
  } catch (err: any) {
    console.error("[Admin Proxy] Backend unreachable:", err?.message);
    return NextResponse.json(
      { detail: "Backend server is offline or unreachable." },
      { status: 502 }
    );
  }

  // Read response body
  const responseBody = await backendRes.text();

  // Build the NextResponse, propagating the status code
  const response = new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      "content-type": backendRes.headers.get("content-type") || "application/json",
    },
  });

  // Forward any Set-Cookie headers from backend → client
  // This is critical for the login endpoint that sets admin_session
  backendRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("set-cookie", value);
    }
  });

  return response;
}

// Export handlers for all relevant HTTP methods
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyAdminRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyAdminRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyAdminRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyAdminRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyAdminRequest(request, path);
}
