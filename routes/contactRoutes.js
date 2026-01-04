const express = require("express");
const { getCollections } = require("../config/database");

const router = express.Router();

// Contact form endpoint
router.post("/contact", async (req, res) => {
  const { contacts } = getCollections();
  try {
    const contactData = {
      ...req.body,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const result = await contacts.insertOne(contactData);
    res.send({ success: true, id: result.insertedId });
  } catch (error) {
    res.status(500).send({ error: "Failed to save contact message" });
  }
});

module.exports = router;
