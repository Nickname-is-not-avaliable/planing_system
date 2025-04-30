package com.example.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

public record PlanDto(
        Long id,
        String name,
        String description,
        BigDecimal targetValue,
        LocalDate startDate,
        LocalDate endDate,
        Set<Long> executorUserIds,
        Long createdByUserId,
        LocalDateTime createdAt
) {
}
