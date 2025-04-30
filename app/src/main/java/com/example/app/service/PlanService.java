package com.example.app.service;

import com.example.app.dto.*;
import com.example.app.entity.*;
import com.example.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlanService {
    private final PlanRepository planRepository;
    private final UserRepository userRepository;

    public PlanDto create(CreatePlanDto dto) {
        User creator = userRepository.findById(dto.createdByUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        Set<User> execs = dto.executorUserIds().stream()
                .map(id -> userRepository.findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Executor user not found: " + id)))
                .collect(Collectors.toSet());

        Plan p = Plan.builder()
                .name(dto.name())
                .description(dto.description())
                .targetValue(dto.targetValue())
                .startDate(dto.startDate())
                .endDate(dto.endDate())
                .executors(execs)
                .createdByUser(creator)
                .createdAt(LocalDateTime.now())
                .build();
        Plan saved = planRepository.save(p);
        return toDto(saved);
    }

    public PlanDto getById(Long id) {
        Plan p = planRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found"));
        return toDto(p);
    }

    public List<PlanDto> getAll() {
        return planRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public PlanDto update(Long id, CreatePlanDto dto) {
        Plan p = planRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Plan not found"));
        p.setName(dto.name());
        p.setDescription(dto.description());
        p.setTargetValue(dto.targetValue());
        p.setStartDate(dto.startDate());
        p.setEndDate(dto.endDate());
        Set<User> execs = dto.executorUserIds().stream()
                .map(uid -> userRepository.findById(uid)
                        .orElseThrow(() -> new EntityNotFoundException("User not found: " + uid)))
                .collect(Collectors.toSet());
        p.setExecutors(execs);
        return toDto(planRepository.save(p));
    }

    public void delete(Long id) {
        planRepository.deleteById(id);
    }

    private PlanDto toDto(Plan p) {
        Set<Long> execIds = p.getExecutors().stream()
                .map(User::getId).collect(Collectors.toSet());
        return new PlanDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getTargetValue(),
                p.getStartDate(),
                p.getEndDate(),
                execIds,
                p.getCreatedByUser().getId(),
                p.getCreatedAt()
        );
    }
}
