const express = require("express");
const { getCollections } = require("../config/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Add donor
router.post("/add-donor", async (req, res) => {
  try {
    const { donorInfo } = getCollections();
    const data = req.body;
    const result = await donorInfo.insertOne(data);
    res.json(result);
  } catch (error) {
    console.error("Add donor error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get donor history stats
router.get("/donor-history", async (req, res) => {
  try {
    const { donorInfo } = getCollections();
    const pipeline = [
      {
        $group: {
          _id: "$donorEmail",
          totalDonations: { $sum: 1 },
          lastDonationDate: { $max: "$createdAt" },
        },
      },
    ];
    const stats = await donorInfo.aggregate(pipeline).toArray();
    res.json(stats);
  } catch (error) {
    console.error("Get donor history stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get donor history by email
router.get("/donor-history/:email", requireAuth, async (req, res) => {
  try {
    const { donorInfo } = getCollections();
    const { email } = req.params;

    // Ensure user can only access their own history unless admin
    if (email !== req.session.user.email && req.session.user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden: You can only access your own donation history",
      });
    }

    const stats = await donorInfo
      .find({ donorEmail: email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(stats);
  } catch (error) {
    console.error("Get donor history error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Find donor by donation ID
router.get("/find-donor", requireAuth, async (req, res) => {
  try {
    const { donorInfo } = getCollections();
    const { donationId } = req.query;
    const data = await donorInfo.find({ donationId }).toArray();
    res.json(data);
  } catch (error) {
    console.error("Find donor error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all donors
router.get("/get-donors", async (req, res) => {
  try {
    const { users } = getCollections();
    const donors = await users.find({}).toArray(); // REMOVED FILTER FOR DEBUGGING
    console.log(`Found ${donors.length} donors with role: 'donor'`);

    // Remove passwords from response
    const donorsWithoutPasswords = donors.map(({ password, ...donor }) => donor);

    res.json(donorsWithoutPasswords);
  } catch (error) {
    console.error("Get donors error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
