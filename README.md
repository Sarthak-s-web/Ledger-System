# Ledger System

A backend-focused financial ledger and transaction system built with **Node.js, Express.js, MongoDB, and Mongoose**.

The project demonstrates secure authentication, account management, double-entry ledger accounting, idempotent transactions, MongoDB transactions, and concurrent transaction handling.

> **Note:** This project is built for learning and demonstrating backend and financial transaction concepts. It is not intended for production banking use.

## 🚀 Features

* 🔐 **JWT Authentication**

  * User registration and login
  * Cookie-based authentication
  * Protected routes
  * Token blacklisting on logout
  * Password hashing with bcryptjs

* 🏦 **Account Management**

  * Create and manage accounts
  * Account status management
  * Ledger-based balance calculation

* 💸 **Fund Transfers**

  * Account-to-account transfers
  * Transaction validation
  * MongoDB transactions
  * Debit and credit ledger entries
  * Email notifications

* 🔁 **Idempotency**

  * Unique idempotency keys prevent duplicate transactions
  * Handles existing transaction states

* ⚡ **Concurrency Handling**

  * MongoDB transaction sessions
  * Conflict detection and transaction retry
  * Helps prevent race conditions during concurrent transfers

* 📒 **Immutable Ledger**

  * Double-entry debit/credit records
  * Ledger entries cannot be modified or deleted

* 🏛️ **System Initial Funds**

  * Separate system-user authorization
  * Initial account funding

## 🛠️ Tech Stack

| Technology | Purpose                   |
| ---------- | ------------------------- |
| Node.js    | Backend runtime           |
| Express.js | REST API                  |
| MongoDB    | Database                  |
| Mongoose   | MongoDB ODM               |
| JWT        | Authentication            |
| bcryptjs   | Password hashing          |
| Nodemailer | Email notifications       |
| dotenv     | Environment configuration |

## 📁 Project Structure

```text
Ledger-System/
│
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── app.js
│
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## 🔄 Transaction Flow

```text
Client
  ↓
Authentication
  ↓
Validation
  ↓
Idempotency Check
  ↓
Account Validation
  ↓
Balance Check
  ↓
MongoDB Transaction
  ↓
DEBIT + CREDIT Ledger Entries
  ↓
Transaction Completed
  ↓
Email Notification
```

### Double-Entry Ledger

For a `₹500` transfer:

```text
Sender Account
      │
      └── DEBIT ₹500
              │
              ↓
         Transaction
              │
              ↓
      CREDIT ₹500
              │
              ↓
Receiver Account
```

Account balance is derived from ledger entries:

```text
Balance = Total Credits - Total Debits
```

## 🌐 API Endpoints

### Authentication

| Method | Endpoint             | Description |
| ------ | -------------------- | ----------- |
| `POST` | `/api/auth/register` | Register    |
| `POST` | `/api/auth/login`    | Login       |
| `POST` | `/api/auth/logout`   | Logout      |

### Accounts

| Method | Endpoint                           | Description       |
| ------ | ---------------------------------- | ----------------- |
| `POST` | `/api/accounts/`                   | Create account    |
| `GET`  | `/api/accounts/`                   | Get user accounts |
| `GET`  | `/api/accounts/balance/:accountId` | Get balance       |

### Transactions

| Method | Endpoint                                 | Description       |
| ------ | ---------------------------------------- | ----------------- |
| `POST` | `/api/transactions/`                     | Transfer funds    |
| `POST` | `/api/transactions/system/initial-funds` | Add initial funds |

## ⚙️ Getting Started

### Prerequisites

* Node.js
* npm
* MongoDB / MongoDB Atlas

### Installation

```bash
git clone https://github.com/Sarthak-s-web/Ledger-System.git
cd Ledger-System
npm install
```

Create a `.env` file:

```env
MONGO_URI=
JWT_SECRET=
EMAIL_USER=
CLIENT_ID=
CLIENT_SECRET=
REFRESH_TOKEN=
```

Start the development server:

```bash
npm run dev
```

> Never commit the `.env` file. It is excluded using `.gitignore`.

## 🧪 Testing

The API can be tested using **Postman**, **Thunder Client**, or any REST API client.

Recommended flow:

```text
Register → Login → Create Account
              ↓
        Add Initial Funds
              ↓
         Check Balance
              ↓
        Transfer Funds
              ↓
        Check Balance
```

## 🔮 Future Improvements

* Automated unit and integration testing
* Swagger/OpenAPI documentation
* Redis caching and rate limiting
* Docker and CI/CD
* Frontend dashboard

## 👨‍💻 Author

**Sarthak Garg**

Backend project built with **Node.js, Express.js, MongoDB, and Mongoose**.

**GitHub:** https://github.com/Sarthak-s-web
