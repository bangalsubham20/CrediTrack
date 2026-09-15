package com.creditrack.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> home() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Welcome to CrediTrack API");
        response.put("status", "Running");
        response.put("documentation", "See /api/auth/register to start");
        return ResponseEntity.ok(response);
    }
}
