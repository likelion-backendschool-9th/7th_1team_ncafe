package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Payment;

import java.time.OffsetDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 결제는 주문할 때 order.payment로 함께 저장된다(OrderRepository.save).
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    // 주문의 결제
    Optional<Payment> findByOrderId(Long orderId);

    // 결제 완료 (토스 승인 결과를 남긴다). 결제 대기(ready)일 때만 바꿔서 같은 주문을 동시에 두 번 결제해도 한 번만 바뀐다.
    // 변경된 행 수를 반환하며 0이면 이미 결제한 주문.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Payment p
               set p.method = :method, p.pgTransactionId = :paymentKey, p.status = :paid, p.paidDate = :paidDate
             where p.id = :id and p.status = :ready
            """)
    int markPaid(@Param("id") Long id,
                 @Param("method") Payment.Method method,
                 @Param("paymentKey") String paymentKey,
                 @Param("paidDate") OffsetDateTime paidDate,
                 @Param("ready") Payment.Status ready,
                 @Param("paid") Payment.Status paid);
}
