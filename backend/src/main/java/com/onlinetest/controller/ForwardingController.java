package com.onlinetest.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards any unmapped paths (like React Router paths) to the static index.html.
 */
@Controller
public class ForwardingController {

    @RequestMapping(value = {
            "/{path:[^\\.]*}",
            "/{path:[^\\.]*}/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
