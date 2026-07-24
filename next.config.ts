import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // server-only packages that must not be bundled
  serverExternalPackages: ["@electric-sql/pglite", "pg", "bullmq", "ioredis", "twilio"],
};

export default withNextIntl(nextConfig);
