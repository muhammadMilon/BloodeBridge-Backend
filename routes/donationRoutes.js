const express = require("express");
const { ObjectId } = require("mongodb");
const { getCollections } = require("../config/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Create donation request
router.post("/create-donation-request", async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const data = req.body;
    const result = await donationRequest.insertOne(data);
    res.json(result);
  } catch (error) {
    console.error("Create donation request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get my donation requests
router.get("/my-donation-request", requireAuth, async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const query = { requesterEmail: req.session.user.email };

    // Use aggregation to join with donorInfo collection
    const data = await donationRequest
      .aggregate([
        {
          $match: query,
        },
        // Convert string ID to ObjectId if needed for joining, 
        // but looking at the code, donationId in donorInfo seems to be stored as string likely.
        // Let's check how it's stored. The previous frontend code was passing donation._id
        // to /find-donor?donationId=${donation._id}. 
        // The donorRoutes.js finds by { donationId }. 
        // Assuming donationId in donorInfo matches the string version of _id from donationRequest.
        {
          $lookup: {
            from: "donorInfo", // Collection name for donorInfo
            let: { donationId: { $toString: "$_id" } },
            pipeline: [
              { $match: { $expr: { $eq: ["$donationId", "$$donationId"] } } }
            ],
            as: "donorDetails"
          }
        },
        {
          $unwind: {
            path: "$donorDetails",
            preserveNullAndEmptyArrays: true
          }
        }
      ])
      .toArray();

    res.json(data);
  } catch (error) {
    console.error("Get my donation requests error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all donation requests (protected)
router.get("/all-donation-requests", requireAuth, async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const data = await donationRequest.find().toArray();
    res.json(data);
  } catch (error) {
    console.error("Get all donation requests error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all donation requests (public - pending only)
router.get("/all-donation-requests-public", async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const data = await donationRequest
      .find({ donationStatus: "pending" })
      .toArray();
    res.json(data);
  } catch (error) {
    console.error("Get public donation requests error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get donation request details
router.get("/details/:id", requireAuth, async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const id = req.params.id;
    // Handle both ObjectId and string IDs
    let query;
    if (ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { _id: id };
    }
    const data = await donationRequest.findOne(query);
    res.json(data);
  } catch (error) {
    console.error("Get donation request details error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get specific donation request
router.get("/get-donation-request/:ID", requireAuth, async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const id = req.params.ID;
    // Handle both ObjectId and string IDs
    let query;
    if (ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { _id: id };
    }
    const data = await donationRequest.findOne(query);
    res.json(data);
  } catch (error) {
    console.error("Get donation request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update donation request
router.put("/update-donation-request/:ID", requireAuth, async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const { ID } = req.params;
    const updatedRequest = req.body;

    // Handle both ObjectId and string IDs
    let filter;
    if (ObjectId.isValid(ID) && ID.length === 24) {
      filter = { _id: new ObjectId(ID) };
    } else {
      filter = { _id: ID };
    }
    const updateDoc = { $set: updatedRequest };

    const result = await donationRequest.updateOne(filter, updateDoc);
    res.json(result);
  } catch (error) {
    console.error("Update donation request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update donation status
router.patch("/donation-status", requireAuth, async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const { id, donationStatus } = req.body;
    
    // Handle both ObjectId and string IDs
    let filter;
    if (ObjectId.isValid(id) && id.length === 24) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { _id: id };
    }
    
    const result = await donationRequest.updateOne(
      filter,
      { $set: { donationStatus } }
    );
    res.json(result);
  } catch (error) {
    console.error("Update donation status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete donation request
router.delete("/delete-request/:id", async (req, res) => {
  try {
    const { donationRequest } = getCollections();
    const id = req.params.id;

    // Handle both ObjectId and string IDs
    let query;
    if (ObjectId.isValid(id) && id.length === 24) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { _id: id };
    }
    
    const result = await donationRequest.deleteOne(query);
    res.json(result);
  } catch (error) {
    console.error("Delete donation request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Public stats endpoint
router.get("/public-stats", async (req, res) => {
  try {
    const { users, donationRequest } = getCollections();
    const [donors, requests] = await Promise.all([
      users.find({ role: "donor" }).toArray(),
      donationRequest.find().toArray(),
    ]);

    const stats = {
      totalDonors: donors.length,
      activeDonors: donors.filter((d) => d.status === "active").length,
      totalRequests: requests.length,
      completedRequests: requests.filter((r) => r.donationStatus === "done")
        .length,
    };

    res.json(stats);
  } catch (error) {
    console.error("Get public stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
