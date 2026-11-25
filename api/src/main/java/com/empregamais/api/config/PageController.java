package com.empregamais.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @Value("${app.frontend-url:https://empregamais-ten.vercel.app}")
    private String frontendUrl;

    private final boolean isLocal;

    public PageController(ApplicationArguments args) {
        this.isLocal = args.containsOption("local");
    }

    @GetMapping("/login")
    public String loginPage() {
        if (isLocal) {
            return "redirect:/#login";
        }
        return "redirect:" + frontendUrl + "/#login";
    }

    @GetMapping("/principal")
    public String principalPage() {
        if (isLocal) {
            return "forward:/principal.html";
        }
        return "redirect:" + frontendUrl + "/principal";
    }

    @GetMapping("/cadastro")
    public String cadastroPage() {
        if (isLocal) {
            return "forward:/cadastro.html";
        }
        return "redirect:" + frontendUrl + "/cadastro";
    }
}
