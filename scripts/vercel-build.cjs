const fs = require("node:fs");
const path = require("node:path");

const config = {
  apiBaseUrl: process.env.VERCEL_API_URL || process.env.API_BASE_URL || "",
  supabaseUrl: process.env.SUPABASE_URL || "https://kampbrxrosxtspcmgewr.supabase.co",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
};

const configPath = path.join(__dirname, "..", "frontend", "config.js");
const source = `export const API_BASE_URL = ${JSON.stringify(config.apiBaseUrl.replace(/\/$/, ""))};
export const SUPABASE_URL = ${JSON.stringify(config.supabaseUrl)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(config.supabaseAnonKey)};
`;

fs.writeFileSync(configPath, source);
