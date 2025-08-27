// Simulated real payment data (like from bank export)
let paymentStatement = [
  { upi: "UPI123ABC", amount: 499.00 },
  { upi: "REF456XYZ", amount: 999.50 },
  { upi: "PAY789LMN", amount: 299.00 },
  { upi: "TXN001DEF", amount: 500.00 },
  { upi: "GOOGPAY2024", amount: 100.00 }
];

// Fraud history (known fake UPIs)
let fraudHistory = new Set(["FAKE123", "SCAM456"]);

// Local storage keys
const SUBMISSIONS_KEY = "paymentSubmissions";
const COUNTER_KEY = "submissionCounter";

// Initialize storage
function initStorage() {
  if (!localStorage.getItem(SUBMISSIONS_KEY)) {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(COUNTER_KEY)) {
    localStorage.setItem(COUNTER_KEY, "0");
  }
}

// Get current timestamp
function getTimestamp() {
  return new Date().toLocaleString();
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Save submission
function saveSubmission(data) {
  const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY));
  submissions.push(data);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}

// Update dashboard
function updateDashboard() {
  const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY));
  let verified = 0, notFound = 0, fraud = 0;

  submissions.forEach(s => {
    if (s.status === "verified") verified++;
    else if (s.status === "not-found") notFound++;
    else if (s.status === "fraud") fraud++;
  });

  document.getElementById("totalSubmissions").textContent = submissions.length;
  document.getElementById("verifiedCount").textContent = verified;
  document.getElementById("notFoundCount").textContent = notFound;
  document.getElementById("fraudCount").textContent = fraud;

  // Update verified list
  const tbody = document.querySelector("#printTable tbody");
  tbody.innerHTML = "";
  submissions
    .filter(s => s.status === "verified")
    .forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.timestamp}</td>
        <td>${s.upiRef}</td>
        <td>₹${s.amount.toFixed(2)}</td>
        <td>${s.mobile}</td>
      `;
      tbody.appendChild(tr);
    });
}

// Verify payment
function verifyPayment(upiRef, amount, mobile) {
  const cleanUPI = upiRef.trim().toUpperCase();
  const numAmount = parseFloat(amount);

  // Check fraud history
  if (fraudHistory.has(cleanUPI)) {
    return { status: "fraud", message: "🚫 This UPI reference is flagged as fraudulent." };
  }

  // Match in real data
  const match = paymentStatement.find(p => 
    p.upi.toUpperCase() === cleanUPI && Math.abs(p.amount - numAmount) < 0.01
  );

  if (match) {
    // Prevent duplicate use of same UPI+Amount
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY));
    const used = submissions.some(s => 
      s.upiRef.toUpperCase() === cleanUPI && 
      Math.abs(s.amount - numAmount) < 0.01 &&
      s.status === "verified"
    );
    if (used) {
      fraudHistory.add(cleanUPI); // Flag as reused
      return { status: "fraud", message: "🚫 This transaction has already been used. Fraud detected." };
    }
    return { status: "verified", message: "✅ Payment verified successfully!" };
  } else {
    return { status: "not-found", message: "❌ No matching transaction found. Please check UPI ID and amount." };
  }
}

// Handle form submission
document.getElementById("paymentForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const upiRef = document.getElementById("upiRef").value.trim();
  const amount = document.getElementById("amount").value;
  const mobile = document.getElementById("mobile").value;
  const address = document.getElementById("address").value;

  const result = verifyPayment(upiRef, amount, mobile);
  const resultDiv = document.getElementById("result");

  resultDiv.className = result.status;
  resultDiv.textContent = result.message;

  // Save submission
  const submission = {
    id: generateId(),
    timestamp: getTimestamp(),
    upiRef,
    amount: parseFloat(amount),
    mobile,
    address,
    status: result.status,
    notes: result.message
  };

  saveSubmission(submission);

  // Show result
  document.getElementById("form-section").style.display = "none";
  document.getElementById("result-section").style.display = "block";

  // Update dashboard
  updateDashboard();
});

// Reset form
function resetForm() {
  document.getElementById("form-section").style.display = "block";
  document.getElementById("result-section").style.display = "none";
  document.getElementById("paymentForm").reset();
}

// On load
window.onload = function() {
  initStorage();
  updateDashboard();
};
