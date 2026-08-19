import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.local.js";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function uploadCurriculo(file) {
    if (!file) return "";

    const fileName = `curriculo_${Date.now()}_${file.name.replace(/\s+/g, "_")}`;

    const { data, error } = await supabase.storage
        .from("curriculos")
        .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) {
        throw error;
    }

    return data.path;
}

document.getElementById("PainelManeiro").addEventListener("submit", async function (event) {
    event.preventDefault();

    const Nome = document.getElementById("Nome").value;
    const Telefone = document.getElementById("Telefone").value;
    const Email = document.getElementById("Email").value;
    const Mensagem = document.getElementById("Mensagem").value;
    const Currículo = document.getElementById("Currículo").files[0];

    try {
        const curriculoPath = await uploadCurriculo(Currículo);

        const response = await fetch("https://psychic-space-cod-4jj796xvj5fj544-8080.app.github.dev/candidato", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nome: Nome,
                telefone: Telefone,
                email: Email,
                mensagem: Mensagem,
                curriculo_path: curriculoPath
            })
        });

        if (!response.ok) throw new Error("Erro ao cadastrar");

        alert("Cadastro realizado com sucesso!");
        this.reset();
    } catch (error) {
        console.error(error);
        alert("Erro no cadastro");
    }
});