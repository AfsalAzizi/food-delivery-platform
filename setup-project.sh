#!/bin/bash

echo "🚀 Setting up Food Delivery Platform project structure..."

mkdir -p docs
mkdir -p scripts
mkdir -p .github/workflows

# Backend services
for service in user-service restaurant-service order-service payment-service payment-service delivery-service notification-service bff-service; do 
    echo "📁 Creating structure for $service"
    mkdir -p services/$service/src/{routes,models,controller,middleware,services,utils,config}
    mkdir -p services/$service/tests

done

# Frontend folders
mkdir -p frontend/web-app
mkdir -p frontend/mobile-app
mkdir -p frontend/admin-panel

# Shared resources

mkdir -p shared/{events,middleware,utils,types}


# Infrastructure

mkdir -p infrastructure/database/{postgres,mongodb}
mkdir -p infrastructure/message-queue/rabbitmq
mkdir -p infrastructure/monitoring

echo "✅ Directory structure created successfully!"
command -v tree >/dev/null && tree -d -L 3 || echo "📌 Install 'tree' with 'brew install tree' to see folder output"

echo "🔧 Next steps:"
echo "1. Run 'cd services/user-service' and start setting up the backend"

