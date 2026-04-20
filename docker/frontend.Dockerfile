# Frontend container scaffold.
# This file exists so the React application can be containerized later without changing the repository layout.

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Vite dev server keeps the Docker-based local workflow aligned with the rest of the monorepo.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
