package com.example.app.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "quarterly_reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuarterlyReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "plan_id", nullable = false)
    private Plan plan;

    @ManyToOne
    @JoinColumn(name = "reporting_user_id", nullable = false)
    private User reportingUser;

    @ManyToOne
    @JoinColumn(name = "assessed_by_user_id")
    private User assessedByUser;

    private Integer year;
    private Integer quarter;

    @Column(name = "actual_value")
    private BigDecimal actualValue;

    @Column(name = "analyst_assessment_score")
    private Integer analystAssessmentScore;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
