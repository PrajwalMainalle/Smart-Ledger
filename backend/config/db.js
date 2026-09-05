const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // One-time backfill migration for existing legacy records without role set
    try {
      const User = require("../models/User");
      const result = await User.updateMany(
        { role: { $exists: false } },
        { $set: { role: "admin" } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[Migration] One-time backfill completed: assigned role 'admin' to ${result.modifiedCount} legacy user records.`);
      }
    } catch (migErr) {
      console.error("[Migration] Error running role backfill migration:", migErr.message);
    }

  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
