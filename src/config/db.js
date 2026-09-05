import mongoose from "mongoose";
import dns from "dns";
import { User } from "../models/user.model.js";

// Windows ISP DNS resolution issue fix (MongoDB Atlas ke liye)
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // fallback
}

// Initial Admin & Staff users seed karne ke liye (agar database khali ho)
const seedInitialUsers = async () => {
  try {
    const userCount = await User.countDocuments({ isDeleted: false });
    if (userCount === 0) {
      const defaultPassword = "password123";
      const initialUsers = [
        {
          name: "Admin",
          email: "admin@crm.com",
          password: defaultPassword,
          phone: "9876543216"
        },
        {
          name: "Sales TL",
          email: "sales.tl@crm.com",
          password: defaultPassword,
          phone: "9876543210"
        },
        {
          name: "Rahul Sharma",
          email: "rahul@crm.com",
          password: defaultPassword,
          phone: "9876543211"
        },
        {
          name: "Pooja Verma",
          email: "pooja@crm.com",
          password: defaultPassword,
          phone: "9876543212"
        }
      ];

      for (const u of initialUsers) {
        await User.create(u);
      }
      console.log(" Initial users seeded successfully");
    }
  } catch (err) {
    console.error("User seed warning:", err.message);
  }
};

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`\n Database connected successfully! Host: ${connectionInstance.connection.host}`);
    
    // Seed initial users if DB is empty
    await seedInitialUsers();
  } catch (error) {
    console.error("MongoDB connection ERROR: ", error);
    process.exit(1);
  }
};

export default connectDB;