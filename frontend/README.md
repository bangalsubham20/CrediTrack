# CrediTrack Frontend

This folder contains the decoupled client-side web interface for **CrediTrack**.

## Folder Structure
```
frontend/
├── index.html        # Login & Registration page
├── dashboard.html    # Customer Loan & EMI Repayment Dashboard
├── css/
│   └── style.css     # Styling and UI components
├── js/
│   └── app.js        # Auth, Loan & EMI API interactions
└── README.md
```

## How to Run

### 1. Start the Spring Boot Backend
Ensure the backend is running on `http://localhost:8080`.
```bash
# In the root project directory:
./mvnw spring-boot:run
# or if maven is installed:
mvn spring-boot:run
```

### 2. Launch the Frontend
You can serve this frontend using any static file server or tool:

- **VS Code Live Server**: Right-click `index.html` and select **"Open with Live Server"**.
- **Node.js `serve` / `http-server`**:
  ```bash
  npx serve .
  ```
- **Python HTTP Server**:
  ```bash
  python -m http.server 3000
  ```
- **Direct browser opening**: Open `index.html` in your browser.
