const bcrypt = require("bcryptjs");
const { connectDB, getCollections } = require("../config/database");

async function seedAdmin() {
  try {
    const { users } = getCollections();

    const adminEmail = "admin@bloodbridge.com";
    const adminPassword = "123456";

    // Check if admin already exists
    const existingAdmin = await users.findOne({ email: adminEmail.toLowerCase().trim() });

    if (existingAdmin) {
      console.log("Admin user already exists:", adminEmail);
      
      // Update existing admin to ensure it has correct role and password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await users.updateOne(
        { email: adminEmail.toLowerCase().trim() },
        {
          $set: {
            role: "admin",
            status: "active",
            password: hashedPassword,
            name: existingAdmin.name || "Admin",
          },
        }
      );
      console.log("Admin user updated successfully");
      return;
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = {
      email: adminEmail.toLowerCase().trim(),
      name: "Admin",
      password: hashedPassword,
      role: "admin",
      status: "active",
      loginCount: 0,
      createdAt: new Date().toISOString(),
    };

    const result = await users.insertOne(adminUser);
    console.log("Default admin user created successfully!");
    console.log("Email:", adminEmail);
    console.log("Password:", adminPassword);
    console.log("Admin ID:", result.insertedId);
  } catch (error) {
    console.error("Error seeding admin:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  connectDB()
    .then(() => seedAdmin())
    .then(() => {
      console.log("Seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

module.exports = seedAdmin;

