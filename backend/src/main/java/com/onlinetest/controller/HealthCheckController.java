package com.onlinetest.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class HealthCheckController{

  @GetMapping("/health")
  public String healthCheck(){
    return "OK";
  }
}