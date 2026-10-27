package com.newcafe.backend.service;

import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.newcafe.backend.common.exception.BadGatewayException;
import com.newcafe.backend.common.exception.BadRequestException;
import com.newcafe.backend.common.exception.ConflictException;
import com.newcafe.backend.common.exception.ForbiddenException;
import com.newcafe.backend.common.exception.NotFoundException;
import com.newcafe.backend.dto.payment.PaymentRequest;
import com.newcafe.backend.dto.payment.PaymentResponse;
import com.newcafe.backend.entity.MenuSize;
import com.newcafe.backend.entity.Order;
import com.newcafe.backend.entity.Payment;
import com.newcafe.backend.repository.CartRepository;
import com.newcafe.backend.repository.PaymentRepository;

import lombok.RequiredArgsConstructor;

// 결제 — 주문할 때 만들어진 결제 대기(READY)를 토스페이먼츠 결제 승인 뒤 결제 완료(PAID)로 바꾼다.
//   1) 프론트가 결제위젯에 금액(orders.total_price)과 orderId(payment.pg_order_id)를 넘겨 결제를 요청한다
//   2) 토스가 successUrl로 paymentKey · orderId · amount를 돌려주면 프론트가 그대로 이 API에 보낸다
//   3) 이 서비스가 orderId · amount를 주문과 대조하고(금액 조작 방지), 메뉴가 아직 주문할 수 있는지(품절 · 잠김 등) 다시 확인한 뒤
//      시크릿 키로 토스 승인 API를 부른다
// 승인이 끝나면 주문 적립 쿠폰을 주고(주문 1회당 1장, 담은 수량과 무관) 주문한 메뉴 · 사이즈를 장바구니에서 뺀다.
// 결제하지 않은 주문에는 둘 다 하지 않는다 — 결제를 취소해도 장바구니가 남아 다시 시도할 수 있다
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {

    // 주문 1회당 적립 쿠폰 수 (프론트 ORDER_COUPON_REWARD)
    public static final int ORDER_COUPON_REWARD = 1;
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    // 토스 결제 API (승인: /confirm, 취소: /{paymentKey}/cancel)
    private static final String TOSS_PAYMENTS_URL = "https://api.tosspayments.com/v1/payments";
    // 주문 저장이 실패해 결제를 되돌릴 때 토스에 남기는 취소 사유 (최대 200자)
    private static final String ROLLBACK_CANCEL_REASON = "주문 처리 실패로 자동 취소";
    // 승인 결과 중 결제 완료. 가상계좌의 입금 대기(WAITING_FOR_DEPOSIT) 등은 받지 않는다
    private static final String TOSS_DONE = "DONE";

    private final PaymentRepository paymentRepository;
    private final CartRepository cartRepository;
    private final OrderService orderService;
    private final CouponService couponService;
    // 토스 승인 요청용. 승인은 카드사 응답을 기다려 오래 걸릴 수 있어 읽기 제한을 넉넉히 둔다
    private final RestClient restClient = RestClient.builder()
            .requestFactory(tossRequestFactory())
            .build();

    @Value("${toss.secret-key}")
    private String tossSecretKey;

    // 내 주문 결제 승인 (남의 주문이면 403, 이미 결제했으면 409, orderId · 금액이 다르면 400)
    public PaymentResponse pay(Long memberNo, Long orderId, PaymentRequest request) {
        if (request == null || isBlank(request.paymentKey()) || isBlank(request.orderId()) || request.amount() == null) {
            throw new BadRequestException("INVALID_PAYMENT_REQUEST", "결제 정보(paymentKey · orderId · amount)가 필요합니다.");
        }
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new NotFoundException("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다. id=" + orderId));
        Order order = payment.getOrder();
        if (!order.getMember().getNo().equals(memberNo)) {
            throw new ForbiddenException("ORDER_FORBIDDEN", "본인 주문만 결제할 수 있습니다.");
        }
        if (payment.getStatus() != Payment.Status.READY) {
            throw alreadyPaid();
        }
        if (!payment.getPgOrderId().equals(request.orderId())) {
            throw new BadRequestException("ORDER_ID_MISMATCH", "결제한 주문번호가 이 주문과 다릅니다.");
        }
        if (request.amount() != order.getTotalPrice()) {
            throw new BadRequestException("AMOUNT_MISMATCH", "결제 금액이 주문 금액과 다릅니다.");
        }
        // 주문한 뒤 품절 · 숨김 · 잠김이 된 메뉴가 있으면 돈이 나가기 전(토스 승인 전)에 막는다
        orderService.checkOrderable(order);
        // 적립 문구 · 장바구니에서 뺄 사이즈는 영속성 컨텍스트가 비워지기 전(markPaid 전)에 구한다
        String note = "주문 적립 · " + order.summary(); // "주문 적립 · 아메리카노 외 2건"
        List<Long> orderedSizeIds = order.getItems().stream()
                .flatMap(item -> item.getMenu().sizeOf(item.getSize()).stream())
                .map(MenuSize::getId)
                .toList();

        TossPayment confirmed = confirmWithToss(request);
        // 여기부터 실패하면(아래 예외 · DB 저장 · 커밋 실패) 트랜잭션이 롤백되고, 토스에서는 이미 승인된 결제만 남는다.
        // 그래서 롤백이 끝나면 이 결제를 토스에서 취소하도록 걸어 둔다. 커밋 실패는 메서드 밖에서 나므로 try/catch로는 잡히지 않는다
        cancelOnRollback(confirmed.paymentKey());
        if (!TOSS_DONE.equals(confirmed.status())) {
            throw new ConflictException("PAYMENT_NOT_DONE", "결제가 완료되지 않았어요. status=" + confirmed.status());
        }

        // 결제 대기일 때만 바뀐다 — 결제를 두 번 눌러도 한 번만 결제 · 적립된다
        Payment.Method method = Payment.Method.fromToss(confirmed.method()).orElse(null);
        OffsetDateTime paidDate = confirmed.approvedAt() != null ? confirmed.approvedAt() : OffsetDateTime.now();
        if (paymentRepository.markPaid(payment.getId(), method, confirmed.paymentKey(), paidDate,
                Payment.Status.READY, Payment.Status.PAID) == 0) {
            throw alreadyPaid();
        }
        couponService.earn(memberNo, ORDER_COUPON_REWARD, note);
        if (!orderedSizeIds.isEmpty()) {
            cartRepository.deleteByMemberNoAndMenuSizeIdIn(memberNo, orderedSizeIds);
        }
        return PaymentResponse.from(paymentRepository.findById(payment.getId()).orElseThrow());
    }

    // 토스 결제 승인. 토스가 거절하면(잔액 부족 · 이미 처리된 결제 등) 토스의 에러 코드 · 메시지를 그대로 400으로 돌려준다
    private TossPayment confirmWithToss(PaymentRequest request) {
        try {
            TossPayment response = restClient.post()
                    .uri(TOSS_PAYMENTS_URL + "/confirm")
                    .header(HttpHeaders.AUTHORIZATION, tossAuthorization())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new TossConfirmRequest(request.paymentKey(), request.orderId(), request.amount()))
                    .retrieve()
                    .body(TossPayment.class);
            if (response == null) {
                throw tossUnavailable();
            }
            return response;
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().is5xxServerError()) {
                throw tossUnavailable();
            }
            TossError error = e.getResponseBodyAs(TossError.class);
            if (error == null || error.code() == null) {
                throw new BadRequestException("TOSS_CONFIRM_FAILED", "결제 승인에 실패했어요.");
            }
            throw new BadRequestException(error.code(), error.message());
        } catch (RestClientException e) {
            throw tossUnavailable();
        }
    }

    // 이 트랜잭션이 롤백되면 승인된 토스 결제를 전액 취소한다
    private void cancelOnRollback(String paymentKey) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    cancelWithToss(paymentKey);
                }
            }
        });
    }

    // 토스 결제 취소 (cancelAmount를 빼면 전액 취소). 같은 결제를 두 번 취소하지 않게 멱등키를 붙인다.
    // 취소마저 실패하면 돈은 나갔는데 주문은 결제 대기로 남으므로, 수동으로 처리할 수 있게 paymentKey를 오류 로그로 남긴다
    private void cancelWithToss(String paymentKey) {
        try {
            restClient.post()
                    .uri(TOSS_PAYMENTS_URL + "/" + paymentKey + "/cancel")
                    .header(HttpHeaders.AUTHORIZATION, tossAuthorization())
                    .header("Idempotency-Key", "cancel-" + paymentKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new TossCancelRequest(ROLLBACK_CANCEL_REASON))
                    .retrieve()
                    .toBodilessEntity();
            log.warn("주문 저장 실패로 토스 결제를 취소했습니다. paymentKey={}", paymentKey);
        } catch (RuntimeException e) {
            log.error("토스 결제 취소 실패 — 수동 취소 필요. paymentKey={}", paymentKey, e);
        }
    }

    // 시크릿 키 뒤에 ":"를 붙여 base64로 인코딩한 Basic 인증 값
    private String tossAuthorization() {
        return "Basic " + Base64.getEncoder().encodeToString((tossSecretKey + ":").getBytes(StandardCharsets.UTF_8));
    }

    private static JdkClientHttpRequestFactory tossRequestFactory() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(30));
        return factory;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static ConflictException alreadyPaid() {
        return new ConflictException("ORDER_ALREADY_PAID", "이미 결제한 주문이에요.");
    }

    private static BadGatewayException tossUnavailable() {
        return new BadGatewayException("TOSS_UNAVAILABLE", "결제 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }

    // 토스 승인 요청 본문
    private record TossConfirmRequest(String paymentKey, String orderId, int amount) {
    }

    // 토스 취소 요청 본문 (전액 취소)
    private record TossCancelRequest(String cancelReason) {
    }

    // 토스 Payment 객체 중 쓰는 값 (method는 "카드" · "간편결제" 같은 한글)
    private record TossPayment(String paymentKey, String orderId, String status, String method,
            Long totalAmount, OffsetDateTime approvedAt) {
    }

    // 토스 에러 응답
    private record TossError(String code, String message) {
    }
}
