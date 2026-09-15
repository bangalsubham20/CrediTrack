package com.creditrack.controller;

import com.creditrack.dto.LoanRequest;
import com.creditrack.model.Loan;
import com.creditrack.model.User;
import com.creditrack.service.LoanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanService loanService;

    @PostMapping("/apply")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Loan> applyLoan(
            @AuthenticationPrincipal User user,
            @RequestBody LoanRequest request) {
        return ResponseEntity.ok(loanService.applyLoan(
                user.getId(),
                request.getAmount(),
                request.getInterestRate(),
                request.getTenureMonths()));
    }

    @GetMapping("/my-loans")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<Loan>> getMyLoans(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(loanService.getMyLoans(user.getId()));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('LOAN_OFFICER')")
    public ResponseEntity<List<Loan>> getAllLoans() {
        return ResponseEntity.ok(loanService.getAllLoans());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Loan> getLoanById(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Loan loan = loanService.getLoanById(id);
        boolean isStaff = user.getRole() == com.creditrack.model.Role.ADMIN || user.getRole() == com.creditrack.model.Role.LOAN_OFFICER;
        if (!isStaff && !loan.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied to loan #" + id);
        }
        return ResponseEntity.ok(loan);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('LOAN_OFFICER') or hasRole('ADMIN')")
    public ResponseEntity<Loan> approveLoan(@PathVariable Long id) {
        return ResponseEntity.ok(loanService.approveLoan(id));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('LOAN_OFFICER') or hasRole('ADMIN')")
    public ResponseEntity<Loan> rejectLoan(@PathVariable Long id) {
        return ResponseEntity.ok(loanService.rejectLoan(id));
    }
}
