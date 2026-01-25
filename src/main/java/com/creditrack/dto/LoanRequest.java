package com.creditrack.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class LoanRequest {
    @NotNull
    @Min(value = 1000)
    private BigDecimal amount;

    @NotNull
    private Double interestRate;

    @NotNull
    @Min(value = 1)
    private Integer tenureMonths;
}
