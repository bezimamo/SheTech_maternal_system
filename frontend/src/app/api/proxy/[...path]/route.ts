import { NextRequest, NextResponse } from "next/server"

function resolveBackendBase(): string {
  if (process.env.BACKEND_BASE_URL) {
    const base = process.env.BACKEND_BASE_URL.replace(/\/$/, "")
    return base.endsWith("/api") ? base : `${base}/api`
  }
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
  if (raw) {
    const base = raw.replace(/\/$/, "")
    return base.endsWith("/api") ? base : `${base}/api`
  }
  return "http://127.0.0.1:3001/api"
}

const BACKEND_BASE = resolveBackendBase()
const COOKIE_NAME = "sms_token"

export const dynamic = "force-dynamic"

/** Extract the JWT from the Authorization header or the sms_token cookie. */
function resolveToken(req: NextRequest): string | undefined {
  // 1. Prefer explicit Authorization header (set by client-side fetch / axios)
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  // 2. Fall back to the cookie set by the login route (covers SSR / page-reload)
  const cookie = req.cookies.get(COOKIE_NAME)
  if (cookie?.value) return cookie.value

  // 3. Also check raw cookie header for environments where cookies.get() may miss it
  const rawCookie = req.headers.get("cookie")
  if (rawCookie) {
    const prefix = `${COOKIE_NAME}=`
    for (const part of rawCookie.split(";").map(s => s.trim())) {
      if (part.startsWith(prefix)) {
        try { return decodeURIComponent(part.slice(prefix.length)) }
        catch { return part.slice(prefix.length) }
      }
    }
  }

  return undefined
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params
  const joinedPath = path.join("/")
  const targetUrl = `${BACKEND_BASE}/${joinedPath}${req.nextUrl.search}`

  const isPublic = joinedPath === "auth/login" || joinedPath === "auth/register"

  const token = resolveToken(req)

  if (!token && !isPublic) {
    console.warn(`[PROXY] ❌ No token for: ${joinedPath}`)
    return NextResponse.json({ message: "Unauthorized - missing token" }, { status: 401 })
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[PROXY] ${req.method} ${joinedPath} — token: ${token ? "✓" : "✗"}`)
  }

  const headers = new Headers()
  const originalContentType = req.headers.get("content-type")
  if (originalContentType) {
    headers.set("Content-Type", originalContentType)
  } else {
    headers.set("Content-Type", "application/json")
  }
  
  if (token) headers.set("Authorization", `Bearer ${token}`)

  if (process.env.NODE_ENV === "development") {
    console.log(`[PROXY] Forwarding ${req.method} to ${targetUrl}`)
  }

  const performFetch = async (url: string) => {
    return fetch(url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer(),
      redirect: "manual",
    })
  }

  try {
    let upstream: Response
    try {
      upstream = await performFetch(targetUrl)
    } catch (error: any) {
      const code = error?.cause?.code ?? error?.code
      // If we failed to reach the configured URL and we are in development, 
      // try falling back to 127.0.0.1 as a last resort.
      const fallbacks = [
        targetUrl.replace(/https?:\/\/[^/]+/, "http://127.0.0.1:3001"),
        targetUrl.replace(/https?:\/\/[^/]+/, "http://localhost:3001"),
      ]
      let lastErr = error
      for (const fallbackUrl of fallbacks) {
        if (fallbackUrl === targetUrl) continue
        try {
          console.warn(`[PROXY] Connection refused to ${targetUrl}. Trying ${fallbackUrl}`)
          upstream = await performFetch(fallbackUrl)
          lastErr = null
          break
        } catch (e) {
          lastErr = e
        }
      }
      if (lastErr) throw lastErr
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`[PROXY] ← Backend responded with ${upstream.status}`)
    }

    const resHeaders = new Headers(upstream.headers)
    resHeaders.delete("set-cookie")
    resHeaders.delete("content-encoding")

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    })
  } catch (error: any) {
    const code = error?.cause?.code ?? error?.code
    console.error(`[PROXY] ❌ Connection error to ${targetUrl}:`, code || error.message)
    
    const message =
      code === "ECONNREFUSED" || code === "ETIMEDOUT"
        ? "Backend service is unavailable. Start the API with: cd backend && npm run start:dev"
        : `Failed to reach backend service (${code || "Unknown error"})`

    return NextResponse.json(
      { message, code, backend: BACKEND_BASE },
      { status: 502 },
    )
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
