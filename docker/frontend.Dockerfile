FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY frontend/package*.json /app/

# Install dependencies
RUN npm install

# Copy application code
COPY frontend /app

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
