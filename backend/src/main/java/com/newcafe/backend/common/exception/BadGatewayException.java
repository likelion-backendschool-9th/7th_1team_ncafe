package com.newcafe.backend.common.exception;

import org.springframework.http.HttpStatus;

// 외부 서비스(토스페이먼츠 등)에 연결하지 못했거나 그쪽 서버 오류일 때
public class BadGatewayException extends ApiException {

	public BadGatewayException(String code, String message) {
		super(HttpStatus.BAD_GATEWAY, code, message);
	}

}
