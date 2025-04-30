package com.example.app.repository;

import com.example.app.entity.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<FileMetadata, Long> {
    Optional<FileMetadata> findByFilename(String filename);
}
