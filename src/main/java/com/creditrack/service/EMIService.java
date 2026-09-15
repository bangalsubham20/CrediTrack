package com.creditrack.service;

import com.creditrack.model.EMI;
import com.creditrack.model.EMIStatus;
import com.creditrack.model.Loan;
import com.creditrack.model.LoanStatus;
import com.creditrack.repository.EMIRepository;
import com.creditrack.repository.LoanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EMIService {

    private final EMIRepository emiRepository;
    private final LoanRepository loanRepository;

    public void generateEMIs(Loan loan) {
        BigDecimal principal = loan.getAmount();
        double ratePerMonth = loan.getInterestRate() / 12 / 100;
        int tenureMonths = loan.getTenureMonths();

        // EMI Calculation Formula: E = P * r * (1+r)^n / ((1+r)^n - 1)
        BigDecimal onePlusR = BigDecimal.valueOf(1 + ratePerMonth);
        BigDecimal pow = onePlusR.pow(tenureMonths);

        BigDecimal numerator = principal.multiply(BigDecimal.valueOf(ratePerMonth)).multiply(pow);
        BigDecimal denominator = pow.subtract(BigDecimal.ONE);
        BigDecimal emiAmount = numerator.divide(denominator, 2, RoundingMode.HALF_UP);

        List<EMI> emis = new ArrayList<>();
        LocalDate nextDueDate = LocalDate.now().plusMonths(1);

        for (int i = 0; i < tenureMonths; i++) {
            EMI emi = EMI.builder()
                    .loan(loan)
                    .emiAmount(emiAmount)
                    .dueDate(nextDueDate)
                    .status(EMIStatus.PENDING)
                    .build();
            emis.add(emi);
            nextDueDate = nextDueDate.plusMonths(1);
        }

        emiRepository.saveAll(emis);
    }

    @Transactional
    public EMI payEMI(Long emiId) {
        EMI emi = emiRepository.findById(emiId)
                .orElseThrow(() -> new RuntimeException("EMI not found"));

        if (emi.getStatus() == EMIStatus.PAID) {
            throw new RuntimeException("EMI already paid");
        }

        emi.setStatus(EMIStatus.PAID);
        emi.setPaymentDate(LocalDateTime.now());
        EMI savedEmi = emiRepository.save(emi);

        // Check if all EMIs for this loan are now PAID
        Loan loan = emi.getLoan();
        if (loan != null) {
            List<EMI> loanEmis = emiRepository.findByLoanId(loan.getId());
            boolean allPaid = loanEmis.stream().allMatch(e -> e.getStatus() == EMIStatus.PAID);
            if (allPaid) {
                loan.setStatus(LoanStatus.CLOSED);
                loanRepository.save(loan);
            }
        }

        return savedEmi;
    }

    public List<EMI> getEMIsByLoan(Long loanId) {
        return emiRepository.findByLoanId(loanId);
    }
}
