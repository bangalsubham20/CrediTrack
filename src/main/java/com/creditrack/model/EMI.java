package com.creditrack.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "emis")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EMI {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_id", nullable = false)
    private Loan loan;

    @NotNull
    @Column(nullable = false)
    private BigDecimal emiAmount;

    @NotNull
    @Column(nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EMIStatus status;

    private LocalDateTime paymentDate;

    @PrePersist
    protected void onCreate() {
        if (status == null) {
            status = EMIStatus.PENDING;
        }
    }
}
