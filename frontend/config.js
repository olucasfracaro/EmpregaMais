const hostLocal = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
export const API_BASE_URL = hostLocal && window.location.port !== "8080"
  ? "http://localhost:8080"
  : (typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
export const SUPABASE_URL = "https://kampbrxrosxtspcmgewr.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthbXBicnhyb3N4dHNwY21nZXdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NjY1NTEsImV4cCI6MjEwMjE0MjU1MX0.A6XPHhwLnqt1SHm1GJtKtNGzFLFLdF94K6ohSKksJcU";
