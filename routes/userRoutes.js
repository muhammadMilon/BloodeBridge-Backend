const express = require("express");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const { getCollections } = require("../config/database");
const requireAuth = require("../middleware/auth");
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

// Login route
// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const { users } = getCollections();

    // Find user by email
    const user = await users.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check if user has a password (for existing users migrating from Firebase)
    if (!user.password) {
      // If no password, user needs to set one first
      // This handles migration from Firebase auth
      return res.status(403).json({
        message: "Please set your password first. Use /set-password endpoint.",
        needsPassword: true,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check if user account is active
    if (user.status && user.status !== "active") {
      return res.status(403).json({
        message: "Account is not active. Please contact support.",
      });
    }

    // Create session
    req.session.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name || "",
      image: user.image || "",
      role: user.role || "donor",
      status: user.status || "active",
      bloodGroup: user.bloodGroup || "",
      district: user.district || "",
      upazila: user.upazila || "",
      phone: user.phone || "",
    };

    // Update login count
    await users.updateOne(
      { _id: user._id },
      { $inc: { loginCount: 1 }, $set: { lastLogin: new Date().toISOString() } }
    );

    res.json({
      message: "Login successful",
      user: {
        id: req.session.user.id,
        email: req.session.user.email,
        name: req.session.user.name,
        image: req.session.user.image,
        role: req.session.user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Social Login route (Handle Firebase login on backend)
router.post("/social-login", async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const { users } = getCollections();
        const user = await users.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            // User should be created by /add-user before calling this, or handle creation here.
            // For now, assume creation is handled or return 404
            return res.status(404).json({ message: "User not found" });
        }

        // Check active stats
        if (user.status && user.status !== "active") {
            return res.status(403).json({
                 message: "Account is not active. Please contact support.",
            });
        }

        // Create session
        req.session.user = {
            id: user._id.toString(),
            email: user.email,
            name: user.name || "",
            image: user.image || "",
            role: user.role || "donor",
            status: user.status || "active",
            bloodGroup: user.bloodGroup || "",
            district: user.district || "",
            upazila: user.upazila || "",
            phone: user.phone || "",
        };

        // Update login stats
        await users.updateOne(
            { _id: user._id },
            { $inc: { loginCount: 1 }, $set: { lastLogin: new Date().toISOString() } }
        );

        res.json({
            message: "Social login successful",
            user: {
                 id: req.session.user.id,
                 email: req.session.user.email,
                 role: req.session.user.role,
            }
        });

    } catch (error) {
        console.error("Social login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Set password (for users migrating from Firebase or setting initial password)
router.post("/set-password", async (req, res) => {
  try {
    const { email, password, temporaryToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const { users } = getCollections();
    const user = await users.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with password
    await users.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    res.json({
      message: "Password set successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Set password error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Logout route
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        message: "Failed to logout",
      });
    }

    res.clearCookie("bloodbridge.sid"); // Clear the session cookie
    res.json({
      message: "Logout successful",
    });
  });
});

// Check authentication status
router.get("/check-auth", (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      authenticated: true,
      user: {
        id: req.session.user.id,
        email: req.session.user.email,
        name: req.session.user.name,
        image: req.session.user.image,
        role: req.session.user.role,
      },
    });
  }

  res.json({
    authenticated: false,
  });
});

// Add user (registration)
router.post("/add-user", async (req, res) => {
  console.log("Received /add-user request:", JSON.stringify(req.body, null, 2));
  try {
    const { users } = getCollections();
    const userData = req.body;

    // Check if user already exists
    const find_result = await users.findOne({
      email: userData.email.toLowerCase().trim(),
    });

    if (find_result) {
      // If user exists but has no password (migrated from Firebase), set the password
      if (!find_result.password && userData.password) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await users.updateOne(
          { email: userData.email.toLowerCase().trim() },
          {
            $set: {
              password: hashedPassword,
              loginCount: (find_result.loginCount || 0) + 1,
              // Update other fields if provided
              ...(userData.name && { name: userData.name }),
              ...(userData.image && { image: userData.image }),
              ...(userData.role && { role: userData.role }),
              ...(userData.bloodGroup && { bloodGroup: userData.bloodGroup }),
              ...(userData.district && { district: userData.district }),
              ...(userData.upazila && { upazila: userData.upazila }),
              ...(userData.phone && { phone: userData.phone }),
              ...(userData.availabilityStatus && { availabilityStatus: userData.availabilityStatus }),
            },
          }
        );
        // Return duplicate msg so client knows it wasn't a "new" user, 
        // OR return success? 
        // Client checks for error. If we return 200 with object, it's success.
        // But the original code returned { msg: "user already exist" }.
        // Let's return the updated user or a success message.
        // Actually, for migration flow, let's treat it as a successful "registration/claim".
        return res.json({ message: "User account claimed and password set", insertedId: find_result._id });
      }

      // Update login count and ensure all fields exist
      await users.updateOne(
        { email: userData.email.toLowerCase().trim() },
        {
          $inc: { loginCount: 1 },
          $set: {
            // Update fields if provided, but don't overwrite existing ones unless explicitly provided
            ...(userData.name && { name: userData.name }),
            ...(userData.image && { image: userData.image }),
            ...(userData.role && { role: userData.role }),
            ...(userData.bloodGroup && { bloodGroup: userData.bloodGroup }),
            ...(userData.district && { district: userData.district }),
            ...(userData.upazila && { upazila: userData.upazila }),
            ...(userData.phone && { phone: userData.phone }),
            ...(userData.availabilityStatus && { availabilityStatus: userData.availabilityStatus }),
          },
        }
      );
      return res.send({ msg: "user already exist" });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 10);
    }

    // Create new user with all required fields and defaults
    const newUser = {
      email: userData.email.toLowerCase().trim(),
      name: userData.name || "",
      image: userData.image || "",
      password: hashedPassword, // Store hashed password
      role: userData.role || "donor",
      status: userData.status || "active",
      gender: userData.gender || "male",
      bloodGroup: userData.bloodGroup || "",
      district: userData.district || "",
      upazila: userData.upazila || "",
      phone: userData.phone || "",
      availabilityStatus: userData.availabilityStatus || "available",
      loginCount: 1,
      createdAt: new Date().toISOString(),
      lastDonationDate: userData.lastDonationDate || null,
      healthAssessment: userData.healthAssessment || null,
      reminderPreferences: userData.reminderPreferences || {
        email: true,
        sms: false,
      },
      urgencyLevel: userData.urgencyLevel || "normal",
    };

    const result = await users.insertOne(newUser);
    res.send(result);
  } catch (error) {
    console.error("Add user error:", error);
    res.status(500).json({
      message: "Failed to create user",
    });
  }
});

// Get currently logged in user
router.get("/get-user", requireAuth, async (req, res) => {
  try {
    const { users } = getCollections();

    // Get user from session
    const userId = req.session.user.id;
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      // User in session but not in DB - destroy session
      req.session.destroy();
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Return user data (without password)
    const { password, ...userWithoutPassword } = user;

    // Ensure all required fields exist with defaults
    const userWithDefaults = {
      ...userWithoutPassword,
      name: user.name || user.displayName || "",
      image: user.image || user.photoURL || "",
      role: user.role || "donor",
      status: user.status || "active",
      bloodGroup: user.bloodGroup || "",
      district: user.district || "",
      upazila: user.upazila || "",
      phone: user.phone || "",
      availabilityStatus: user.availabilityStatus || "available",
    };

    res.json(userWithDefaults);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Get user role
router.get("/get-user-role", requireAuth, async (req, res) => {
  try {
    // Get role from session
    const role = req.session.user.role;
    const status = req.session.user.status;

    res.json({
      msg: "ok",
      role: role || null,
      status: status || "active",
    });
  } catch (error) {
    console.error("Get user role error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Get user status
router.get("/get-user-status", requireAuth, async (req, res) => {
  try {
    const status = req.session.user.status || "active";
    res.json({ status });
  } catch (error) {
    console.error("Get user status error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Update user
router.patch("/update-user/:id", requireAuth, async (req, res) => {
  try {
    const { users } = getCollections();
    const { id } = req.params;
    const updatedData = req.body;

    // Ensure user can only update their own profile unless admin
    if (id !== req.session.user.id && req.session.user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden: You can only update your own profile",
      });
    }
    // Allow gender updates
    if (updatedData.gender) {
      // No special handling needed, will be set below
    }

    // Hash password if it's being updated
    if (updatedData.password) {
      updatedData.password = await bcrypt.hash(updatedData.password, 10);
    }

    const result = await users.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    // Update session if user updated their own profile
    if (id === req.session.user.id) {
      const updatedUser = await users.findOne({ _id: new ObjectId(id) });
      if (updatedUser) {
        req.session.user = {
          ...req.session.user,
          name: updatedUser.name || req.session.user.name,
          image: updatedUser.image || req.session.user.image,
          role: updatedUser.role || req.session.user.role,
        };
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Get all users (admin only)
router.get("/get-users", requireAuth, verifyAdmin, async (req, res) => {
  try {
    const { users } = getCollections();
    const usersList = await users
      .find({ email: { $ne: req.session.user.email } })
      .toArray();

    // Remove passwords from response
    const usersWithoutPasswords = usersList.map(({ password, ...user }) => user);

    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Get users for volunteer
router.get("/get-users-for-volunteer", requireAuth, async (req, res) => {
  try {
    const { users } = getCollections();
    const usersList = await users
      .find({ email: { $ne: req.session.user.email } })
      .toArray();

    // Remove passwords from response
    const usersWithoutPasswords = usersList.map(({ password, ...user }) => user);

    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error("Get users for volunteer error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Update user role (admin only)
router.patch("/update-role", requireAuth, verifyAdmin, async (req, res) => {
  try {
    const { users } = getCollections();
    const { email, role } = req.body;

    const result = await users.updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: { role },
      }
    );

    res.json(result);
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// Update user status (admin only)
router.patch("/update-status", requireAuth, verifyAdmin, async (req, res) => {
  try {
    const { users } = getCollections();
    const { email, status } = req.body;

    const result = await users.updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: { status },
      }
    );

    res.json(result);
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = router;
