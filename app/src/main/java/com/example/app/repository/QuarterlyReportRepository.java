package com.example.app.repository;

import com.example.app.entity.QuarterlyReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuarterlyReportRepository extends JpaRepository<QuarterlyReport, Integer> {
}
