# Variables
CONTAINER_NAME = kodi-card-frontend
IMAGE_NAME     = nginx:alpine
PORT           = 3000
DIST_DIR       = $(PWD)/dist

.PHONY: help install build dev run stop restart clean logs status

# Default target
help:
	@echo "Available commands:"
	@echo "  make install - Install npm dependencies"
	@echo "  make build   - Build the production frontend assets"
	@echo "  make dev     - Run npm local development server"
	@echo "  make run     - Start Nginx Docker container on port $(PORT) serving $(DIST_DIR)"
	@echo "  make stop    - Stop the Docker container"
	@echo "  make restart - Restart the Docker container"
	@echo "  make logs    - Tail Docker container logs"
	@echo "  make clean   - Stop and remove the Docker container"

# NPM Tasks
install:
	@echo "📦 Installing npm dependencies..."
	npm install

build:
	@echo "🏗️ Building frontend assets via npm..."
	npm run build

dev:
	@echo "⚡ Starting local npm dev server..."
	npm run dev

# Docker Tasks
run:
	@if [ ! -d "$(DIST_DIR)" ]; then \
		echo "⚠️ $(DIST_DIR) does not exist yet. Running build first..."; \
		$(MAKE) build; \
	fi
	@echo "🚀 Starting Nginx container on http://localhost:$(PORT)..."
	@docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):80 \
		-v $(DIST_DIR):/usr/share/nginx/html:ro \
		$(IMAGE_NAME)
	@echo "✅ Container started successfully!"

stop:
	@echo "🛑 Stopping container $(CONTAINER_NAME)..."
	@docker stop $(CONTAINER_NAME) 2>/dev/null || echo "Already stopped."

restart: stop run

logs:
	@docker logs -f $(CONTAINER_NAME)

status:
	@docker ps -f name=$(CONTAINER_NAME)

clean:
	@echo "🧹 Removing container..."
	@docker rm -f $(CONTAINER_NAME) 2>/dev/null || echo "No container to remove."