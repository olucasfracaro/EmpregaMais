import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function uploadCurriculo(file) {
    if (!file) return "";

    const isPdf = file.type === "application/pdf";
    if (!isPdf) {
        throw new Error("Envie o currículo em PDF.");
    }

    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const originalExtension = file.name.includes(".")
        ? file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "")
        : "pdf";
    const extension = originalExtension || "pdf";
    const fileName = `${dateStamp}_${Math.random().toString(36).substring(2, 8)}.${extension}`;

    const { data: uploadData, error } = await supabase.storage
        .from("curriculos")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (error) {
        throw error;
    }

    return uploadData.path;
}

export async function enviarCandidato(payload) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/gerenciar/candidatos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        throw new Error("Não foi possível conectar à API", { cause: error });
    }

    if (!response.ok) {
        let message = `Erro ao cadastrar: ${response.status}`;
        try {
            const body = await response.json();
            message = body.detail || body.message || body.title || message;
        } catch {}
        throw new Error(message);
    }
    return response;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("PainelManeiro");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const Nome = document.getElementById("Nome").value;
        const Telefone = document.getElementById("Telefone").value;
        const Email = document.getElementById("Email").value;
        const Mensagem = document.getElementById("Mensagem").value;
        const Curriculo = document.getElementById("Currículo").files[0];

        try {
            const curriculoPath = await uploadCurriculo(Curriculo);

            const response = await enviarCandidato({
                nome: Nome,
                telefone: Telefone,
                email: Email,
                mensagem: Mensagem,
                curriculo_path: curriculoPath
            });

            alert("Cadastro realizado com sucesso!");
            this.reset();
        } catch (error) {
            console.error(error);
            alert(error.message || "Erro no cadastro");
        }
    });
});
