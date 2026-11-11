import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getAdminSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = data.session;
    if (!session || session.user?.app_metadata?.role !== "admin") {
        return null;
    }

    return session;
}

export async function requireAdminSession() {
    const session = await getAdminSession();
    if (!session) {
        await supabase.auth.signOut();
        window.location.replace("/login");
        throw new Error("Sessão administrativa inválida");
    }
    return session;
}

export async function authenticatedFetch(url, options = {}) {
    const session = await requireAdminSession();
    const headers = new Headers(options.headers);
    headers.set("Authorization", "Bearer " + session.access_token);
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    return fetch(url, { ...options, headers });
}
