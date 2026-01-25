package com.creditrack.service;

import com.creditrack.model.Loan;
import com.creditrack.model.LoanStatus;
import com.creditrack.model.User;
import com.creditrack.repository.LoanRepository;
import com.creditrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LoanService {

    private final LoanRepository loanRepository;
    private final UserRepository userRepository;
    private final EMIService emiService;

    public Loan applyLoan(Long userId, BigDecimal amount, Double interestRate, Integer tenureMonths) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Loan loan = Loan.builder()
                .user(user)
                .amount(amount)
                .interestRate(interestRate)
                .tenureMonths(tenureMonths)
                .status(LoanStatus.PENDING)
                .build();

        return loanRepository.save(loan);
    }

    @Transactional
    public Loan approveLoan(Long loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));

        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new RuntimeException("Loan is not in PENDING state");
        }

        loan.setStatus(LoanStatus.APPROVED);
        loan.setApprovedDate(LocalDateTime.now());
        loan = loanRepository.save(loan);

        // Generate EMIs
        emiService.generateEMIs(loan);

        loan.setStatus(LoanStatus.ACTIVE);
        return loanRepository.save(loan);
    }

    public Loan rejectLoan(Long loanId) {
        Loan loan = loanRepository.findById(loanId)
                .orElseThrow(() -> new RuntimeException("Loan not found"));

        if (loan.getStatus() != LoanStatus.PENDING) {
            throw new RuntimeException("Loan is not in PENDING state");
        }

        loan.setStatus(LoanStatus.REJECTED);
        return loanRepository.save(loan);
    }

    public List<Loan> getMyLoans(Long userId) {
        return loanRepository.findByUserId(userId);
    }

    public List<Loan> getAllLoans() {
        return loanRepository.findAll();
    }

    public Loan getLoanById(Long id) {
        return loanRepository.findById(id).orElseThrow(() -> new RuntimeException("Loan not found"));
    }
}
