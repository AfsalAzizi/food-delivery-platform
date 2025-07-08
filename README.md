# Food Delivery Microservices Platform

## Project Overview
A comprehensive food delivery platform built with Node.js microservices architecture, implementing event-driven communication, saga pattern for distributed transactions, and using both MongoDB and PostgreSQL databases.

## Technology Stack
- **Backend**: Node.js, Express.js
- **Databases**: PostgreSQL, MongoDB
- **Message Queue**: RabbitMQ or Redis
- **Frontend**: React + Router (Web), Flutter (Mobile)
- **BFF Layer**: Express.js API Gateway
- **Authentication**: JWT tokens
- **Caching**: Redis (optional)

## Architecture Flow

```
React App ←→ Express.js BFF ←→ Individual Microservices ←→ Message Queue
Flutter App ←→ Express.js BFF ←→ Individual Microservices ←→ Message Queue
```

### Request Flow Examples

**User Places Order:**
```
React App → Express BFF → Order Service → Publishes "order.placed" event
                      ↓
Message Queue → Restaurant Service (check availability)
             → Payment Service (process payment)
             → Delivery Service (assign driver)
             → Notification Service (send confirmations)
```

**Restaurant Updates Menu:**
```
React Admin → Express BFF → Restaurant Service → Publishes "menu.updated" event
                         ↓
Message Queue → Notification Service (notify customers)
             → Order Service (update pricing cache)
```

## Core Services

### 1. User Service (Port 3001)
**Database**: PostgreSQL
**Purpose**: User authentication, profiles, and address management

**Database Schema:**
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL, -- 'home', 'work', 'other'
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key APIs:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `POST /users/addresses` - Add address
- `GET /users/addresses` - Get user addresses
- `PUT /users/addresses/:id` - Update address
- `DELETE /users/addresses/:id` - Delete address

**Events Published:**
- `user.created`
- `user.updated`
- `user.address.added`

**Events Consumed:**
- `order.completed` (update user order history)

### 2. Restaurant Service (Port 3002)
**Database**: MongoDB
**Purpose**: Restaurant information, menu management, and availability

**Database Schema:**
```javascript
// restaurants collection
{
  _id: ObjectId,
  name: "Pizza Palace",
  description: "Best pizza in town",
  cuisine_type: "Italian",
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    postal_code: "10001",
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    }
  },
  contact: {
    phone: "+1-234-567-8900",
    email: "info@pizzapalace.com"
  },
  operating_hours: {
    monday: { open: "10:00", close: "22:00", closed: false },
    tuesday: { open: "10:00", close: "22:00", closed: false },
    // ... other days
  },
  delivery_radius: 5.0, // km
  minimum_order: 15.00,
  delivery_fee: 2.50,
  rating: 4.5,
  total_reviews: 150,
  is_active: true,
  created_at: ISODate,
  updated_at: ISODate
}

// menu_items collection
{
  _id: ObjectId,
  restaurant_id: ObjectId,
  name: "Margherita Pizza",
  description: "Fresh tomatoes, mozzarella, basil",
  category: "Pizza",
  price: 12.99,
  image_url: "https://example.com/pizza.jpg",
  ingredients: ["tomatoes", "mozzarella", "basil"],
  dietary_info: ["vegetarian"],
  is_available: true,
  preparation_time: 20, // minutes
  created_at: ISODate,
  updated_at: ISODate
}

// categories collection
{
  _id: ObjectId,
  restaurant_id: ObjectId,
  name: "Pizza",
  description: "Delicious hand-tossed pizzas",
  sort_order: 1,
  is_active: true
}
```

**Key APIs:**
- `GET /restaurants` - List restaurants (with filters)
- `GET /restaurants/:id` - Get restaurant details
- `POST /restaurants` - Create restaurant (admin)
- `PUT /restaurants/:id` - Update restaurant
- `GET /restaurants/:id/menu` - Get restaurant menu
- `POST /restaurants/:id/menu-items` - Add menu item
- `PUT /restaurants/:id/menu-items/:itemId` - Update menu item
- `DELETE /restaurants/:id/menu-items/:itemId` - Delete menu item
- `GET /restaurants/search` - Search restaurants by location/cuisine

**Events Published:**
- `restaurant.created`
- `restaurant.updated`
- `menu.item.added`
- `menu.item.updated`
- `menu.item.removed`
- `restaurant.availability.changed`

**Events Consumed:**
- `order.placed` (update item availability if needed)

### 3. Order Service (Port 3003)
**Database**: PostgreSQL
**Purpose**: Order management, status tracking, and order history

**Database Schema:**
```sql
-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    restaurant_id UUID NOT NULL,
    delivery_address JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, confirmed, preparing, ready, picked_up, delivered, cancelled
    subtotal DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    special_instructions TEXT,
    estimated_delivery_time TIMESTAMP,
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL,
    menu_item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    special_requests TEXT
);

-- Order status history table
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

**Key APIs:**
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order details
- `PUT /orders/:id/status` - Update order status
- `GET /users/:userId/orders` - Get user order history
- `GET /restaurants/:restaurantId/orders` - Get restaurant orders
- `POST /orders/:id/cancel` - Cancel order

**Events Published:**
- `order.placed`
- `order.confirmed`
- `order.preparing`
- `order.ready`
- `order.picked_up`
- `order.delivered`
- `order.cancelled`

**Events Consumed:**
- `payment.completed` (confirm order)
- `payment.failed` (cancel order)
- `delivery.assigned` (update order status)
- `delivery.delivered` (mark as delivered)

### 4. Payment Service (Port 3004)
**Database**: PostgreSQL
**Purpose**: Payment processing and transaction management

**Database Schema:**
```sql
-- Payment methods table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'credit_card', 'debit_card', 'paypal', 'wallet'
    provider VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'razorpay'
    external_id VARCHAR(255) NOT NULL, -- Provider's payment method ID
    last_four VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    user_id UUID NOT NULL,
    payment_method_id UUID REFERENCES payment_methods(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, processing, completed, failed, refunded
    provider_transaction_id VARCHAR(255),
    provider_response JSONB,
    failure_reason TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refunds table
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    order_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    provider_refund_id VARCHAR(255),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key APIs:**
- `POST /payment-methods` - Add payment method
- `GET /users/:userId/payment-methods` - Get user payment methods
- `DELETE /payment-methods/:id` - Remove payment method
- `POST /payments/process` - Process payment
- `POST /payments/:id/refund` - Process refund
- `GET /payments/:id/status` - Get payment status

**Events Published:**
- `payment.initiated`
- `payment.processing`
- `payment.completed`
- `payment.failed`
- `payment.refunded`

**Events Consumed:**
- `order.placed` (initiate payment)
- `order.cancelled` (process refund if needed)

### 5. Delivery Service (Port 3005)
**Database**: PostgreSQL
**Purpose**: Driver management and delivery tracking

**Database Schema:**
```sql
-- Drivers table
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- 'bike', 'car', 'scooter'
    vehicle_number VARCHAR(20) NOT NULL,
    current_location JSONB,
    is_available BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    total_deliveries INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliveries table
CREATE TABLE deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    driver_id UUID REFERENCES drivers(id),
    pickup_address JSONB NOT NULL,
    delivery_address JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'assigned',
    -- Status: assigned, picked_up, in_transit, delivered, cancelled
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    estimated_delivery_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    delivery_notes TEXT
);

-- Delivery tracking table
CREATE TABLE delivery_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
    location JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

**Key APIs:**
- `POST /drivers` - Register driver
- `GET /drivers/:id` - Get driver details
- `PUT /drivers/:id/location` - Update driver location
- `PUT /drivers/:id/availability` - Update driver availability
- `POST /deliveries/assign` - Assign delivery to driver
- `PUT /deliveries/:id/status` - Update delivery status
- `GET /deliveries/:id/track` - Get delivery tracking info

**Events Published:**
- `delivery.assigned`
- `delivery.picked_up`
- `delivery.in_transit`
- `delivery.delivered`
- `delivery.cancelled`
- `driver.location.updated`

**Events Consumed:**
- `order.confirmed` (assign driver)
- `order.ready` (notify driver for pickup)

### 6. Notification Service (Port 3006)
**Database**: MongoDB
**Purpose**: Push notifications, emails, and SMS

**Database Schema:**
```javascript
// notifications collection
{
  _id: ObjectId,
  user_id: "uuid-string",
  type: "order_confirmed", // order_confirmed, order_ready, delivery_assigned, etc.
  channel: "push", // push, email, sms
  title: "Order Confirmed!",
  message: "Your order from Pizza Palace has been confirmed.",
  data: {
    order_id: "uuid-string",
    restaurant_name: "Pizza Palace",
    // ... other relevant data
  },
  status: "sent", // pending, sent, delivered, failed
  sent_at: ISODate,
  delivered_at: ISODate,
  created_at: ISODate
}

// notification_templates collection
{
  _id: ObjectId,
  type: "order_confirmed",
  channel: "push",
  template: {
    title: "Order Confirmed!",
    message: "Your order from {{restaurant_name}} has been confirmed. Estimated delivery: {{estimated_time}}.",
    action_url: "/orders/{{order_id}}"
  },
  is_active: true,
  created_at: ISODate
}

// user_preferences collection
{
  _id: ObjectId,
  user_id: "uuid-string",
  preferences: {
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    marketing_emails: false
  },
  updated_at: ISODate
}
```

**Key APIs:**
- `POST /notifications/send` - Send notification
- `GET /users/:userId/notifications` - Get user notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `PUT /users/:userId/preferences` - Update notification preferences
- `GET /notifications/templates` - Get notification templates

**Events Published:**
- `notification.sent`
- `notification.delivered`
- `notification.failed`

**Events Consumed:**
- `order.placed` (send confirmation)
- `order.confirmed` (send confirmation)
- `order.ready` (notify user)
- `delivery.assigned` (send driver info)
- `delivery.picked_up` (send tracking info)
- `delivery.delivered` (send completion notice)
- `payment.completed` (send receipt)
- `payment.failed` (send failure notice)

## BFF (Backend for Frontend) Service (Port 3000)

**Purpose**: API Gateway and request aggregation layer

**Key Responsibilities:**
- Authentication and authorization
- Request routing to appropriate microservices
- Data aggregation from multiple services
- Response transformation for frontend consumption
- Caching frequently accessed data
- Rate limiting and security

**Example Aggregated APIs:**
- `GET /api/restaurants/:id/full-details` - Aggregates restaurant info, menu, and user's order history
- `GET /api/orders/:id/complete` - Aggregates order, payment, and delivery info
- `GET /api/users/dashboard` - Aggregates user profile, recent orders, and notifications
- `POST /api/orders/place` - Orchestrates order placement saga

## Message Queue Events

### Event Categories

**User Events:**
- `user.created`
- `user.updated`
- `user.address.added`

**Restaurant Events:**
- `restaurant.created`
- `restaurant.updated`
- `menu.item.added`
- `menu.item.updated`
- `menu.item.removed`
- `restaurant.availability.changed`

**Order Events:**
- `order.placed`
- `order.confirmed`
- `order.preparing`
- `order.ready`
- `order.picked_up`
- `order.delivered`
- `order.cancelled`

**Payment Events:**
- `payment.initiated`
- `payment.processing`
- `payment.completed`
- `payment.failed`
- `payment.refunded`

**Delivery Events:**
- `delivery.assigned`
- `delivery.picked_up`
- `delivery.in_transit`
- `delivery.delivered`
- `delivery.cancelled`
- `driver.location.updated`

**Notification Events:**
- `notification.sent`
- `notification.delivered`
- `notification.failed`

## Saga Pattern Implementation

### Order Placement Saga

**Orchestration Flow:**
1. **Order Service** creates order (status: PENDING)
2. **Restaurant Service** validates availability
3. **Payment Service** processes payment
4. **Delivery Service** assigns driver
5. **Order Service** updates status to CONFIRMED
6. **Notification Service** sends confirmation

**Compensation Actions:**
- **Payment fails** → Cancel order, restore inventory, notify user
- **No driver available** → Refund payment, cancel order, notify user
- **Restaurant unavailable** → Refund payment, cancel order, notify user
- **Order cancelled by user** → Refund payment, free up driver, notify restaurant

### Saga Coordinator Service (Optional)

You can implement a separate saga coordinator service or use choreography pattern where each service handles its own compensations based on events.

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- Set up project structure for all services
- Implement basic CRUD operations for each service
- Set up databases (PostgreSQL and MongoDB)
- Create basic REST APIs without messaging

### Phase 2: Message Queue Integration (Weeks 3-4)
- Set up RabbitMQ or Redis
- Implement event publishers and consumers
- Start with simple events (user.created → notification.sent)
- Add service-to-service communication

### Phase 3: Saga Implementation (Weeks 5-6)
- Implement order placement saga
- Add compensation logic
- Handle timeout scenarios
- Add saga monitoring and logging

### Phase 4: BFF and Frontend (Weeks 7-8)
- Create Express.js BFF service
- Implement data aggregation endpoints
- Build basic React frontend
- Add authentication and authorization

### Phase 5: Advanced Features (Weeks 9-10)
- Add real-time tracking with WebSockets
- Implement caching strategies
- Add monitoring and logging
- Performance optimization

### Phase 6: Mobile and Polish (Weeks 11-12)
- Build Flutter mobile app
- Add push notifications
- Implement offline capabilities
- Final testing and deployment

## Environment Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- MongoDB (v6+)
- RabbitMQ or Redis
- Docker (optional, for containerization)

### Port Allocation
- User Service: 3001
- Restaurant Service: 3002
- Order Service: 3003
- Payment Service: 3004
- Delivery Service: 3005
- Notification Service: 3006
- BFF Service: 3000
- React App: 3007

### Database Connections
- PostgreSQL: `postgresql://username:password@localhost:5432/`
- MongoDB: `mongodb://localhost:27017/`
- RabbitMQ: `amqp://localhost:5672`

## Testing Strategy

### Unit Testing
- Test each service independently
- Mock external dependencies
- Test saga compensation logic

### Integration Testing
- Test service-to-service communication
- Test event publishing and consuming
- Test database transactions

### End-to-End Testing
- Test complete order flow
- Test failure scenarios
- Test saga compensations

## Monitoring and Logging

### Key Metrics
- Request latency per service
- Message queue processing time
- Database query performance
- Saga completion rates
- Error rates by service

### Logging Strategy
- Structured logging with correlation IDs
- Centralized logging for all services
- Event tracking for saga flows
- Performance monitoring

## Security Considerations

### Authentication
- JWT tokens for user authentication
- Service-to-service authentication
- API key management for external services

### Authorization
- Role-based access control
- Resource-level permissions
- Rate limiting per user/service

### Data Protection
- Encrypt sensitive data at rest
- Secure API endpoints
- Input validation and sanitization
- PCI compliance for payment data

## Deployment Strategy

### Containerization
- Docker containers for each service
- Docker Compose for local development
- Kubernetes for production deployment

### CI/CD Pipeline
- Automated testing for each service
- Independent deployment of services
- Database migration strategies
- Rolling updates with zero downtime

This comprehensive guide provides the foundation for building a robust, scalable food delivery platform using microservices architecture. Start with Phase 1 and gradually build up the complexity as you master each concept.