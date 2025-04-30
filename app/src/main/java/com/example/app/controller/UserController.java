// src/main/java/com/example/app/controller/UserController.java
package com.example.app.controller;

import com.example.app.dto.*;
import com.example.app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserDto> create(@Valid @RequestBody CreateUserDto dto) {
        UserDto createdUser = userService.create(dto);
        return ResponseEntity.ok(createdUser);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> list() {
        return ResponseEntity.ok(userService.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDto> update(@PathVariable Long id, @Valid @RequestBody CreateUserDto dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id); 
        return ResponseEntity.noContent().build(); 
    }

    @PostMapping("/auth")
    public ResponseEntity<?> auth(@Valid @RequestBody AuthRequestDto dto) { 
        try {
            UserDto userDto = userService.authenticate(dto.email(), dto.password());
            return ResponseEntity.ok(userDto);
        } catch (ResponseStatusException e) {
             AuthResponseDto errorResponse = new AuthResponseDto(e.getReason()); 
             return ResponseEntity.status(e.getStatusCode()).body(errorResponse);
        }
    }
}