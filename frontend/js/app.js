const API_BASE = 'http://localhost:8080/api';

// --- Toast System ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// --- Auth Helpers ---
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
        return {};
    }
}

function isLoggedIn() {
    return !!getToken();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'index.html';
    }
}

// --- API Wrapper ---
async function fetchAPI(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (isLoggedIn()) {
        headers['Authorization'] = `Bearer ${getToken()}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Request failed');
        }

        return data;
    } catch (err) {
        throw err;
    }
}

// --- Page Routing / Logic ---

// 1. Index Page (Login / Register)
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('dashboard')) {
    if (isLoggedIn()) {
        window.location.href = 'dashboard.html';
    }

    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');
    const toggleLinks = document.querySelectorAll('.toggle-link');

    toggleLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginBox && registerBox) {
                const isLogin = loginBox.style.display !== 'none';
                loginBox.style.display = isLogin ? 'none' : 'block';
                registerBox.style.display = isLogin ? 'block' : 'none';
            }
        });
    });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            try {
                const data = await fetchAPI('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({ fullName: data.fullName, role: data.role }));
                showToast(`Welcome back, ${data.fullName}!`, 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500);
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const role = document.getElementById('regRole') ? document.getElementById('regRole').value : 'CUSTOMER';

            try {
                const data = await fetchAPI('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ fullName, email, password, role })
                });

                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({ fullName: data.fullName, role: data.role }));
                showToast('Registration successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 500);
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

// 2. Dashboard Page
if (window.location.pathname.includes('dashboard')) {
    checkAuth();

    const user = getUser();
    const isOfficerOrAdmin = user.role === 'LOAN_OFFICER' || user.role === 'ADMIN';

    // Set User Profile
    const userNameElem = document.getElementById('userName');
    const roleBadgeElem = document.getElementById('roleBadge');
    if (userNameElem) userNameElem.textContent = user.fullName || 'User';
    if (roleBadgeElem) {
        roleBadgeElem.textContent = user.role;
        roleBadgeElem.className = `role-pill role-${user.role}`;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Toggle Sections according to Role
    const customerSection = document.getElementById('customerSection');
    const officerSection = document.getElementById('officerSection');

    if (isOfficerOrAdmin) {
        if (customerSection) customerSection.style.display = 'none';
        if (officerSection) officerSection.style.display = 'block';
        loadAllLoansForAdmin();

        const refreshLoansBtn = document.getElementById('refreshLoansBtn');
        if (refreshLoansBtn) {
            refreshLoansBtn.addEventListener('click', () => {
                loadAllLoansForAdmin();
                showToast('Loan records refreshed', 'info');
            });
        }
    } else {
        if (customerSection) customerSection.style.display = 'block';
        if (officerSection) officerSection.style.display = 'none';
        initLoanCalculator();
        loadCustomerLoans();
    }

    // Modal Events
    setupModals();
}

// --- EMI Calculator ---
function calculateEMI(principal, annualRate, tenureMonths) {
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / tenureMonths;

    const ratePow = Math.pow(1 + monthlyRate, tenureMonths);
    const emi = (principal * monthlyRate * ratePow) / (ratePow - 1);
    return Math.round(emi);
}

function initLoanCalculator() {
    const amountSlider = document.getElementById('calcAmount');
    const rateSlider = document.getElementById('calcRate');
    const tenureSlider = document.getElementById('calcTenure');

    const amountLabel = document.getElementById('calcAmountLabel');
    const rateLabel = document.getElementById('calcRateLabel');
    const tenureLabel = document.getElementById('calcTenureLabel');

    const emiValue = document.getElementById('calcEmiValue');
    const totalInterest = document.getElementById('calcTotalInterest');
    const totalPayable = document.getElementById('calcTotalPayable');

    function updateCalc() {
        if (!amountSlider || !rateSlider || !tenureSlider) return;

        const p = parseFloat(amountSlider.value);
        const r = parseFloat(rateSlider.value);
        const n = parseInt(tenureSlider.value);

        amountLabel.textContent = `₹${p.toLocaleString('en-IN')}`;
        rateLabel.textContent = `${r}%`;
        tenureLabel.textContent = `${n} Months`;

        const emi = calculateEMI(p, r, n);
        const total = emi * n;
        const interest = total - p;

        emiValue.textContent = `₹${emi.toLocaleString('en-IN')}`;
        totalInterest.textContent = `₹${Math.max(0, interest).toLocaleString('en-IN')}`;
        totalPayable.textContent = `₹${total.toLocaleString('en-IN')}`;
    }

    [amountSlider, rateSlider, tenureSlider].forEach(slider => {
        if (slider) slider.addEventListener('input', updateCalc);
    });

    updateCalc();

    const applyFromCalcBtn = document.getElementById('applyFromCalcBtn');
    if (applyFromCalcBtn) {
        applyFromCalcBtn.addEventListener('click', async () => {
            const p = parseFloat(amountSlider.value);
            const r = parseFloat(rateSlider.value);
            const n = parseInt(tenureSlider.value);

            await submitLoanApplication(p, r, n);
        });
    }
}

// --- Modals Setup ---
function setupModals() {
    const loanModal = document.getElementById('loanModal');
    const emiModal = document.getElementById('emiModal');
    const openApplyModalBtn = document.getElementById('openApplyModalBtn');
    const closeLoanModalBtn = document.getElementById('closeLoanModalBtn');
    const closeEmiModalBtn = document.getElementById('closeEmiModalBtn');
    const loanForm = document.getElementById('loanForm');

    if (openApplyModalBtn && loanModal) {
        openApplyModalBtn.addEventListener('click', () => {
            loanModal.classList.add('active');
        });
    }

    if (closeLoanModalBtn && loanModal) {
        closeLoanModalBtn.addEventListener('click', () => {
            loanModal.classList.remove('active');
        });
    }

    if (closeEmiModalBtn && emiModal) {
        closeEmiModalBtn.addEventListener('click', () => {
            emiModal.classList.remove('active');
        });
    }

    // Close on background click
    window.addEventListener('click', (e) => {
        if (e.target === loanModal) loanModal.classList.remove('active');
        if (e.target === emiModal) emiModal.classList.remove('active');
    });

    if (loanForm) {
        loanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('amount').value);
            const interestRate = parseFloat(document.getElementById('rate').value);
            const tenureMonths = parseInt(document.getElementById('tenure').value);

            const success = await submitLoanApplication(amount, interestRate, tenureMonths);
            if (success && loanModal) {
                loanModal.classList.remove('active');
                loanForm.reset();
            }
        });
    }
}

// --- Submit Loan Application ---
async function submitLoanApplication(amount, interestRate, tenureMonths) {
    try {
        await fetchAPI('/loans/apply', {
            method: 'POST',
            body: JSON.stringify({ amount, interestRate, tenureMonths })
        });
        showToast('Loan application submitted successfully!', 'success');
        loadCustomerLoans();
        return true;
    } catch (err) {
        showToast('Application Failed: ' + err.message, 'error');
        return false;
    }
}

// --- Customer View: Load Loans ---
async function loadCustomerLoans() {
    try {
        const loans = await fetchAPI('/loans/my-loans');
        const container = document.getElementById('loanContainer');
        if (!container) return;

        container.innerHTML = '';

        // Update KPIs
        const activeCount = loans.filter(l => l.status === 'ACTIVE').length;
        const totalPrincipal = loans.reduce((acc, l) => acc + (l.status === 'ACTIVE' ? l.amount : 0), 0);
        const pendingCount = loans.filter(l => l.status === 'PENDING').length;

        document.getElementById('metric1Title').textContent = 'Active Loans';
        document.getElementById('metric1Value').textContent = activeCount;
        document.getElementById('metric2Title').textContent = 'Disbursed Principal';
        document.getElementById('metric2Value').textContent = `₹${totalPrincipal.toLocaleString('en-IN')}`;
        document.getElementById('metric3Title').textContent = 'Applications Pending';
        document.getElementById('metric3Value').textContent = pendingCount;

        if (loans.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:3rem; background:var(--surface); border-radius:var(--radius); border:1px solid var(--surface-border);">
                    <p style="color:var(--text-muted); font-size:1.1rem; margin-bottom:1rem;">You don't have any loan applications yet.</p>
                    <p style="color:var(--text-muted); font-size:0.9rem;">Use the calculator above to apply for your first loan!</p>
                </div>
            `;
            return;
        }

        loans.forEach(loan => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-top">
                    <div>
                        <div style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;">Loan ID #${loan.id}</div>
                        <div class="card-amount">₹${loan.amount.toLocaleString('en-IN')}</div>
                    </div>
                    <span class="status-badge status-${loan.status}">${loan.status}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-muted);">
                    <span>Interest: <strong style="color:var(--text);">${loan.interestRate}%</strong></span>
                    <span>Tenure: <strong style="color:var(--text);">${loan.tenureMonths} Mo</strong></span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted);">
                    Applied on: ${loan.appliedDate ? new Date(loan.appliedDate).toLocaleDateString() : 'N/A'}
                </div>
                ${(loan.status === 'ACTIVE' || loan.status === 'CLOSED') ? `
                    <button class="btn btn-secondary btn-sm" style="margin-top:auto;" onclick="openEMISchedule(${loan.id})">
                        📅 View Repayment Schedule
                    </button>
                ` : ''}
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        showToast('Error loading loans: ' + err.message, 'error');
    }
}

// --- Officer / Admin View: Load All Loans ---
async function loadAllLoansForAdmin() {
    try {
        const loans = await fetchAPI('/loans');
        const tbody = document.getElementById('adminLoanTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Update KPIs for Admin/Officer
        const pendingCount = loans.filter(l => l.status === 'PENDING').length;
        const activeCount = loans.filter(l => l.status === 'ACTIVE').length;
        const totalVolume = loans.reduce((acc, l) => acc + l.amount, 0);

        document.getElementById('metric1Title').textContent = 'Total Applications';
        document.getElementById('metric1Value').textContent = loans.length;
        document.getElementById('metric2Title').textContent = 'Portfolio Volume';
        document.getElementById('metric2Value').textContent = `₹${totalVolume.toLocaleString('en-IN')}`;
        document.getElementById('metric3Title').textContent = 'Pending Approvals';
        document.getElementById('metric3Value').textContent = pendingCount;

        if (loans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">No loan applications found.</td></tr>';
            return;
        }

        loans.forEach(loan => {
            const tr = document.createElement('tr');
            const applicantName = loan.user ? `${loan.user.fullName} (${loan.user.email})` : `User #${loan.user ? loan.user.id : 'N/A'}`;
            const appliedDateStr = loan.appliedDate ? new Date(loan.appliedDate).toLocaleDateString() : '-';

            let actionHtml = '-';
            if (loan.status === 'PENDING') {
                actionHtml = `
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-success btn-sm" onclick="approveLoan(${loan.id})">Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectLoan(${loan.id})">Reject</button>
                    </div>
                `;
            } else if (loan.status === 'ACTIVE' || loan.status === 'CLOSED') {
                actionHtml = `
                    <button class="btn btn-secondary btn-sm" onclick="openEMISchedule(${loan.id})">EMIs</button>
                `;
            }

            tr.innerHTML = `
                <td><strong>#${loan.id}</strong></td>
                <td>${applicantName}</td>
                <td><strong>₹${loan.amount.toLocaleString('en-IN')}</strong></td>
                <td>${loan.interestRate}% / ${loan.tenureMonths} Mo</td>
                <td>${appliedDateStr}</td>
                <td><span class="status-badge status-${loan.status}">${loan.status}</span></td>
                <td>${actionHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        showToast('Failed to load platform loans: ' + err.message, 'error');
    }
}

// --- Approve Loan ---
window.approveLoan = async function(loanId) {
    if (!confirm(`Are you sure you want to approve Loan #${loanId}? This will generate the monthly EMI schedule and disburse funds.`)) return;

    try {
        await fetchAPI(`/loans/${loanId}/approve`, { method: 'PUT' });
        showToast(`Loan #${loanId} approved successfully!`, 'success');
        loadAllLoansForAdmin();
    } catch (err) {
        showToast('Failed to approve loan: ' + err.message, 'error');
    }
};

// --- Reject Loan ---
window.rejectLoan = async function(loanId) {
    if (!confirm(`Are you sure you want to reject Loan #${loanId}?`)) return;

    try {
        await fetchAPI(`/loans/${loanId}/reject`, { method: 'PUT' });
        showToast(`Loan #${loanId} has been rejected.`, 'info');
        loadAllLoansForAdmin();
    } catch (err) {
        showToast('Failed to reject loan: ' + err.message, 'error');
    }
};

// --- View EMI Schedule Modal ---
window.openEMISchedule = async function(loanId) {
    try {
        const emis = await fetchAPI(`/repayment/loan/${loanId}`);
        const tbody = document.getElementById('emiTableBody');
        const modalTitle = document.getElementById('emiModalTitle');
        if (modalTitle) modalTitle.textContent = `Repayment Schedule (Loan #${loanId})`;

        if (!tbody) return;
        tbody.innerHTML = '';

        if (emis.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">No EMI records found for this loan.</td></tr>';
        } else {
            const user = getUser();
            const isCustomer = user.role === 'CUSTOMER';

            emis.forEach((emi, index) => {
                const tr = document.createElement('tr');
                const actionButton = (emi.status === 'PENDING' && isCustomer) ?
                    `<button class="btn btn-success btn-sm" onclick="payEMI(${emi.id}, ${loanId})">Pay ₹${emi.emiAmount}</button>` :
                    (emi.status === 'PAID' ? `<span style="color:var(--success);font-size:0.85rem;font-weight:600;">✓ Paid on ${emi.paymentDate ? new Date(emi.paymentDate).toLocaleDateString() : 'Date'}</span>` : '-');

                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${emi.dueDate}</strong></td>
                    <td>₹${emi.emiAmount.toLocaleString('en-IN')}</td>
                    <td><span class="status-badge status-${emi.status}">${emi.status}</span></td>
                    <td>${actionButton}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        const emiModal = document.getElementById('emiModal');
        if (emiModal) emiModal.classList.add('active');
    } catch (err) {
        showToast('Failed to load EMI schedule: ' + err.message, 'error');
    }
};

// --- Pay EMI ---
window.payEMI = async function(emiId, loanId) {
    if (!confirm("Confirm payment for this installment?")) return;

    try {
        await fetchAPI(`/repayment/pay/${emiId}`, { method: 'POST' });
        showToast('EMI payment processed successfully!', 'success');
        openEMISchedule(loanId);
        loadCustomerLoans();
    } catch (err) {
        showToast('Payment Failed: ' + err.message, 'error');
    }
};
