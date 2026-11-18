import { getValidSession, supabase, ROLES } from "./auth.js?v=202611181938";

async function autenticar(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
    });

    if (error) {
        throw new Error("E-mail ou senha inválidos");
    }

    const role = data.session?.user?.app_metadata?.role
        ?? data.session?.user?.user_metadata?.role;

    if (!Object.values(ROLES).includes(role)) {
        await supabase.auth.signOut();
        throw new Error("Usuário sem permissão.");
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
        if (await getValidSession()) {
            redirecionar();
        }
    } catch (error) {
        console.error("Não foi possível verificar a sessão:", error);
    }
}


// Configura o formulário (Metroform) - SPA com data-page="login"
const form = document.getElementById("formLogin");
const loginPage = document.querySelector('[data-page="login"]');

if (form && loginPage) {
    form.addEventListener("submit", async function (event) {
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
