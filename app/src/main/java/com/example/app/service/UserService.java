// src/main/java/com/example/app/service/UserService.java
package com.example.app.service;

import com.example.app.dto.*;
import com.example.app.entity.User;
import com.example.app.entity.UserRole; // Убедитесь, что UserRole импортирован
import com.example.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional; // Для методов изменения
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    @Transactional
    public UserDto create(CreateUserDto dto) {
        // Проверка, не занят ли email
        if (userRepository.findByEmail(dto.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already in use: " + dto.email());
        }
        String hash = BCrypt.hashpw(dto.password(), BCrypt.gensalt());
        User u = User.builder()
                .email(dto.email())
                .passwordHash(hash)
                .fullName(dto.fullName())
                .userRole(dto.userRole())
                .build();
        return toDto(userRepository.save(u));
    }

    public UserDto getById(Long id) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + id));
        return toDto(u);
    }

    public List<UserDto> getAll() {
        return userRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto update(Long id, CreateUserDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + id));

        // Проверка, если email меняется и новый email уже занят другим пользователем
        if (dto.email() != null && !dto.email().equalsIgnoreCase(user.getEmail()) && userRepository.findByEmail(dto.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New email already in use: " + dto.email());
        }

        if (dto.email() != null) {
            user.setEmail(dto.email());
        }
        if (dto.password() != null && !dto.password().isEmpty()) {
             user.setPasswordHash(BCrypt.hashpw(dto.password(), BCrypt.gensalt()));
        }
        if (dto.fullName() != null) {
            user.setFullName(dto.fullName());
        }
        if (dto.userRole() != null) {
            user.setUserRole(dto.userRole());
        }
        return toDto(userRepository.save(user));
    }

    // --- НОВЫЙ МЕТОД ДЛЯ ЧАСТИЧНОГО ОБНОВЛЕНИЯ ---
    @Transactional
    public UserDto partialUpdate(Long id, UserPartialUpdateDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + id));

        boolean updated = false;

        // Обновляем email, если он предоставлен и отличается
        // Также проверяем, не занят ли новый email другим пользователем
        if (dto.email() != null && !dto.email().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.findByEmail(dto.email()).isPresent()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New email already in use: " + dto.email());
            }
            user.setEmail(dto.email());
            updated = true;
        }

        // Обновляем fullName, если он предоставлен
        if (dto.fullName() != null) {
            user.setFullName(dto.fullName());
            updated = true;
        }

        // Обновляем userRole, если она предоставлена
        if (dto.userRole() != null) {
            user.setUserRole(dto.userRole());
            updated = true;
        }

        // Сохраняем, только если были какие-то изменения
        if (updated) {
            user = userRepository.save(user);
        }
        return toDto(user);
    }
    // --- КОНЕЦ НОВОГО МЕТОДА ---

    @Transactional
    public void delete(Long id) {
         if (!userRepository.existsById(id)) {
            throw new EntityNotFoundException("User not found with id " + id);
         }
        userRepository.deleteById(id);
    }

    private UserDto toDto(User u) {
        return new UserDto(
                u.getId(),
                u.getEmail(),
                u.getFullName(),
                u.getUserRole()
        );
    }

    public UserDto authenticate(String email, String rawPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with email: " + email));

        if (!BCrypt.checkpw(rawPassword, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        return toDto(user);
    }
}