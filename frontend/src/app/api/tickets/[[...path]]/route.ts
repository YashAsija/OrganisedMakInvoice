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
 * Generic ticket API proxy.
 * Manual proxying ensures the Authorization header (and cookies/content-type)
 * are forwarded verbatim to the FastAPI backend.
 */
async function proxyTicketRequest(request: NextRequest, segments?: string[]) {
  const path = segments && segments.length > 0 ? `/${segments.join("/")}` : "";
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_URL}/api/tickets${path}${url.search}`;

  const proxyHeaders: Record<string, string> = {
    "authorization": request.headers.get("authorization") || "",
    "content-type": request.headers.get("content-type") || "application/json",
    "accept": request.headers.get("accept") || "application/json",
    "user-agent": request.headers.get("user-agent") || "MakInvoices-TicketProxy/1.0",
    "x-forwarded-for": request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
    "x-real-ip": request.headers.get("x-real-ip") || "",
  };

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    proxyHeaders["cookie"] = cookieHeader;
  }

  let body: BodyInit | undefined = undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    try {
      const text = await request.text();
      if (text) body = text;
    } catch {
      // No body
    }
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body,
      redirect: "manual",
      // @ts-ignore
      cache: "no-store",
    });
  } catch (err: any) {
    console.error("[Ticket Proxy] Backend unreachable:", err?.message);
    return NextResponse.json(
      { detail: "Backend server is offline or unreachable." },
      { status: 502 }
    );
  }

  const responseBody = await backendRes.text();

  const response = new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      "content-type": backendRes.headers.get("content-type") || "application/json",
    },
  });

  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyTicketRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyTicketRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyTicketRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params;
  return proxyTicketRequest(request, path);
}
