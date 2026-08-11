import { auth } from "@/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  
  const isProtectedRoute = path.startsWith('/dashboard') || path.startsWith('/onboarding');

  // Only check if they are logged in.
  // The Next.js layouts (app/(dashboard)/layout.tsx) handle the onboarding redirects 
  // by checking the actual database, preventing infinite redirect loops caused by stale JWTs.
  if (!isLoggedIn && isProtectedRoute) {
    return Response.redirect(new URL('/', req.nextUrl));
  }
})

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
