# Digital E-commerce Platform Build Plan

## Phase 1: Database Architecture & Core Setup
- **Models & Migrations:**
  - `User`: Add `is_admin`, `banned_at`, `google_id`, `avatar`.
  - `Product`: Base product details (title, description, image).
  - `ProductVariant`: Variant specifics (name, `price_npr`, `price_usd`, `product_id`).
  - `Order`: Repeat purchase support (`order_number`, `user_id`, `status`, `total_amount`, `currency`, `additional_data`).
  - `OrderItem`: Linking orders to variants.
  - `PaymentReceipt`: For NPR uploads (`order_id`, `file_path`, `status`).
  - `OrderCredential`: For digital delivery credentials (`order_id`, `content`).
  - `OrderMessage`: For integrated support messaging (`order_id`, `user_id`, `message`).
  - `Cart` & `CartItem`: For persistent cart.

## Phase 2: Authentication & Admin Foundation
- **Authentication:**
  - Install and configure `laravel/socialite`.
  - Implement Google-only authentication flow.
  - Remove standard password registration/login views.
- **Admin Dashboard:**
  - Create protected route group and middleware for admins.
  - Build the Admin layout using React, Inertia, and shadcn/ui.
  - Implement User Management (List users, ban/suspend access, delete).

## Phase 3: Product Catalog & Storefront
- **Admin Product Management:**
  - CRUD interfaces for Products and Product Variants.
  - Form validation for mandatory NPR and USD pricing per variant.
- **Storefront (Guest & Auth Views):**
  - Digital product listing page with search and filtering.
  - Guest View: Basic details and price.
  - Authenticated View: In-depth details, variant selection, and "Add to Cart" functionality.

## Phase 4: Cart & Checkout System
- **Cart:**
  - Implement persistent cart management (Add, Remove, Update quantities).
- **Checkout Flow:**
  - Order summary and currency selection.
  - **USD Flow:** Integrate Pocketsflow Public API for automated payment processing and webhook handling.
  - **NPR Flow:** Display Payment QR code, implement secure file upload (images only, max 2MB) for payment receipt.
  - Form to securely attach additional order-specific data (e.g., email/password for top-up).

## Phase 5: Order Management & Digital Fulfillment
- **User Order Page:**
  - Display unique distinct order numbers.
  - Show order status and uploaded receipts.
- **Admin Processing:**
  - Interface to review pending NPR receipts and approve/reject them.
  - Update order statuses ('Pending', 'Delivering', 'Completed').
- **Digital Delivery:**
  - Secure admin interface to attach credentials/links directly to an order.
- **Integrated Support:**
  - Implement a messaging component tied to individual orders for context-specific help.

## Phase 6: Notifications & Security Hardening
- **Automated Notifications:**
  - Create Mailables and trigger emails for: Order Placed, Receipt Approved, Order 'Delivering', and Order 'Completed'.
- **Security:**
  - Enforce strict authorization rules using Laravel Policies (users can only view their own orders/deliverables).
  - Secure local/S3 file storage for receipts and digital deliverables.
