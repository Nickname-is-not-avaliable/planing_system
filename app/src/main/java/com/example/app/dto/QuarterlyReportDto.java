package com.example.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record QuarterlyReportDto(
        Long id,
        Long planId,
        Long reportingUserId,
        Long assessedByUserId,
        Integer year,
        Integer quarter,
        BigDecimal actualValue,
        Integer analystAssessmentScore,
        LocalDateTime createdAt
) {
}
