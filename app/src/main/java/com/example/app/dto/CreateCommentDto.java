package com.example.app.dto;

import jakarta.validation.constraints.*;

public record CreateCommentDto(
        @NotNull Long reportId,
        @NotNull Long userId,
        @NotBlank String text
) {
}
