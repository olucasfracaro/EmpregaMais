function redirecionar() {
    window.location.href = "/principal.html";
}

async function enviarLoginComFallback(payload) {
    const urls = [
        "https://psychic-space-cod-4jj796xvj5fj544-8080.app.github.dev/usuario/login",
        "http://localhost:8080/usuario/login"
    ];

    let lastError;

    for (const url of urls) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.status >= 500) {
                lastError = new Error("Erro no servidor: " + response.status);
                continue;
            }

            return response;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Falha ao enviar login");
}

const usuario = localStorage.getItem("usuarioLogado");
if (usuario) {
    redirecionar();
}

document.getElementById("btEntrar").addEventListener("click", redirecionar());

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("PainelNookie");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const Email = document.getElementById("Email").value;
        const Senha = document.getElementById("Senha").value;

        try {
            const response = await enviarLoginComFallback({
                email: Email,
                senha: Senha
            });

            if (response.status === 403 || response.status === 409) {
                throw new Error("Senha incorreta");
            }
            if (!response.ok) {
                throw new Error("Erro ao fazer login: " + response.status);
            }

            this.reset();
            localStorage.setItem("usuarioLogado", Email);
        } catch (error) {
            console.error(error);
            alert(error.message || "Erro no login");
        }
    });
});