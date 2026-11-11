import { getAdminSession, supabase } from "./auth.js";

async function autenticar(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
    });

    if (error) {
        throw new Error("E-mail ou senha inválidos");
    }

    if (data.user?.app_metadata?.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("Usuário sem permissão de administrador");
    }
}

function redirecionar() {
    window.location.href = "/principal";
}

try {
    if (await getAdminSession()) {
        redirecionar();
    }
} catch (error) {
    console.error("Não foi possível verificar a sessão:", error);
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("PainelNookie");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const Email = document.getElementById("Email").value;
        const Senha = document.getElementById("Senha").value;

        try {
            await autenticar(Email, Senha);

            this.reset();
            redirecionar();
        } catch (error) {
            console.error(error);
            alert(error.message || "Erro no login");
        }
    });
});