import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing only. Role/session gating happens in server layouts
// (lib/auth/session.requireRole) because it needs the database.
export default createMiddleware(routing);

export const config = {
  // `notes` is excluded: the panic decoy page must load with zero redirects.
  matcher: "/((?!api|_next|_vercel|notes|.*\\..*).*)",
};
