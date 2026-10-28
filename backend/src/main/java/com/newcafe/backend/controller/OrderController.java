package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.order.OrderRequest;
import com.newcafe.backend.dto.order.OrderResponse;
import com.newcafe.backend.service.AuthService;
import com.newcafe.backend.service.OrderService;

import lombok.RequiredArgsConstructor;

// 주문 API (로그인 필요). 로그인 회원의 주문만 다루므로 목록 · 상세 모두 내 주문이다.
// 주문하면 결제 대기 상태가 되고, 결제는 PaymentController
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // GET /api/v1/orders → 내 주문 목록 (최신순, 결제 대기 포함 — payment.status로 구분)
    @GetMapping
    public List<OrderResponse> findMine(Authentication authentication) {
        return orderService.findMine(AuthService.loginMemberNo(authentication));
    }

    // GET /api/v1/orders/{id} → 내 주문 상세
    @GetMapping("/{id}")
    public OrderResponse findById(@PathVariable Long id, Authentication authentication) {
        return orderService.findById(AuthService.loginMemberNo(authentication), id);
    }

    // POST /api/v1/orders → 주문 (결제 대기)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@RequestBody OrderRequest request, Authentication authentication) {
        return orderService.create(AuthService.loginMemberNo(authentication), request);
    }
}
