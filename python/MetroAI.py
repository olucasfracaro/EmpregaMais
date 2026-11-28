from __future__ import annotations

import asyncio
import logging
import os
import re
import unicodedata
from io import BytesIO
from pathlib import Path
from typing import List, Optional

from openai import AsyncOpenAI
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from pypdf import PdfReader
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# --- Configuração de Logs ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("MetroAI")

# --- Configuração do ambiente e OpenAI ---
load_dotenv()
CHAVE_API = os.environ.get("OPENAI_API_KEY", "").strip()
MODELO_OPENAI = os.environ.get("OPENAI_MODEL", "gpt-6-luna").strip()


class _RespostasIndisponiveis:
    async def create(self, *_args, **_kwargs):
        raise RuntimeError("OPENAI_API_KEY não configurada.")


class _ClienteIndisponivel:
    """Permite iniciar a API sem segredo configurado; análise falha com clareza."""

    def __init__(self):
        self.responses = _RespostasIndisponiveis()


if CHAVE_API:
    cliente_openai = AsyncOpenAI(api_key=CHAVE_API)
else:
    logger.warning("OPENAI_API_KEY ausente; endpoints de análise retornarão indisponibilidade.")
    cliente_openai = _ClienteIndisponivel()

# Constantes
TAMANHO_MAXIMO_PDF = 10 * 1024 * 1024
TAMANHO_MAXIMO_TEXTO = 30_000
PASTA_CURRICULOS = Path(__file__).resolve().parent / "Portifólios_treino"

HABILIDADES_CONHECIDAS = {
    "Python": ("python",), "Java": ("java",), "JavaScript": ("javascript", "js"),
    "TypeScript": ("typescript",), "SQL": ("sql",), "AWS": ("aws", "amazon web services"),
    "Azure": ("azure",), "Docker": ("docker",), "Kubernetes": ("kubernetes", "k8s"),
    "Git": ("git",), "APIs REST": ("api rest", "apis rest", "restful"),
    "React": ("react",), "Angular": ("angular",), "Spring": ("spring",),
    "Pandas": ("pandas",), "Power BI": ("power bi",), "Excel": ("excel",),
    "Figma": ("figma",), "Scrum": ("scrum",), "Kanban": ("kanban",),
    "Jira": ("jira",), "Machine Learning": ("machine learning", "aprendizado de maquina"),
}

AREAS_CONHECIDAS = {
    "Desenvolvimento de Software": {"Python", "Java", "JavaScript", "TypeScript", "React", "Angular", "Spring", "APIs REST", "Docker"},
    "Análise de Dados": {"Python", "SQL", "Pandas", "Power BI", "Excel", "Machine Learning"},
    "Design de Produto": {"Figma"},
    "Gestão de Projetos": {"Scrum", "Kanban", "Jira"},
}

# --- Configuração de Rate Limiting ---
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="MetroAI — API de Análise de Currículos",
    description="API local para extrair e resumir currículos, com resumo opcional por IA.",
    version="3.0.0",
)

# Adicionando o handler do limitador de requisições no FastAPI
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# --- Modelos Pydantic ---
class AnaliseCurriculoResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    candidato: str = Field(..., alias="Candidato")
    area: str = Field(..., alias="Área")
    habilidades: List[str] = Field(..., alias="Habilidades")
    quantidade_habilidades: int = Field(..., alias="Quantidade de habilidades")
    formacao: List[str] = Field(..., alias="Formação")
    experiencia: List[str] = Field(..., alias="Experiência")
    relatorio: str = Field(..., alias="Relatório")
    criterios_observados: List[str] = Field(..., alias="Critérios observados")
    fonte_resumo: str = Field(..., alias="Fonte do resumo")
    arquivo: str = Field(..., alias="Arquivo")


class RelatoriosLoteResponse(BaseModel):
    total_curriculos: int
    relatorios: List[AnaliseCurriculoResponse]
    arquivos_com_erro: List[str]


# --- Funções Core ---
def extrair_texto(caminho_ou_stream: Path | BytesIO) -> str:
    try:
        reader = PdfReader(caminho_ou_stream)
        return "\n".join((pagina.extract_text() or "") for pagina in reader.pages)
    except Exception as erro:
        logger.error("Falha ao extrair texto do PDF.", exc_info=True)
        raise ValueError("Não foi possível ler a estrutura do arquivo PDF.") from erro


def normalizar(texto: str) -> str:
    return "".join(
        caractere for caractere in unicodedata.normalize("NFD", texto.lower())
        if unicodedata.category(caractere) != "Mn"
    )


def linhas_relevantes(texto: str, termos: tuple[str, ...], limite: int = 3) -> List[str]:
    return [
        linha.strip()[:250] for linha in texto.splitlines()
        if any(termo in normalizar(linha) for termo in termos)
    ][:limite]


def extrair_nome(texto: str, arquivo: str) -> str:
    ignorar = ("curriculo", "currículo", "perfil", "contato", "experiencia", "experiência", "formacao", "formação")
    for linha in texto.splitlines()[:12]:
        candidato = linha.strip()
        if (
            3 <= len(candidato) <= 80 and "@" not in candidato and not any(item in normalizar(candidato) for item in ignorar)
            and len(re.findall(r"[A-Za-zÀ-ÿ]", candidato)) >= 3
        ):
            return candidato
    return Path(arquivo).stem


def extrair_habilidades(texto: str) -> List[str]:
    texto_normalizado = normalizar(texto)
    return [
        habilidade for habilidade, aliases in HABILIDADES_CONHECIDAS.items()
        if any(re.search(rf"(?<!\w){re.escape(alias)}(?!\w)", texto_normalizado) for alias in aliases)
    ]


def identificar_area(habilidades: List[str]) -> str:
    correspondencias = {
        area: len(conjunto.intersection(habilidades)) for area, conjunto in AREAS_CONHECIDAS.items()
    }
    area, quantidade = max(correspondencias.items(), key=lambda item: item[1])
    return area if quantidade else "Não identificada"


def extrair_criterios_observados(texto: str, criterios: Optional[str]) -> List[str]:
    if not criterios:
        return []
    encontrados = []
    texto_normalizado = normalizar(texto)
    for criterio in re.split(r"[,;\n]", criterios):
        criterio = criterio.strip()
        if criterio and normalizar(criterio) in texto_normalizado:
            encontrados.append(f"Evidência encontrada para: {criterio}")
    return encontrados


def analisar_localmente(texto: str, arquivo: str, criterios_revisao: Optional[str] = None) -> dict:
    habilidades = extrair_habilidades(texto)
    candidato = extrair_nome(texto, arquivo)
    area = identificar_area(habilidades)
    formacao = linhas_relevantes(texto, ("graduacao", "graduação", "bacharel", "tecnologo", "tecnólogo", "licenciatura", "mestrado", "doutorado", "formacao", "formação", "universidade", "faculdade"))
    experiencia = linhas_relevantes(texto, ("experiencia", "experiência", "atuou", "trabalhou", "empresa", "cargo", "estagio", "estágio"))
    criterios_observados = extrair_criterios_observados(texto, criterios_revisao)
    partes = [f"{candidato}: perfil com foco em {area.lower()}."]
    if habilidades:
        partes.append(f"Habilidades identificadas: {', '.join(habilidades)}.")
    if formacao:
        partes.append(f"Formação mencionada: {formacao[0]}.")
    if experiencia:
        partes.append(f"Experiência mencionada: {experiencia[0]}.")
    if criterios_revisao and not criterios_observados:
        partes.append("Nenhuma evidência textual foi encontrada para os critérios de revisão informados.")
    return {
        "Candidato": candidato,
        "Área": area,
        "Habilidades": habilidades,
        "Quantidade de habilidades": len(habilidades),
        "Formação": formacao,
        "Experiência": experiencia,
        "Relatório": " ".join(partes),
        "Critérios observados": criterios_observados,
        "Fonte do resumo": "Análise local baseada no texto do currículo.",
        "Arquivo": arquivo,
    }


async def complementar_resumo_com_ia(resumo_local: dict, texto: str) -> str:
    """Mantém a API como opcional, sem avaliar, ranquear ou recomendar pessoas."""
    resposta = await cliente_openai.responses.create(
        model=MODELO_OPENAI,
        input=(
            "Resuma objetivamente o currículo abaixo em até três frases. "
            "Não atribua nota, não compare pessoas e não faça recomendação de contratação.\n\n"
            f"Currículo:\n{texto}"
        ),
        reasoning={"effort": "none"},
        max_output_tokens=180,
    )
    if not getattr(resposta, "output_text", None):
        raise ValueError("A IA retornou uma resposta vazia.")
    return resposta.output_text.strip()


async def analisar_texto(
    texto: str,
    arquivo: str,
    criterios_revisao: Optional[str] = None,
    usar_ia: bool = False,
) -> dict:
    if not texto.strip():
        raise ValueError("O PDF não contém texto para análise.")
    texto = texto[:TAMANHO_MAXIMO_TEXTO]
    analise = analisar_localmente(texto, arquivo, criterios_revisao)
    if not usar_ia:
        return analise
    try:
        analise["Relatório"] = await complementar_resumo_com_ia(analise, texto)
        analise["Fonte do resumo"] = "Análise local com resumo complementar da OpenAI."
    except Exception as e:
        logger.warning("Resumo por IA indisponível para '%s': %s", arquivo, e)
        analise["Fonte do resumo"] = "Análise local; resumo por IA indisponível."
    return analise


async def analisar_curriculo(caminho: Path) -> dict:
    texto = extrair_texto(caminho)
    return await analisar_texto(texto, caminho.name)


# --- Endpoints ---
@app.get("/health", status_code=status.HTTP_200_OK)
async def verificar_saude() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analisar", response_model=AnaliseCurriculoResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def analisar_upload(
    request: Request,
    arquivo: UploadFile = File(...),
    criterios_revisao: Optional[str] = Form(None, description="Critérios separados por vírgula para destacar evidências textuais"),
    usar_ia: bool = Form(False, description="Usa a OpenAI apenas para complementar o resumo quando houver créditos"),
) -> dict:
    
    if not arquivo.filename or Path(arquivo.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Envie um arquivo .pdf.")
    
    conteudo = await arquivo.read(TAMANHO_MAXIMO_PDF + 1)
    if len(conteudo) > TAMANHO_MAXIMO_PDF:
        raise HTTPException(status_code=413, detail="Máximo de 10 MB.")
    
    try:
        texto = extrair_texto(BytesIO(conteudo))
    except ValueError as erro:
        raise HTTPException(status_code=422, detail=str(erro))
    
    if not texto.strip():
        raise HTTPException(status_code=422, detail="PDF sem texto.")
    
    try:
        nome_arquivo = Path(arquivo.filename.replace("\\", "/")).name
        return await analisar_texto(texto, nome_arquivo, criterios_revisao, usar_ia)
    except ValueError as erro:
        raise HTTPException(status_code=422, detail=str(erro)) from erro


@app.get("/relatorios", response_model=RelatoriosLoteResponse, status_code=status.HTTP_200_OK)
@limiter.limit("2/minute")
async def gerar_relatorios(request: Request) -> dict:
    # CORREÇÃO PARA AMBIENTE SERVERLESS:
    # A criação de pasta (mkdir) foi removida, pois sistemas serverless são "Read-Only".
    if not PASTA_CURRICULOS.exists():
        return {
            "total_curriculos": 0,
            "relatorios": [],
            "arquivos_com_erro": []
        }
    
    arquivos_pdf = list(PASTA_CURRICULOS.glob("*.pdf"))
    relatorios = []
    erros = []
    
    resultados = await asyncio.gather(*(analisar_curriculo(c) for c in arquivos_pdf), return_exceptions=True)
    
    for caminho, resultado in zip(arquivos_pdf, resultados):
        if isinstance(resultado, Exception):
            logger.error(f"Erro ao processar lote no arquivo {caminho.name}: {resultado}")
            erros.append(caminho.name)
        else:
            relatorios.append(resultado)
            
    return {
        "total_curriculos": len(relatorios),
        "relatorios": relatorios,
        "arquivos_com_erro": erros,
    }
