// src/main/java/com/example/app/service/DocumentService.java
package com.example.app.service;

import com.example.app.dto.DocumentDto;
import com.example.app.dto.CreateDocumentDto;
import com.example.app.entity.Document;
import com.example.app.entity.QuarterlyReport;
import com.example.app.entity.User;
import com.example.app.repository.DocumentRepository;
import com.example.app.repository.QuarterlyReportRepository;
import com.example.app.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory; 
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final QuarterlyReportRepository reportRepository;
    private final UserRepository userRepository;             

    private static final Logger logger = LoggerFactory.getLogger(DocumentService.class);

    @Transactional
    public DocumentDto create(CreateDocumentDto dto) {
        logger.info("Attempting to create document with reportId: {}, uploadedById: {}", dto.reportId(), dto.uploadedByUserId());

        if (dto.reportId() == null) {
            logger.error("Error creating document: reportId is null");
            throw new IllegalArgumentException("Report ID must not be null");
        }
        if (dto.uploadedByUserId() == null) {
            logger.error("Error creating document: uploadedByUserId is null");
            throw new IllegalArgumentException("Uploaded User ID must not be null");
        }

        QuarterlyReport report = reportRepository.findById(Math.toIntExact(dto.reportId()))
                .orElseThrow(() -> {
                     logger.error("Report not found with id: {}", dto.reportId());
                     return new EntityNotFoundException("Report not found with id " + dto.reportId());
                });

        User user = userRepository.findById(dto.uploadedByUserId())
                .orElseThrow(() -> {
                    logger.error("User not found with id: {}", dto.uploadedByUserId());
                    return new EntityNotFoundException("User not found with id " + dto.uploadedByUserId());
                });

        logger.info("Found Report: {}, Found User: {}", report.getId(), user.getId());

        Document document = Document.builder()
                .report(report)
                .uploadedByUser(user)
                .filename(dto.filename())
                .filePath(dto.filePath())
                .build();

        try {
            Document saved = documentRepository.save(document);
            logger.info("Successfully saved document with id: {}", saved.getId());
            return toDto(saved);
        } catch (Exception e) {
            logger.error("Error saving document to repository", e);
            throw new RuntimeException("Failed to save document", e);
        }
    }

    public DocumentDto getById(Long id) { 
         if (id == null) {
            throw new IllegalArgumentException("Document ID must not be null");
         }
        Document document = documentRepository.findById(Math.toIntExact(id))
                .orElseThrow(() -> new EntityNotFoundException("Document not found with id " + id));
        return toDto(document);
    }

    public List<DocumentDto> getAll() {
        return documentRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional 
    public DocumentDto update(Long id, CreateDocumentDto dto) {
        if (id == null) { throw new IllegalArgumentException("Document ID for update must not be null"); }
        if (dto.reportId() == null) { throw new IllegalArgumentException("Report ID must not be null"); }
        if (dto.uploadedByUserId() == null) { throw new IllegalArgumentException("Uploaded User ID must not be null"); }

        Document document = documentRepository.findById(Math.toIntExact(id))
                .orElseThrow(() -> new EntityNotFoundException("Document not found with id " + id));
        QuarterlyReport report = reportRepository.findById(Math.toIntExact(dto.reportId()))
                .orElseThrow(() -> new EntityNotFoundException("Report not found with id " + dto.reportId()));
        User user = userRepository.findById(dto.uploadedByUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + dto.uploadedByUserId()));

        document.setReport(report);
        document.setUploadedByUser(user);
        document.setFilename(dto.filename());
        document.setFilePath(dto.filePath());
        Document updated = documentRepository.save(document);
        return toDto(updated);
    }

    @Transactional 
    public void delete(Long id) { 
         if (id == null) {
            throw new IllegalArgumentException("Document ID for delete must not be null");
         }
        int intId = Math.toIntExact(id); 
        if (!documentRepository.existsById(intId)) {
            throw new EntityNotFoundException("Document not found with id " + id);
        }
        documentRepository.deleteById(intId);
        logger.info("Deleted document with id: {}", id);
    }

    private DocumentDto toDto(Document document) {
        Long reportId = (document.getReport() != null) ? document.getReport().getId() : null;
        Long userId = (document.getUploadedByUser() != null) ? document.getUploadedByUser().getId() : null;

        return new DocumentDto(
                document.getId(), 
                reportId,        
                userId,          
                document.getFilename(),
                document.getFilePath()
        );
    }
}