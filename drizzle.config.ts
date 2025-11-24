import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",   
  out: "./drizzle",
  dialect: "postgresql",          // ✅ यह डालना ज़रूरी है
  dbCredentials: {
    url: process.env.DATABASE_URL!,  // ✅ .env से Neon URL लाएगा
  },
} satisfies Config;

