package com.example.app.dto;

import com.example.app.entity.UserRole;
import jakarta.validation.constraints.*;

public record CreateUserDto(
        @NotBlank @Email String email,
        @NotBlank String password,
        String fullName,
        @NotNull UserRole userRole
) {
}
