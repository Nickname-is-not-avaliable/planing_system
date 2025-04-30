// src/main/java/com/example/app/controller/DocumentController.java
package com.example.app.controller;

import com.example.app.dto.CreateDocumentDto;
import com.example.app.dto.DocumentDto;
import com.example.app.service.DocumentService;
import com.example.app.service.FileService; 
import jakarta.persistence.EntityNotFoundException; 
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger; 
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource; 
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType; 
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final FileService fileService; 

    private static final Logger logger = LoggerFactory.getLogger(DocumentController.class);

    @PostMapping
    public ResponseEntity<DocumentDto> create(@Valid @RequestBody CreateDocumentDto dto) {
        return ResponseEntity.ok(documentService.create(dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<DocumentDto>> getAll() {
        return ResponseEntity.ok(documentService.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<DocumentDto> update(@PathVariable Long id,
                                              @Valid @RequestBody CreateDocumentDto dto) {
        return ResponseEntity.ok(documentService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<Resource> downloadDocumentFile(@PathVariable Long documentId) {
        try {
            DocumentDto documentDto = documentService.getById(documentId);

            String storedFilenameOrPath = documentDto.filePath();
            if (storedFilenameOrPath == null || storedFilenameOrPath.isEmpty()) {
                 logger.error("File path is missing for document id: {}", documentId);
                 return ResponseEntity.notFound().build();
            }
            String filenameToDownload = new File(storedFilenameOrPath).getName();

            return fileService.downloadFile(filenameToDownload)
                    .map(resource -> ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + documentDto.filename() + "\"")
                            .contentType(MediaType.APPLICATION_OCTET_STREAM)
                            .body(resource))
                    .orElseGet(() -> {
                        logger.warn("File resource not found by FileService for filename: {} (documentId: {})", filenameToDownload, documentId);
                        return ResponseEntity.notFound().build();
                    });

        } catch (EntityNotFoundException e) {
            logger.warn("Document not found when trying to download file for id: {}", documentId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error downloading file for document {}: {}", documentId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}