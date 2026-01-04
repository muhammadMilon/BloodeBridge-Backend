const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db = null;
let collections = {};

async function connectDB() {
  try {
    await client.connect();
    console.log("mongodb connected successfully");

    // Connect to blood_donation DB
    const bloodDonationDB = client.db("blood_donation");
    collections.users = bloodDonationDB.collection("users");
    collections.blogs = bloodDonationDB.collection("blogs");
    collections.donorInfo = bloodDonationDB.collection("donorInfo");
    collections.donationRequest = bloodDonationDB.collection("donationRequest");
    collections.contacts = bloodDonationDB.collection("contacts");

    // Connect to bangladesh-geocode DB
    const bdGeoDB = client.db("bangladesh-geocode");
    collections.districts = bdGeoDB.collection("districts");
    collections.upazilas = bdGeoDB.collection("upazilas");

    db = bloodDonationDB;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

function getDB() {
  return db;
}

function getCollections() {
  return collections;
}

module.exports = {
  connectDB,
  getDB,
  getCollections,
};
