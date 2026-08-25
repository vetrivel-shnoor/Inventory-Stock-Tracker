FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create uploads directory (in case MinIO is bypassed)
RUN mkdir -p public/uploads/profiles public/uploads/products

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
