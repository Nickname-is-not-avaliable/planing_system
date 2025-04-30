package com.example.app.service;

import com.example.app.dto.CommentDto;
import com.example.app.dto.CreateCommentDto;
import com.example.app.entity.Comment;
import com.example.app.entity.QuarterlyReport;
import com.example.app.entity.User;
import com.example.app.repository.CommentRepository;
import com.example.app.repository.QuarterlyReportRepository;
import com.example.app.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final QuarterlyReportRepository reportRepository;
    private final UserRepository userRepository;

    public CommentDto create(CreateCommentDto dto) {
        QuarterlyReport report = reportRepository.findById(Math.toIntExact(dto.reportId()))
                .orElseThrow(() -> new EntityNotFoundException("Report not found with id " + dto.reportId()));
        User user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + dto.userId()));

        Comment comment = Comment.builder()
                .report(report)
                .user(user)
                .text(dto.text())
                .build();
        Comment saved = commentRepository.save(comment);
        return toDto(saved);
    }

    public CommentDto getById(Long id) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found with id " + id));
        return toDto(comment);
    }

    public List<CommentDto> getAll() {
        return commentRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public CommentDto update(Long id, CreateCommentDto dto) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found with id " + id));
        QuarterlyReport report = reportRepository.findById(Math.toIntExact(dto.reportId()))
                .orElseThrow(() -> new EntityNotFoundException("Report not found with id " + dto.reportId()));
        User user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + dto.userId()));

        comment.setReport(report);
        comment.setUser(user);
        comment.setText(dto.text());
        Comment updated = commentRepository.save(comment);
        return toDto(updated);
    }

    public void delete(Long id) {
        if (!commentRepository.existsById(id)) {
            throw new EntityNotFoundException("Comment not found with id " + id);
        }
        commentRepository.deleteById(id);
    }

    private CommentDto toDto(Comment comment) {
        return new CommentDto(
                comment.getId(),
                comment.getReport().getId(),
                comment.getUser().getId(),
                comment.getText()
        );
    }
}
