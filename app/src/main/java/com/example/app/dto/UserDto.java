package com.example.app.dto;

import com.example.app.entity.UserRole;

public record UserDto(
        Long id,
        String email,
        String fullName,
        UserRole userRole
) {
}
