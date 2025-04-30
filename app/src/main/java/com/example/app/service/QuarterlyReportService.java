package com.example.app.service;

import com.example.app.dto.CreateQuarterlyReportDto;
import com.example.app.dto.QuarterlyReportDto;
import com.example.app.entity.Plan;
import com.example.app.entity.QuarterlyReport;
import com.example.app.entity.User;
import com.example.app.repository.PlanRepository;
import com.example.app.repository.QuarterlyReportRepository;
import com.example.app.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuarterlyReportService {
    private final QuarterlyReportRepository quarterlyReportRepository;
    private final PlanRepository planRepository;
    private final UserRepository userRepository;

    public QuarterlyReportDto create(CreateQuarterlyReportDto dto) {
        Plan plan = planRepository.findById(dto.planId())
                .orElseThrow(() -> new EntityNotFoundException("Plan not found with id " + dto.planId()));
        User reportingUser = userRepository.findById(dto.reportingUserId())
                .orElseThrow(() -> new EntityNotFoundException("Reporting user not found with id " + dto.reportingUserId()));
        User assessedByUser = null;
        if (dto.assessedByUserId() != null) {
            assessedByUser = userRepository.findById(dto.assessedByUserId())
                    .orElseThrow(() -> new EntityNotFoundException("Assessed user not found with id " + dto.assessedByUserId()));
        }

        QuarterlyReport report = QuarterlyReport.builder()
                .plan(plan)
                .reportingUser(reportingUser)
                .assessedByUser(assessedByUser)
                .year(dto.year())
                .quarter(dto.quarter())
                .actualValue(dto.actualValue())
                .analystAssessmentScore(dto.analystAssessmentScore())
                .createdAt(LocalDateTime.now())
                .build();
        QuarterlyReport saved = quarterlyReportRepository.save(report);
        return toDto(saved);
    }

    public QuarterlyReportDto getById(Long id) {
        QuarterlyReport report = quarterlyReportRepository.findById(Math.toIntExact(id))
                .orElseThrow(() -> new EntityNotFoundException("Report not found with id " + id));
        return toDto(report);
    }

    public List<QuarterlyReportDto> getAll() {
        return quarterlyReportRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public QuarterlyReportDto update(Long id, CreateQuarterlyReportDto dto) {
        QuarterlyReport report = quarterlyReportRepository.findById(Math.toIntExact(id))
                .orElseThrow(() -> new EntityNotFoundException("Report not found with id " + id));
        Plan plan = planRepository.findById(dto.planId())
                .orElseThrow(() -> new EntityNotFoundException("Plan not found with id " + dto.planId()));
        User reportingUser = userRepository.findById(dto.reportingUserId())
                .orElseThrow(() -> new EntityNotFoundException("Reporting user not found with id " + dto.reportingUserId()));
        User assessedByUser = null;
        if (dto.assessedByUserId() != null) {
            assessedByUser = userRepository.findById(dto.assessedByUserId())
                    .orElseThrow(() -> new EntityNotFoundException("Assessed user not found with id " + dto.assessedByUserId()));
        }

        report.setPlan(plan);
        report.setReportingUser(reportingUser);
        report.setAssessedByUser(assessedByUser);
        report.setYear(dto.year());
        report.setQuarter(dto.quarter());
        report.setActualValue(dto.actualValue());
        report.setAnalystAssessmentScore(dto.analystAssessmentScore());
        QuarterlyReport updated = quarterlyReportRepository.save(report);
        return toDto(updated);
    }

    public void delete(Long id) {
        if (!quarterlyReportRepository.existsById(Math.toIntExact(id))) {
            throw new EntityNotFoundException("Report not found with id " + id);
        }
        quarterlyReportRepository.deleteById(Math.toIntExact(id));
    }

    private QuarterlyReportDto toDto(QuarterlyReport report) {
        Long assessedById = report.getAssessedByUser() != null
                ? report.getAssessedByUser().getId() : null;
        return new QuarterlyReportDto(
                report.getId(),
                report.getPlan().getId(),
                report.getReportingUser().getId(),
                assessedById,
                report.getYear(),
                report.getQuarter(),
                report.getActualValue(),
                report.getAnalystAssessmentScore(),
                report.getCreatedAt()
        );
    }
}
