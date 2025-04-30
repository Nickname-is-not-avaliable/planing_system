package com.example.app.controller;

import com.example.app.entity.FileMetadata;
import com.example.app.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Tag(name = "Files", description = "Загрузка и получение файлов")
public class FileController {

    private final FileService fileService;

    @PostMapping("/upload")
    @Operation(
            summary = "Загрузить файл",
            description = "Загрузить файл на сервер с ограничением форматов до 100МБ. Поддерживаемые форматы: изображения, видео, аудио.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Файл успешно загружен",
                            content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE)
                    ),
                    @ApiResponse(
                            responseCode = "400",
                            description = "Некорректный файл или формат"
                    )
            }
    )
    public ResponseEntity<FileMetadata> uploadFile(
            @Parameter(description = "Файл для загрузки", required = true)
            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        FileMetadata fileMetadata = fileService.uploadFile(file);

        return ResponseEntity.ok(fileMetadata);
    }

    @GetMapping("/download/{filename}")
    @Operation(
            summary = "Скачать файл",
            description = "Загрузить файл с сервера по имени.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Файл успешно найден и загружен",
                            content = @Content(mediaType = MediaType.APPLICATION_OCTET_STREAM_VALUE)
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Файл не найден"
                    )
            }
    )
    public ResponseEntity<Resource> downloadFile(
            @Parameter(description = "Имя файла для скачивания", required = true)
            @PathVariable String filename) {
        try {
            return fileService.downloadFile(filename)
                    .map(file -> ResponseEntity.ok()
                            .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                            .body(file))
                    .orElseThrow(() -> new EntityNotFoundException("Файл не найден"));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
}