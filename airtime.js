// ===== COMPLETE airtime.js - COPY ALL =====

// 1. Secure Random
const randomInt = typeof require === "function"
  ? require("crypto").randomInt
  : (max) => {
      const values = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / max) * max;
      do { crypto.getRandomValues(values); } while (values[0] >= limit);
      return values[0] % max;
    };

// 2. STATE - Only ONE of each, no duplicates
let walletBalance = 5000;
let transactions = [];
const vouchers = new Map();
const voucherCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 3. WALLET
function fund_wallet(amount) {
  if (amount < 50) return "Minimum funding is 50";
  walletBalance += amount;
  transactions.push({ type: "Fund Wallet", amount, date: new Date().toLocaleString(), status: "Success" });
  renderAdmin();
  return `Wallet funded. New balance: ₦${walletBalance}`;
}

function check_balance() {
  return `Balance: ₦${walletBalance}`;
}

// 4. BUY AIRTIME
function buy_airtime(phone, network, amount) {
  const validNetworks = ["MTN", "GLO", "AIRTEL", "9MOBILE"];
  if (!validNetworks.includes(network?.toUpperCase())) return "Invalid network";
  if (typeof phone !== "string" || !/^(070|080|081|090)\d{8}$/.test(phone)) return "Invalid phone number";
  if (typeof amount !== "number" || amount < 50 || amount > 5000) return "Invalid amount";
  if (walletBalance < amount) return "Insufficient balance";

  walletBalance -= amount;
  transactions.push({ type: "Airtime", phone, network, amount, date: new Date().toLocaleString(), status: "Success" });
  renderAdmin();
  return "Success";
}

// 5. VOUCHER - GENERATE
function generate_Voucher(amount) {
  if (typeof amount !== "number" || amount < 50 || amount > 5000) throw new RangeError("Amount must be between 50 and 5000");
  let code;
  do {
    const part = () => Array.from({ length: 4 }, () => voucherCharacters[randomInt(voucherCharacters.length)]).join("");
    code = `TXF-${part()}-${part()}`;
  } while (vouchers.has(code));

  const expiryTimestamp = Date.now() + 60 * 60 * 1000;
  const voucher = { code, amount, expiryTime: new Date(expiryTimestamp).toISOString(), expiryTimestamp, status: "unused" };
  vouchers.set(code, voucher);
  transactions.push({ type: "Voucher Generated", code, amount, date: new Date().toLocaleString(), status: "unused" });
  renderAdmin();
  return { code, amount, expiryTime: voucher.expiryTime, status: voucher.status };
}

// 6. VOUCHER - REDEEM
function redeem_Voucher(code) {
  const voucher = vouchers.get(code);
  if (!voucher) throw new Error("Voucher not found");
  if (Date.now() >= voucher.expiryTimestamp) throw new Error("Voucher has expired");
  if (voucher.status === "used") throw new Error("Voucher has already been used");

  voucher.status = "used";
  walletBalance += voucher.amount;
  transactions.push({ type: "Voucher Redeemed", code, amount: voucher.amount, date: new Date().toLocaleString(), status: "Success" });
  renderAdmin();
  return { code: voucher.code, amount: voucher.amount, status: voucher.status };
}

// 7. ADMIN PAGE - RENDER
function renderAdmin() {
  if (typeof document === "undefined") return; // Don't run in Node.js

  const balanceEl = document.getElementById("wallet-balance");
  if (balanceEl) balanceEl.textContent = `₦${walletBalance.toLocaleString()}`;

  const vBody = document.getElementById("vouchers-tbody");
  if (vBody) {
    vBody.innerHTML = "";
    if (vouchers.size === 0) {
      vBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No vouchers yet</td></tr>`;
    } else {
      vouchers.forEach((v) => {
        const isExpired = Date.now() >= v.expiryTimestamp;
        const showStatus = isExpired ? "expired" : v.status;
        vBody.innerHTML += `<tr><td>${v.code}</td><td>₦${v.amount}</td><td>${showStatus}</td><td>${new Date(v.expiryTimestamp).toLocaleString()}</td></tr>`;
      });
    }
  }

  const tBody = document.getElementById("transactions-tbody");
  if (tBody) {
    tBody.innerHTML = "";
    if (transactions.length === 0) {
      tBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No transactions yet</td></tr>`;
    } else {
      transactions.forEach((t, i) => {
        tBody.innerHTML += `<tr><td>#${i+1}</td><td>${t.type} ${t.phone || t.code || ""}</td><td>₦${t.amount}</td><td>${t.date}</td><td>${t.status}</td></tr>`;
      });
    }
  }
}

// 8. REDEEM BUTTON
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    renderAdmin();
    const btn = document.getElementById("redeem-voucher-btn");
    const input = document.getElementById("voucher-code-input");
    const feedback = document.getElementById("redeem-feedback");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const code = input.value.trim().toUpperCase();
      try {
        const result = redeem_Voucher(code);
        feedback.textContent = `Success! ₦${result.amount} redeemed.`;
        feedback.className = "redeem-feedback feedback-success";
        input.value = "";
      } catch (err) {
        feedback.textContent = err.message;
        feedback.className = "redeem-feedback feedback-error";
      }
    });
  });
}