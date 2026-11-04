package com.empregamais.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.servlet.view.RedirectView;

@Controller
public class PageController {

    @Value("${app.frontend-url:https://empregamais-ten.vercel.app}")
    private String frontendUrl;

    @GetMapping("/login")
    public RedirectView loginPage() {
        return new RedirectView(frontendUrl + "/login");
    }

    @GetMapping("/principal")
    public RedirectView principalPage() {
        return new RedirectView(frontendUrl + "/principal");
    }
}
