# EmpregaMais - Sistema de Recrutamento Inteligente

<p align="center">
  <img src="https://brasil.un.org/profiles/undg_country/themes/custom/undg/images/SDGs/pt-br/SDG-8.svg" alt="ODS 8" width="180" />
</p>

<p align="center">
  <strong>Automatizando a triagem de talentos para uma contratação mais precisa e eficiente.</strong>
</p>

## Visão geral

Este projeto foi pensado para otimizar o processo de recrutamento e seleção da [Metroform](https://www.metroform.com.br), tornando as contratações mais assertivas, rápidas e alinhadas às necessidades de cada área da empresa.

A proposta central é reduzir a subjetividade na triagem de candidatos e acelerar a análise inicial dos currículos, com suporte de inteligência artificial.

## Problema

A construção civil exige perfis muito diferentes conforme a função e o setor. Quando o RH utiliza processos genéricos para todas as vagas, o risco de contratar profissionais desalinhados aumenta significativamente.

Isso gera:

- retrabalho na etapa de seleção;
- contratações inadequadas;
- perda de tempo na triagem manual;
- menor eficiência do processo de RH.

## Objetivo

Desenvolver uma solução que auxilie na análise de currículos e na avaliação inicial de candidatos, identificando o melhor perfil para cada oportunidade.

## Stack tecnológica

<div align="center">

![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=java&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

</div>

## Deploy conjunto das APIs

O arquivo `docker-compose.yml` sobe a API Spring Boot e a API Python na mesma
rede privada. Somente a porta do Spring Boot fica publicada; ele encaminha o
PDF para o serviço Python e grava o resultado no banco. O PostgreSQL/Supabase
continua sendo um serviço externo.

1. Copie `.env.example` para `.env` e preencha as credenciais do banco Supabase,
   além do usuário e senha do Swagger.
2. Rode `docker compose up --build -d` na raiz do repositório.
3. A API Spring fica disponível em `http://localhost:8080` por padrão. O
   endpoint `/health` verifica o Spring; `/health` na rede interna verifica o
   serviço Python.
4. Em produção, publique a porta configurada por `API_PORT` atrás de um proxy
   HTTPS. Configure `FRONTEND_URL` e `CORS_ALLOWED_ORIGINS` com o domínio real
   do frontend.
5. Para manter o frontend na Vercel, defina `VERCEL_API_URL` com a URL HTTPS
   pública do Spring durante o build da Vercel. A API Python não precisa de uma
   URL pública: o Spring a acessa pelo nome interno `python-api`.

`OPENAI_API_KEY` é opcional. Sem essa chave, a API Python ainda faz a análise
local do texto do PDF e informa a origem do resultado.

## Deploy do frontend na Vercel

A Vercel hospeda o frontend estático em `frontend/`. As APIs podem ser
publicadas juntas com Docker Compose em uma VM; nesse caso, somente a API Spring
precisa de um endereço público, pois ela chama a API Python pela rede privada.

1. Importe este repositório na Vercel.
2. Configure `VERCEL_API_URL` com a URL pública da API, sem a barra final.
3. Configure `SUPABASE_ANON_KEY` nas variáveis de ambiente da Vercel. O valor
   de `SUPABASE_URL` pode ser mantido no padrão do projeto ou configurado
   explicitamente.
4. Na hospedagem das APIs, configure as variáveis `SUPABASE_DB_*`,
   `SWAGGER_USERNAME` e `SWAGGER_PASSWORD`. O Compose lê `API_PORT` (padrão
   `8080`) para publicar o Spring.

O build da Vercel gera `frontend/config.js` com essas configurações. A API
precisa permitir requisições CORS originadas pelo domínio publicado na Vercel.

## Fluxo da solução

1. O sistema cadastra candidatos e currículos.
2. Na ficha do candidato em Gerenciar, a ação **Analisar currículo** solicita a
   análise ao Spring Boot.
3. O Spring baixa o PDF público do bucket Supabase, envia-o para `POST /analisar`
   na API Python e persiste o resultado em `analise_curriculo`.
4. A tela Acompanhar consulta `GET /acompanhar/analises` e mostra o resultado,
   status e datas da execução.

## Benefícios esperados

- maior agilidade na triagem inicial;
- melhor adequação entre candidato e vaga;
- redução de erros e subjetividade;
- apoio na tomada de decisão do RH;
- melhoria na eficiência do processo seletivo.

## Impacto

A solução busca transformar o recrutamento em um processo mais inteligente, escalável e estratégico, permitindo que a empresa contrate pessoas mais adequadas para cada área e fortaleça sua performance operacional.

## ODS

> 8.2 Atingir níveis mais elevados de produtividade das economias por meio da diversificação, modernização tecnológica e inovação, inclusive por meio de um foco em setores de alto valor agregado e dos setores intensivos em mão de obra.

###### Sistema feito por Lucas M.F, Rafael M.P, Italo T.A e Lucas F.O.
