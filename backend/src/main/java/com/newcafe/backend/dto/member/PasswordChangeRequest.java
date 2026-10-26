package com.newcafe.backend.dto.member;

public record PasswordChangeRequest(String currentPassword, String newPassword) {}
