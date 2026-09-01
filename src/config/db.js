import mongoose from "mongoose";
import dns from "dns";
import { User, UserRolesEnum } from "../models/user.model.js";
import { Lead } from "../models/lead.model.js";
import { generateUniqueLeadId } from "../utils/dateHelper.js";

// Fix Windows ISP DNS resolution issue for MongoDB SRV records
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // fallback
}   

const seedInitialUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const defaultPassword = "password123";
      const initialUsers = [
        { name: "Sales TL (Current User)", email: "sales.tl@crm.com", password: defaultPassword, role: UserRolesEnum.MANAGER, phone: "9876543210" },
        { name: "Rahul Sharma", email: "rahul@crm.com", password: defaultPassword, role: UserRolesEnum.SALES_EXECUTIVE, phone: "9876543211" },
        { name: "Pooja Verma", email: "pooja@crm.com", password: defaultPassword, role: UserRolesEnum.SALES_EXECUTIVE, phone: "9876543212" },
        { name: "Vikram Malhotra", email: "vikram@crm.com", password: defaultPassword, role: UserRolesEnum.SALES_EXECUTIVE, phone: "9876543213" },
        { name: "Ankit Patel", email: "ankit@crm.com", password: defaultPassword, role: UserRolesEnum.SALES_EXECUTIVE, phone: "9876543214" },
        { name: "Sanjay Gupta", email: "sanjay@crm.com", password: defaultPassword, role: UserRolesEnum.SALES_EXECUTIVE, phone: "9876543215" },
        { name: "Admin", email: "admin@crm.com", password: defaultPassword, role: UserRolesEnum.ADMIN, phone: "9876543216" }
      ];

      for (const u of initialUsers) {
        await User.create(u);
      }
    }
  } catch (err) {
    console.error("User seed warning:", err.message);
  }
};

const backfillLeadIds = async () => {
  try {
    const leadsWithoutId = await Lead.find({
      $or: [{ leadId: { $exists: false } }, { leadId: null }, { leadId: "" }]
    });
    for (const lead of leadsWithoutId) {
      lead.leadId = await generateUniqueLeadId(Lead);
      await lead.save();
    }
  } catch (err) {
    console.error("Lead ID backfill warning:", err.message);
  }
};

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}`
    );
    console.log("\n Database connected successfully");
    await seedInitialUsers();
    await backfillLeadIds();
  } catch (error) {
    console.error("MONGODB connection ERROR: ", error);
    process.exit(1);
  }
};

export default connectDB;
