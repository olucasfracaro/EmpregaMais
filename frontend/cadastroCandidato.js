import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadCurriculo(file) {
    if (!file) return "";

    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const fileName = `${dateStamp}_${Math.random().toString(36).substring(2, 8)}.pdf`;

    const { data: uploadData, error } = await supabase.storage
        .from("curriculos")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) {
        throw error;
    }

    return uploadData.path;
}

async function enviarCandidatoComFallback(payload) {
    try {
        return await fetch(`${API_BASE_URL}/candidato`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        throw new Error("Não foi possível conectar à API", { cause: error });
    }
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

            const response = await enviarCandidatoComFallback({
                nome: Nome,
                telefone: Telefone,
                email: Email,
                mensagem: Mensagem,
                curriculo_path: curriculoPath
            });

            if (response.status === 403 || response.status === 409) {
                throw new Error("E-mail já cadastrado");
            }
            if (!response.ok) {
                throw new Error("Erro ao cadastrar: " + response.status);
            }

            alert("Cadastro realizado com sucesso!");
            this.reset();
        } catch (error) {
            console.error(error);
            alert(error.message || "Erro no cadastro");
        }
    });
});