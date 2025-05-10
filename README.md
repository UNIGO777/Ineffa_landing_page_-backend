# Ineffa Backend API

This is the backend API for the Ineffa landing page. It provides endpoints for managing admin authentication, consultations, payments, and notifications.

## Features

- Admin authentication with OTP verification via email
- Consultation management
- Payment processing
- Notification system

## Project Structure

```
├── config/
│   └── nodemailer.js     # Email configuration
├── controllers/
│   ├── adminController.js      # Admin authentication
│   ├── consultationController.js # Consultation management
│   ├── notificationController.js # Notification management
│   └── paymentController.js     # Payment processing
├── middleware/
│   └── Auth.js           # JWT authentication middleware
├── models/
│   ├── AdminModel.js     # Admin model
│   ├── Consultation.js   # Consultation model
│   ├── Notification.js   # Notification model
│   └── Payment.js        # Payment model
├── routes/
│   ├── adminRoutes.js    # Admin routes
│   ├── consultationRoutes.js # Consultation routes
│   ├── index.js          # Main router
│   ├── notificationRoutes.js # Notification routes
│   └── paymentRoutes.js  # Payment routes
├── utils/
│   ├── appError.js       # Error handling
│   └── catchAsync.js     # Async error wrapper
├── .env                  # Environment variables
├── .env.example         # Example environment variables
├── package.json         # Dependencies
└── server.js            # Entry point
```

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Admin Routes

- `POST /api/admin/send-otp` - Send OTP to admin's email
- `POST /api/admin/login` - Login with phone number, password, and OTP
- `GET /api/admin/profile` - Get admin profile (protected)

### Consultation Routes

- `POST /api/consultations` - Create a new consultation request (public)
- `GET /api/consultations` - Get all consultations (protected)
- `GET /api/consultations/stats` - Get consultation statistics (protected)
- `GET /api/consultations/:id` - Get a specific consultation (protected)
- `PATCH /api/consultations/:id` - Update consultation status (protected)
- `DELETE /api/consultations/:id` - Delete a consultation (protected)

### Payment Routes (all protected)

- `GET /api/payments` - Get all payments
- `GET /api/payments/stats` - Get payment statistics
- `GET /api/payments/:id` - Get a specific payment
- `POST /api/payments` - Create a new payment
- `PATCH /api/payments/:id` - Update payment status
- `DELETE /api/payments/:id` - Delete a payment

### Notification Routes (all protected)

- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread` - Get unread notifications
- `GET /api/notifications/:id` - Get a specific notification
- `POST /api/notifications` - Create a new notification
- `PATCH /api/notifications/:id/read` - Mark a notification as read
- `PATCH /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete a notification
- `DELETE /api/notifications/read` - Delete all read notifications

## Authentication

The API uses JWT for authentication. Protected routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

To get a token, use the login endpoint with a valid phone number, password, and OTP.

## Admin Login Flow

1. Request an OTP using the `/api/admin/send-otp` endpoint with the admin's phone number
2. The OTP will be sent to the admin's registered email
3. Use the `/api/admin/login` endpoint with the phone number, password, and OTP to get a JWT token
4. Use the JWT token for subsequent requests to protected endpoints# Ineffa_landing_page_-backend
