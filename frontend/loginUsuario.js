import { API_BASE_URL } from "./config.js";

function redirecionar() {
    window.location.href = "/principal";
}

if (sessionStorage.getItem("usuarioLogado")) {
    redirecionar();
}

localStorage.removeItem("usuarioLogado");

async function enviarLoginComFallback(payload) {
    try {
        return await fetch(`${API_BASE_URL}/usuario/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        throw new Error("Não foi possível conectar à API", { cause: error });
    }
}

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
            sessionStorage.setItem("usuarioLogado", Email);
            redirecionar();
        } catch (error) {
            console.error(error);
            alert(error.message || "Erro no login");
        }
    });
});