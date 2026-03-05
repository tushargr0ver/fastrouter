
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./
 
# Install dependencies
RUN bun install
 
# Copy the rest of your application files
COPY . .

# Expose the port your app runs on
EXPOSE 3000
 
# Define the command to run your app
CMD ["bun", "start"]