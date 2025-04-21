# === Stage 1: Build ===
FROM node:23-alpine AS builder

WORKDIR /app

# Copy only the necessary files first (leverage Docker layer caching)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Then copy the rest
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the project
RUN yarn build


# === Stage 2: Production ===
FROM node:23-alpine

WORKDIR /app

# Only copy what you need to run the app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Set your environment variables (OPTIONAL – better passed at runtime via env or secrets manager)
# These can be removed entirely if you're passing envs from Docker CLI or a platform like GCP Cloud Run
ENV FILE_ENCODING=utf8

# Port exposed by your app
EXPOSE 8080

# Start the app
CMD ["yarn", "start"]