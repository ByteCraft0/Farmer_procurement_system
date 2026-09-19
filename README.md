# 🌾 AgroNex

### Smart Procurement & Queue Management Platform for Farmers

AgroNex is a web-based prototype designed to make agricultural procurement more organized, transparent, and efficient.

The platform helps farmers book procurement slots, receive queue tokens, track their position, and monitor procurement and payment status, while providing procurement-centre staff with tools to manage bookings and queues.

> **THIS IS A PROTOTYPE — Some features are simulated for demonstration purposes.**

---

## 🚜 Problem

Farmers often face:

- Long waiting times at procurement centres
- Lack of information about procurement schedules
- Uncertainty about their position in the queue
- Difficulty tracking procurement and payment status
- Congestion at procurement centres

AgroNex addresses these challenges through digital slot booking, token-based queue management, notifications, and status tracking.

---

## 💡 Solution

AgroNex provides two main interfaces.

### 👨‍🌾 Farmer Dashboard

Farmers can:

- Register and log in
- Select a procurement centre
- Select a date and available time slot
- Book a procurement slot
- Receive a queue/token number
- View their queue position
- See the currently serving token
- View estimated waiting time
- Track procurement status
- Track payment status
- Receive notifications

### 🏢 Procurement Centre Dashboard

Centre staff can:

- View today's bookings
- Monitor the queue
- See the current token being served
- Call the next farmer
- Update booking status
- Manage the procurement queue

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 Authentication | Farmer and staff registration/login |
| 📅 Slot Booking | Book a procurement slot for a selected date |
| 🎟️ Token System | Automatic token-based queue management |
| 📊 Queue Tracking | View current token, position and estimated wait |
| 🏢 Staff Dashboard | Manage bookings and queue operations |
| 🔔 Notifications | Notify users about relevant booking updates |
| 🌾 Procurement Tracking | Track procurement progress |
| 💳 Payment Tracking | Track payment status |
| 📱 Responsive UI | Designed for desktop and mobile-friendly use |

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │       Farmer        │
                    │   Web / Mobile UI   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │  TypeScript + Vite  │
                    └──────────┬──────────┘
                               │
                         REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Node.js + Express │
                    │       Backend       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       MySQL         │
                    │      Database       │
                    └─────────────────────┘
                               ▲
                               │
                    ┌──────────┴──────────┐
                    │  Procurement Staff  │
                    │      Dashboard      │
                    └─────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- TanStack Router
- TanStack React Query

### Backend

- Node.js
- Express.js
- REST APIs
- JWT-based authentication

### Database

- MySQL
- MySQL Workbench

### Development Tools

- Git
- GitHub
- Visual Studio Code
- npm

---

## 📁 Project Structure

```text
AGRONEXNEW/
│
├── backend/
│   ├── db.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── database/
│   └── schema.sql
│
├── public/
│   ├── favicon.png
│   └── robots.txt
│
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── routes/
│   ├── styles.css
│   └── router.tsx
│
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/ByteCraft0/Farmer_procurement_system.git
cd Farmer_procurement_system
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Configure the database

Create a MySQL database named:

```text
fpms_db
```

Then run the database schema located at:

```text
database/schema.sql
```

You can execute the schema using MySQL Workbench.

### 4. Configure backend environment variables

Create the following file:

```text
backend/.env
```

Add your local MySQL configuration and other required environment variables.

> **Do not commit `.env` files, passwords, API keys, or other secrets to GitHub.**

### 5. Install backend dependencies

Open a terminal in the project root and run:

```bash
cd backend
npm install
```

### 6. Start the backend

```bash
npm start
```

The backend runs locally on:

```text
http://localhost:5000
```

### 7. Start the frontend

Open another terminal in the project root:

```bash
npm run dev
```

The frontend runs locally on:

```text
http://localhost:8080
```

---

## 🗄️ Database

AgroNex uses **MySQL as its primary data store**.

The database contains tables for:

- Users
- Farmers
- Procurement Centres
- Slots
- Bookings
- Notifications
- Procurements
- Payments

The current database schema is available at:

```text
database/schema.sql
```

---

## 🔄 Core Booking Flow

```text
Farmer
   │
   ▼
Select Procurement Centre
   │
   ▼
Select Date & Available Slot
   │
   ▼
Book Slot
   │
   ▼
Receive Token
   │
   ▼
Join Queue
   │
   ▼
Track Queue Position
   │
   ▼
Staff Calls Token
   │
   ▼
Procurement
   │
   ▼
Payment Status
```

---

## 🔐 Security

The prototype includes:

- JWT-based authentication
- Role-based access for farmer and staff workflows
- Environment variables for sensitive configuration
- Server-side API validation
- MySQL-backed persistent data

Sensitive configuration files such as `.env` are excluded from version control.

---

## 📈 Scalability & Future Scope

The prototype can be extended with:

- SMS notifications
- WhatsApp notifications
- Offline and low-connectivity support
- Jan Seva Kendra assisted booking
- Multi-centre deployment
- Advanced procurement analytics
- Real-time notification services
- Cloud deployment
- Dedicated mobile application

---

## 🎯 Smart India Hackathon

**Problem Statement:** 26032

**Problem:** Farmers often face long waiting times, lack of information regarding procurement schedules, and uncertainty about procurement status.

AgroNex was developed as a prototype to address these challenges through:

- Farmer registration
- Slot booking
- Real-time queue management
- Notifications
- Procurement status tracking
- Payment status tracking
- Reduced congestion at procurement centres

---

## 👥 Team

### AgroNex — SIH 2026 Prototype

Built as a collaborative project for the **Smart India Hackathon 2026 internal round**.

---

## 📌 Project Status

🟢 **Prototype — ~80% functional**

The current version demonstrates the core farmer booking and procurement-centre queue-management workflow.

Some integrations and production-level services are simulated or remain part of the future scope.

---

## 📄 License

This project is currently intended as an academic and hackathon prototype.