# Use Node.js 18+ base image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Install concurrently globally
RUN npm install -g concurrently

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose required ports
EXPOSE 1337 5823

# Start the application
CMD ["npm", "run", "startall"] 