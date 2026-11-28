package com.empregamais.api.Analise;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.empregamais.api.Candidato.Candidato;
import com.empregamais.api.Candidato.CandidatoService;

@Service
public class AnaliseCurriculoService {

    private static final int MAX_PDF_BYTES = 10 * 1024 * 1024;
    private static final String MODEL_NAME = "MetroAI";

    private final CandidatoService candidatoService;
    private final AnaliseService analiseService;
    private final RestClient restClient;
    private final String supabaseUrl;
    private final String pythonApiUrl;

    public AnaliseCurriculoService(
        CandidatoService candidatoService,
        AnaliseService analiseService,
        @Value("${supabase.url}") String supabaseUrl,
        @Value("${app.python-api-url:http://localhost:8000}") String pythonApiUrl
    ) {
        this.candidatoService = candidatoService;
        this.analiseService = analiseService;
        this.supabaseUrl = supabaseUrl.replaceAll("/+$", "");
        this.pythonApiUrl = pythonApiUrl.replaceAll("/+$", "");
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(8));
        requestFactory.setReadTimeout(Duration.ofMinutes(2));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public Analise analisarCandidato(Long candidatoId) {
        Candidato candidato = candidatoService.buscarCandidatoPorId(candidatoId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Candidato não encontrado."));
        String caminhoCurriculo = candidato.getCurriculoPath();
        if (!StringUtils.hasText(caminhoCurriculo)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Este candidato não possui currículo cadastrado.");
        }
        URI uriArquivo = uriCurriculo(caminhoCurriculo);
        String nomeArquivo = nomeArquivo(uriArquivo.getPath());
        if (!nomeArquivo.toLowerCase().endsWith(".pdf")) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "O currículo cadastrado não é um PDF.");
        }

        Analise analise = new Analise();
        analise.setCandidatoId(candidatoId);
        analise.setStatus("EM_ANDAMENTO");
        analise.setResultado(Map.of());
        analise.setModelo(MODEL_NAME);
        analise = analiseService.criarAnalise(analise);

        try {
            byte[] pdf = baixarCurriculo(uriArquivo);
            Map<String, Object> resultado = solicitarAnalise(pdf, nomeArquivo);
            analise.setResultado(resultado);
            analise.setStatus("CONCLUIDA");
        } catch (RestClientResponseException erro) {
            analise.setStatus("FALHA");
            analise.setErro("Um dos serviços de currículo respondeu com HTTP " + erro.getStatusCode().value() + ".");
        } catch (ResponseStatusException erro) {
            analise.setStatus("FALHA");
            analise.setErro(erro.getReason());
        } catch (Exception erro) {
            analise.setStatus("FALHA");
            analise.setErro("Não foi possível concluir a análise. Verifique a conexão com o serviço de currículos.");
        }

        analise.setFinishedAt(OffsetDateTime.now());
        return analiseService.atualizarAnalise(analise);
    }

    private byte[] baixarCurriculo(URI uri) {
        byte[] conteudo = restClient.get().uri(uri).retrieve().body(byte[].class);
        if (conteudo == null || conteudo.length == 0) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "O arquivo do currículo está vazio.");
        }
        if (conteudo.length > MAX_PDF_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "O currículo excede o limite de 10 MB da API Python.");
        }
        return conteudo;
    }

    private Map<String, Object> solicitarAnalise(byte[] pdf, String nomeArquivo) {
        ByteArrayResource arquivo = new ByteArrayResource(pdf) {
            @Override
            public String getFilename() {
                return nomeArquivo;
            }
        };
        MultipartBodyBuilder multipart = new MultipartBodyBuilder();
        multipart.part("arquivo", arquivo).filename(nomeArquivo).contentType(MediaType.APPLICATION_PDF);
        Map<String, Object> resultado = restClient.post()
            .uri(pythonApiUrl + "/analisar")
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(multipart.build())
            .retrieve()
            .body(new ParameterizedTypeReference<>() {});
        if (resultado == null || resultado.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "A API Python retornou um resultado vazio.");
        }
        return new LinkedHashMap<>(resultado);
    }

    private URI uriCurriculo(String caminhoOriginal) {
        String caminho = caminhoOriginal.trim();
        if (caminho.startsWith("http://") || caminho.startsWith("https://")) {
            URI fornecida;
            try {
                fornecida = URI.create(caminho);
            } catch (IllegalArgumentException erro) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "O endereço do currículo não é válido.");
            }
            URI base = URI.create(supabaseUrl);
            if (!base.getHost().equalsIgnoreCase(fornecida.getHost())
                || !base.getScheme().equalsIgnoreCase(fornecida.getScheme())
                || base.getPort() != fornecida.getPort()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "O currículo não pertence ao armazenamento configurado.");
            }
            String marcador = "/storage/v1/object/public/curriculos/";
            String caminhoUrl = fornecida.getPath();
            if (!caminhoUrl.startsWith(marcador)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "O endereço do currículo não é válido.");
            }
            caminho = caminhoUrl.substring(marcador.length());
        }

        caminho = caminho.replace('\\', '/').replaceFirst("^/+", "");
        caminho = caminho.replaceFirst("(?i)^public/curriculos/", "").replaceFirst("(?i)^curriculos/", "");
        String[] partes = caminho.split("/");
        if (partes.length == 0 || caminho.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "O caminho do currículo está vazio.");
        }
        for (String parte : partes) {
            if (parte.isBlank() || parte.equals(".") || parte.equals("..")) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "O caminho do currículo não é válido.");
            }
        }
        String caminhoCodificado = java.util.Arrays.stream(partes)
            .map(parte -> UriUtils.encodePathSegment(parte, StandardCharsets.UTF_8))
            .collect(java.util.stream.Collectors.joining("/"));
        return URI.create(supabaseUrl + "/storage/v1/object/public/curriculos/" + caminhoCodificado);
    }

    private String nomeArquivo(String caminho) {
        String nome = caminho.replace('\\', '/');
        int indice = nome.lastIndexOf('/');
        nome = indice >= 0 ? nome.substring(indice + 1) : nome;
        return nome;
    }
}
