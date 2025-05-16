import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import prisma from './lib/prisma';
import path = require('path');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Use static data in public
app.use("/static", express.static(__dirname + "/public"));

// Connect to database
const connectToDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully!');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

connectToDatabase();

// Routes
app.use('/api', routes);

// Test api
app.get("/", (req, res) => {
  res.json({ message: "welcom to crypto wallet" })
})

if (process.env.ENVIRONMENT === "PRODUCTION") {
  console.log("Production requested");

  // Serve static files from the build folder
  app.use(express.static(path.join(__dirname, "build")));

  // For all other routes, serve index.html (for React Router)
  app.get("/*", async (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;