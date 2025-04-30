package com.example.app.dto;

import jakarta.validation.constraints.*;

public record AuthRequestDto(
        @NotBlank @Email String email,
        @NotBlank String password
) {
}
