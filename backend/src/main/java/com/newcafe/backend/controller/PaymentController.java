package com.newcafe.backend.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.payment.PaymentRequest;
import com.newcafe.backend.dto.payment.PaymentResponse;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.PaymentService;

import lombok.RequiredArgsConstructor;

// 결제 API (로그인 필요). 주문(POST /api/v1/orders) 뒤에 부른다
@RestController
@RequestMapping("/api/v1/orders/{orderId}/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // POST /api/v1/orders/{orderId}/payment → 결제 완료 + 주문 적립 쿠폰 1장
    @PostMapping
    public PaymentResponse pay(@PathVariable Long orderId, @RequestBody PaymentRequest request,
                               Authentication authentication) {
        return paymentService.pay(AuthService.loginMemberNo(authentication), orderId, request);
    }
}
