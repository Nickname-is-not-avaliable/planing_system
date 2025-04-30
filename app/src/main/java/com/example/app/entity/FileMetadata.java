package com.example.app.entity;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Сущность метаданных файла")
public class FileMetadata {
    public FileMetadata(String filename, String filePath) {
        this.filename = filename;
        this.filePath = filePath;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Schema(description = "Уникальный идентификатор файла")
    private Long id;

    @Column(nullable = false, unique = true)
    @Schema(description = "Имя файла")
    private String filename;

    @Column(nullable = false)
    @Schema(description = "Путь к файлу")
    private String filePath;
}
