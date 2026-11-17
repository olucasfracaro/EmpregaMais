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

async function verificarSessaoSeLoginAtivo() {
    const loginPage = document.querySelector('[data-page="login"]');
    
    if (!loginPage || loginPage.hasAttribute("hidden")) {
        return;
    }

    try {
        if (await getAdminSession()) {
            redirecionar();
        }
    } catch (error) {
        console.error("Não foi possível verificar a sessão:", error);
    }
}

// Configura o formulário 1 (PainelNookie) - site original
const form = document.getElementById("PainelNookie");
if (form) {
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

    try {
        if (await getAdminSession()) {
            redirecionar();
        }
    } catch (error) {
        console.error("Não foi possível verificar a sessão:", error);
    }
}

// Configura o formulário 2 (Metroform) - SPA com data-page="login"
const form2 = document.getElementById("formLogin");
const loginPage = document.querySelector('[data-page="login"]');

if (form2 && loginPage) {
    form2.addEventListener("submit", async function (event) {
        event.preventDefault();

        const Email = document.getElementById("l_email").value;
        const Senha = document.getElementById("l_senha").value;

        try {
            await autenticar(Email, Senha);
            this.reset();
            redirecionar();
        } catch (error) {
            console.error(error);
            alert(error.message || "Erro no login");
        }
    });

    verificarSessaoSeLoginAtivo();

    const observer = new MutationObserver(() => {
        verificarSessaoSeLoginAtivo();
    });

    observer.observe(loginPage, { attributes: true, attributeFilter: ["hidden"] });
}
