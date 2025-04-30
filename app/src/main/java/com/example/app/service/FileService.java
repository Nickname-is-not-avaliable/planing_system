package com.example.app.service;

import com.example.app.entity.FileMetadata;
import com.example.app.repository.FileRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileService {

    //TODO Сжимать файлы
    //TODO Подключиться S3
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
        "jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg", "mp3", "wav", "ogg", "aac", "flac", "m4a", "mp4", "mkv", "avi", "mov", "wmv", "webm", "pdf", "doc", "docx", "docm", "txt", "odt", "rtf", "xls", "xlsx", "xlsm", "ods", "csv", "ppt", "pptx", "odp", "zip", "rar", "7z", "tar", "gz", "bz2"
);


    private final FileRepository fileRepository;
    private final Path fileStorageLocation = Paths.get("uploaded-files").toAbsolutePath().normalize();

    public FileMetadata uploadFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Файл не может быть пустым");
        }

        String fileExtension = getFileExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
            throw new IllegalArgumentException("Неподдерживаемый формат файла");
        }

        String newFilename = generateUniqueFilename(file.getOriginalFilename());

        try {
            Files.createDirectories(fileStorageLocation);

            Path targetLocation = fileStorageLocation.resolve(newFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            FileMetadata fileMetadata = new FileMetadata(newFilename, targetLocation.toString());
            fileRepository.save(fileMetadata);

            return fileMetadata;

        } catch (IOException e) {
            throw new RuntimeException("Не удалось сохранить файл", e);
        }
    }

    public Optional<Resource> downloadFile(String filename) {
        FileMetadata fileMetadata = fileRepository.findByFilename(filename)
                .orElseThrow(() -> new EntityNotFoundException("Файл не найден"));

        Path filePath = Paths.get(fileMetadata.getFilePath());
        Resource resource = new FileSystemResource(filePath);

        return Optional.of(resource);
    }

    private String getFileExtension(String filename) {
        int lastIndexOf = filename.lastIndexOf(".");
        if (lastIndexOf == -1) {
            return "";
        }
        return filename.substring(lastIndexOf + 1).toLowerCase();
    }

    private String generateUniqueFilename(String originalFilename) {
        String fileExtension = getFileExtension(originalFilename);
        String timestamp = String.valueOf(System.currentTimeMillis());
        return originalFilename.replaceAll("[^a-zA-Z0-9]", "_") + "-" + timestamp + "." + fileExtension;
    }
}