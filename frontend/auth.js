import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const ROLES = {
    ADMIN: "admin",
    GESTOR: "gestor",
    MONITOR: "monitor",
    COMERCIAL: "comercial",
    RH: "rh"
};


export async function getValidSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    let session = data.session;
    if (session?.expires_at && session.expires_at * 1000 <= Date.now() + 60_000) {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.error) throw refreshed.error;
        session = refreshed.data.session;
    }

    if (!session) return null;

    const role = session?.user?.app_metadata?.role
        ?? session?.user?.user_metadata?.role;
    if (!Object.values(ROLES).includes(role)) {
        return null;
    }

    return session;
}

export async function requireValidSession() {
    const session = await getValidSession();
    if (!session) {
        await supabase.auth.signOut();
        window.location.replace("/login");
        throw new Error("Sessão administrativa inválida");
    }
    return session;
}

export async function authenticatedFetch(url, options = {}) {
    async function fetchWithSession(session) {
        const headers = new Headers(options.headers);
        headers.set("Authorization", "Bearer " + session.access_token);
        if (options.body && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
        return fetch(url, { ...options, headers });
    }

    const session = await requireValidSession();
    let response = await fetchWithSession(session);

    if (response.status === 401) {
        const refreshed = await supabase.auth.refreshSession();
        if (!refreshed.error && refreshed.data.session) {
            response = await fetchWithSession(refreshed.data.session);
        }
    }

    return response;
}
