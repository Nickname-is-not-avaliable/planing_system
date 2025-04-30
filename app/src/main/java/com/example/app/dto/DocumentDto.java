package com.example.app.dto;

public record DocumentDto(
        Long id,
        Long reportId,
        Long uploadedByUserId,
        String filename,
        String filePath
) {
}
