// src/main/java/com/example/app/dto/UserPartialUpdateDto.java
package com.example.app.dto;

import com.example.app.entity.UserRole; 
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UserPartialUpdateDto(
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    String fullName,

    @Email(message = "Email should be valid")
    String email,    

    UserRole userRole  
) {

}