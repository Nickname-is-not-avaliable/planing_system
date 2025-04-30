package com.example.app.dto;

public record CommentDto(
        Long id,
        Long reportId,
        Long userId,
        String text
) {
}
