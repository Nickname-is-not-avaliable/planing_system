// src/main/java/com/example/app/controller/UserController.java
package com.example.app.controller;

import com.example.app.dto.*;
import com.example.app.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Управление пользователями и аутентификация")
@CrossOrigin(origins = "http://localhost:3000", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class UserController {
    private final UserService userService;

    @PostMapping
    public ResponseEntity<UserDto> create(
            @RequestBody(description = "Данные для создания пользователя", required = true,
                         content = @Content(schema = @Schema(implementation = CreateUserDto.class)))
            @Valid @org.springframework.web.bind.annotation.RequestBody CreateUserDto dto) {
        return ResponseEntity.ok(userService.create(dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> get(
            @Parameter(description = "ID пользователя для поиска", required = true, example = "1")
            @PathVariable Long id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> list() {
        return ResponseEntity.ok(userService.getAll());
    }

    @PutMapping("/{id}") 
    @Operation(summary = "Полностью обновить пользователя по ID", description = "Обновляет все данные существующего пользователя, включая возможность смены пароля.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Пользователь успешно обновлен",
                         content = @Content(mediaType = "application/json", schema = @Schema(implementation = UserDto.class))),
            @ApiResponse(responseCode = "404", description = "Пользователь с таким ID не найден", content = @Content),
            @ApiResponse(responseCode = "400", description = "Некорректные данные для обновления (например, email уже занят)", content = @Content)
    })
    public ResponseEntity<UserDto> update(
            @Parameter(description = "ID пользователя для обновления", required = true, example = "1")
            @PathVariable Long id,
            @RequestBody(description = "Полные новые данные пользователя (включая пароль, если меняется)", required = true,
                         content = @Content(schema = @Schema(implementation = CreateUserDto.class)))
            @Valid @org.springframework.web.bind.annotation.RequestBody CreateUserDto dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Частично обновить пользователя по ID", description = "Обновляет только предоставленные поля пользователя (fullName, email, userRole). Пароль этим методом не меняется.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Пользователь успешно частично обновлен",
                         content = @Content(mediaType = "application/json", schema = @Schema(implementation = UserDto.class))),
            @ApiResponse(responseCode = "404", description = "Пользователь с таким ID не найден", content = @Content),
            @ApiResponse(responseCode = "400", description = "Некорректные данные для обновления (например, email уже занят)", content = @Content)
    })
    public ResponseEntity<UserDto> partialUpdate(
            @Parameter(description = "ID пользователя для частичного обновления", required = true, example = "1")
            @PathVariable Long id,
            @RequestBody(description = "Данные для частичного обновления (fullName, email, userRole)", required = true,
                         content = @Content(schema = @Schema(implementation = UserPartialUpdateDto.class)))
            @Valid @org.springframework.web.bind.annotation.RequestBody UserPartialUpdateDto dto) {
        return ResponseEntity.ok(userService.partialUpdate(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "ID пользователя для удаления", required = true, example = "1")
            @PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/auth")
    public ResponseEntity<?> auth(
            @RequestBody(description = "Учетные данные для входа", required = true,
                         content = @Content(schema = @Schema(implementation = AuthRequestDto.class)))
            @Valid @org.springframework.web.bind.annotation.RequestBody AuthRequestDto dto) {
        try {
            UserDto userDto = userService.authenticate(dto.email(), dto.password());
            return ResponseEntity.ok(userDto);
        } catch (ResponseStatusException e) {
             AuthResponseDto errorResponse = new AuthResponseDto(e.getReason());
             return ResponseEntity.status(e.getStatusCode()).body(errorResponse);
        }
    }
}