const API_BASE = 'http://localhost:8080/api';

// --- Auth Helpers ---
function getToken() {
    return localStorage.getItem('token');
}

function isLoggedIn() {
    return !!getToken();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/index.html';
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

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || data.error || 'Something went wrong');
    }

    return data;
}

// --- App Logic ---

// Login / Register (index.html)
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    if (isLoggedIn()) {
        window.location.href = '/dashboard.html';
    }

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleLinks = document.querySelectorAll('.toggle-link');

    toggleLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-box').style.display =
                document.getElementById('login-box').style.display === 'none' ? 'block' : 'none';
            document.getElementById('register-box').style.display =
                document.getElementById('register-box').style.display === 'none' ? 'block' : 'none';
        });
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const data = await fetchAPI('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({ fullName: data.fullName, role: data.role }));
                window.location.href = '/dashboard.html';
            } catch (err) {
                alert('Login Failed: ' + err.message);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            try {
                const data = await fetchAPI('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ fullName, email, password })
                });
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify({ fullName: data.fullName, role: data.role }));
                window.location.href = '/dashboard.html';
            } catch (err) {
                alert('Registration Failed: ' + err.message);
            }
        });
    }
}

// Dashboard (dashboard.html)
if (window.location.pathname.includes('dashboard')) {
    checkAuth();
    const user = JSON.parse(localStorage.getItem('user'));
    document.getElementById('userName').textContent = user.fullName;
    document.getElementById('logoutBtn').addEventListener('click', logout);

    loadLoans();

    // Open Modal
    document.getElementById('applyLoanBtn').addEventListener('click', () => {
        document.getElementById('loanModal').classList.add('active');
    });

    // Close Modal
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('loanModal').classList.remove('active');
            document.getElementById('emiModal').classList.remove('active');
        });
    });

    // Submit Loan
    document.getElementById('loanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('amount').value;
        const interestRate = document.getElementById('rate').value;
        const tenureMonths = document.getElementById('tenure').value;

        try {
            await fetchAPI('/loans/apply', {
                method: 'POST',
                body: JSON.stringify({ amount, interestRate, tenureMonths })
            });
            alert('Loan Applied Successfully!');
            document.getElementById('loanModal').classList.remove('active');
            loadLoans();
        } catch (err) {
            alert('Loan Application Failed: ' + err.message);
        }
    });
}

async function loadLoans() {
    try {
        const loans = await fetchAPI('/loans/my-loans');
        const container = document.getElementById('loanContainer');
        container.innerHTML = '';

        if (loans.length === 0) {
            container.innerHTML = '<p>No active loans found.</p>';
            return;
        }

        loans.forEach(loan => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>Loan #${loan.id}</h3>
                <p><strong>Amount:</strong> ₹${loan.amount}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${loan.status}">${loan.status}</span></p>
                <p><strong>Tenure:</strong> ${loan.tenureMonths} months</p>
                <p><strong>Interest:</strong> ${loan.interestRate}%</p>
                ${loan.status === 'ACTIVE' ? `<button class="btn btn-secondary" onclick="viewEMIs(${loan.id})">View EMIs</button>` : ''}
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
    }
}

window.viewEMIs = async function (loanId) {
    try {
        const emis = await fetchAPI(`/repayment/loan/${loanId}`);
        const tbody = document.getElementById('emiTableBody');
        tbody.innerHTML = '';

        emis.forEach(emi => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${emi.dueDate}</td>
                <td>₹${emi.emiAmount}</td>
                <td><span class="status-badge status-${emi.status}">${emi.status}</span></td>
                <td>
                    ${emi.status === 'PENDING' ?
                    `<button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="payEMI(${emi.id}, ${loanId})">Pay</button>` :
                    '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('emiModal').classList.add('active');
    } catch (err) {
        alert('Failed to load EMIs: ' + err.message);
    }
};

window.payEMI = async function (emiId, loanId) {
    if (!confirm("Are you sure you want to pay this EMI?")) return;
    try {
        await fetchAPI(`/repayment/pay/${emiId}`, { method: 'POST' });
        alert('Payment Successful!');
        viewEMIs(loanId);
    } catch (err) {
        alert('Payment Failed: ' + err.message);
    }
};
