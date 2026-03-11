# Use official Node.js 20 image as the base runtime
FROM node:20

# Set working directory inside the container
WORKDIR /app

# Copy dependency definition files first to leverage Docker layer cache
COPY package.json package-lock.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Expose Vite development server port
EXPOSE 5173

# Start the Vite dev server and bind to all interfaces for host access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
