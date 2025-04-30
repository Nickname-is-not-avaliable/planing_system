package com.example.app.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record CreateQuarterlyReportDto(
        @NotNull Long planId,
        @NotNull Long reportingUserId,
        Long assessedByUserId,
        @NotNull @Min(2000) Integer year,
        @NotNull @Min(1) @Max(4) Integer quarter,
        @NotNull BigDecimal actualValue,
        Integer analystAssessmentScore
) {
}
