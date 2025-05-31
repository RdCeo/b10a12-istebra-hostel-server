# 🌐 Istebraa Hostel Management Server

Hi! I’m **Md. Moniruzzaman**, and this repository contains the **server-side implementation** of my **Istebraa Hostel Management System**. It’s built using **Node.js**, **Express.js**, **MongoDB**, and other technologies. This project is designed to handle core backend functionalities like **user authentication**, **meal management**, **admin controls**, and **Stripe payment integration** for a modern hostel management solution.

---

## 🌐 Server Live Link

👉 [https://b10a12-istebra-hostel-server.vercel.app/]

---

## 🚀 Features

### 🔐 User Authentication & Authorization
- Secure **JWT-based authentication** with role-based access control.
- **Cookie-based token management** for secure and persistent sessions.

### 🛡️ Admin Controls
- Manage users, roles, and perform admin-only actions.
- Admin-exclusive access to meal management and review control features.

### 🍽️ Meal Management
- Add, update, view, and delete meals (Admin only).
- Filter and sort meals by category, likes, and other criteria.

### 📝 Review System
- Users can add, view, and manage meal reviews.
- Admins can monitor, approve, or update review statuses.

### 📦 Meal Requests
- Users can submit meal requests for admin review.
- Admins have full control to approve or reject requests.

### 💳 Stripe Payment Integration
- **Stripe-powered payment processing** for secure transactions.
- Manage payment history and premium subscriptions.

### 🛡️ Security Middleware
- Custom middleware for **token verification** and **admin role checks**.
- Protects routes and prevents unauthorized access.

### 📊 Database Management
- MongoDB collections for users, meals, reviews, payments, and requests.
- Efficient queries and optimized data retrieval.

### 🔍 Search & Filter
- Dynamic search across users and meals.
- Case-insensitive, partial matching for an improved experience.

---

## 🛠️ Technologies Used

- **Backend Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JSON Web Token (JWT)
- **Payment Integration**: Stripe
- **Environment Management**: dotenv
- **Middleware**: cookie-parser, cors

---

## 🚀 Getting Started

### Clone the Repository
```bash
git clone https://github.com/RdCeo/b10a12-istebra-hostel-server.git
