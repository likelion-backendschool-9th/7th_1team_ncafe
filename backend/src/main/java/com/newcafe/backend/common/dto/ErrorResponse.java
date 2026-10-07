package com.newcafe.backend.common.dto;

import org.springframework.http.HttpStatus;

public record ErrorResponse(int status, String code, String message) {

	public static ErrorResponse of(HttpStatus status, String code, String message) {
		return new ErrorResponse(status.value(), code, message);
	}

}
