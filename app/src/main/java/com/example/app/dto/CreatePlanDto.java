package com.example.app.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;

public record CreatePlanDto(
        @NotBlank String name,
        String description,
        BigDecimal targetValue,
        LocalDate startDate,
        LocalDate endDate,
        @NotEmpty Set<Long> executorUserIds,
        @NotNull Long createdByUserId
) {
}
