package com.example.app.controller;

import com.example.app.dto.*;
import com.example.app.service.QuarterlyReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class QuarterlyReportController {
    private final QuarterlyReportService service;

    @PostMapping
    public ResponseEntity<QuarterlyReportDto> create(@Valid @RequestBody CreateQuarterlyReportDto dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuarterlyReportDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<QuarterlyReportDto>> list() {
        return ResponseEntity.ok(service.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuarterlyReportDto> update(@PathVariable Long id, @Valid @RequestBody CreateQuarterlyReportDto dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
