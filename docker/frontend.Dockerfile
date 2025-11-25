FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy application code
COPY frontend /app

# Install dependencies (after copying source to avoid overwriting node_modules)
# Delete package-lock.json to force fresh resolution of optional dependencies
RUN rm -f package-lock.json && \
    npm install && \
    # Manually install rollup ARM64 binary to work around npm optional dependency bug
    npm install @rollup/rollup-linux-arm64-musl --save-optional

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
