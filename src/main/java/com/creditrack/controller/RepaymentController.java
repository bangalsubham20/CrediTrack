package com.creditrack.controller;

import com.creditrack.model.EMI;
import com.creditrack.service.EMIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/repayment")
@RequiredArgsConstructor
public class RepaymentController {

    private final EMIService emiService;

    @GetMapping("/loan/{loanId}")
    public ResponseEntity<List<EMI>> getEMIsByLoan(@PathVariable Long loanId) {
        return ResponseEntity.ok(emiService.getEMIsByLoan(loanId));
    }

    @PostMapping("/pay/{emiId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<EMI> payEMI(@PathVariable Long emiId) {
        return ResponseEntity.ok(emiService.payEMI(emiId));
    }
}
