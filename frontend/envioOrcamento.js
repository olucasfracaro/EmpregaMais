import { API_BASE_URL } from "./config.js";

export async function enviarOrcamento(solicitacao) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/comercial/orcamentos/solicitacao`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(solicitacao)
        });
    } catch (error) {
        throw new Error("Não foi possível conectar à API", { cause: error });
    }

    if (!response.ok) {
        let message = `Erro ao solicitar orçamento: ${response.status}`;
        try {
            const body = await response.json();
            message = body.detail || body.message || body.title || message;
        } catch {}
        throw new Error(message);
    }
    return await response.json();
}
