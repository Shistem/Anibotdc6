# Use an official Node.js runtime as a parent image
FROM node:17

# Set the working directory in the container
WORKDIR /app

# Install any needed packages specified in package.json
COPY package.json .
RUN npm install

# Copy the current directory contents into the container at /app
COPY . .

# Define environment variable


# Run the command to start your bot when the container launches
CMD ["node", "bot.mjs"]
