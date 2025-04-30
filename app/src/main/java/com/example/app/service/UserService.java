// src/main/java/com/example/app/service/UserService.java
package com.example.app.service;

import com.example.app.dto.*;
import com.example.app.entity.User;
import com.example.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.web.server.ResponseStatusException; 

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;

    public UserDto create(CreateUserDto dto) {
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

    public UserDto update(Long id, CreateUserDto dto) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id " + id));
        u.setEmail(dto.email());
        if (dto.password() != null && !dto.password().isEmpty()) {
             u.setPasswordHash(BCrypt.hashpw(dto.password(), BCrypt.gensalt()));
        }
        u.setFullName(dto.fullName());
        u.setUserRole(dto.userRole());
        return toDto(userRepository.save(u));
    }

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