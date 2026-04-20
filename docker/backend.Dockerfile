# Backend container scaffold.
# This file exists so the Express API can be containerized later as a separate deployable unit.

FROM node:20-alpine
WORKDIR /app

# Install dependencies separately to maximize Docker cache hits.
COPY package*.json ./
RUN npm install

# Copy backend source after dependencies are installed.
COPY . .

EXPOSE 3000

# Start backend API.
CMD ["npm", "start"]
