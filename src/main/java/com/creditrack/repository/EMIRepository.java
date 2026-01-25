package com.creditrack.repository;

import com.creditrack.model.EMI;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EMIRepository extends JpaRepository<EMI, Long> {
    List<EMI> findByLoanId(Long loanId);

    List<EMI> findByLoanIdAndStatus(Long loanId, String status);
}
