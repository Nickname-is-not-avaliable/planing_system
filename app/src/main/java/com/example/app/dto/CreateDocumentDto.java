package com.example.app.dto;

import jakarta.validation.constraints.*;

public record CreateDocumentDto(
        @NotNull Long reportId,
        @NotNull Long uploadedByUserId,
        @NotBlank String filename,
        @NotBlank String filePath
) {
}
