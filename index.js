const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const { connectDB, getDB } = require("./config/database");

// Import routes
const userRoutes = require("./routes/userRoutes");
const donorRoutes = require("./routes/donorRoutes");
const donationRoutes = require("./routes/donationRoutes");
const blogRoutes = require("./routes/blogRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration - allow credentials for cookies
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173" || "https://bloodbridge-2026.web.app/",
    credentials: true, // Allow cookies to be sent
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Session configuration
app.use(
  session({
    name: "bloodbridge.sid", // Session cookie name
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: process.env.DB_NAME || "blood_donation",
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // 14 days in seconds
      autoRemove: "native",
      touchAfter: 24 * 3600, // Lazy session update - only update once per day
    }),
    cookie: {
      httpOnly: true, // Prevent XSS attacks
      // Secure false for localhost as requested, otherwise header checking might fail if no https
      secure: process.env.NODE_ENV === "production", 
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    },
  })
);

// Root route (no auth needed for health check)
app.get("/", async (req, res) => {
  res.json({ 
    message: "Server is running!",
    session: req.session.id ? "Session active" : "No session"
  });
});

// Initialize database and routes
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seed default admin user (if not exists)
    try {
      const seedAdmin = require("./scripts/seedAdmin");
      await seedAdmin();
    } catch (seedError) {
      console.warn("Warning: Could not seed admin user:", seedError.message);
      // Continue server startup even if seeding fails
    }

    // Use routes
    app.use(userRoutes);
    app.use(donorRoutes);
    app.use(donationRoutes);
    app.use(blogRoutes);
    app.use(contactRoutes);

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
      console.log(`Session store: MongoDB`);
      console.log(`CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:5173" "https://bloodbridge-2026.web.app/"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
