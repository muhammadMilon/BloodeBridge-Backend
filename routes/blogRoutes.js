const express = require("express");
const { ObjectId } = require("mongodb");
const { getCollections } = require("../config/database");
const requireAuth = require("../middleware/auth");
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

// Add blog
router.post("/add-blog", async (req, res) => {
  try {
    const { blogs } = getCollections();
    const data = req.body;
    const result = await blogs.insertOne(data);
    res.json(result);
  } catch (error) {
    console.error("Add blog error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all blogs (protected)
router.get("/get-blogs", requireAuth, async (req, res) => {
  try {
    const { blogs } = getCollections();
    const data = await blogs.find().toArray();
    res.json(data);
  } catch (error) {
    console.error("Get blogs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get published blogs (public)
router.get("/get-blogs-public", async (req, res) => {
  try {
    const { blogs } = getCollections();
    const data = await blogs.find({ status: "published" }).toArray();
    res.json(data);
  } catch (error) {
    console.error("Get public blogs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get blog details
router.get("/blog-details/:ID", requireAuth, async (req, res) => {
  try {
    const { blogs } = getCollections();
    const id = req.params.ID;
    let query;

    if (ObjectId.isValid(id) && (String(new ObjectId(id)) === id)) {
       query = { _id: new ObjectId(id) };
    } else {
       // Handle custom IDs or string IDs
       query = { _id: id };
    }

    const data = await blogs.findOne(query);
    
    if (!data) {
        // Fallback: Try finding by ID as string even if it looked like ObjectId, or vice versa?
        // Usually safe to just look for what we constructed.
        // But if data is null, maybe 404? 
        // For now, let's look for one more possibility: Maybe it's a "slug" field?
        // But the previous code used _id. Let's assume _id.
    }

    res.json(data);
  } catch (error) {
    console.error("Get blog details error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update blog status (admin only)
router.patch("/update-blog-status", requireAuth, verifyAdmin, async (req, res) => {
  try {
    const { blogs } = getCollections();
    const { id, status } = req.body;

    const result = await blogs.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );

    res.json(result);
  } catch (error) {
    console.error("Update blog status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete blog
router.delete("/delete-blog/:id", requireAuth, async (req, res) => {
  try {
    const { blogs } = getCollections();
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid blog ID" });
    }

    const query = { _id: new ObjectId(id) };
    const result = await blogs.deleteOne(query);
    res.json(result);
  } catch (error) {
    console.error("Delete blog error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
