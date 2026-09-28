import cron from "node-cron";
import { Lead } from "../models/lead.model.js";
import { Notification } from "../models/notification.model.js";

/**
 * Scan database for follow-ups due or overdue, and create notifications
 */
export const checkFollowupReminders = async () => {
  try {
    const now = new Date();
    // 30 minutes in the future window
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
    // Overdue cutoff: don't flag follow-ups older than 7 days
    const overdueCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find leads with followups
    const leads = await Lead.find({
      isDeleted: { $ne: 1, $ne: true },
      isLoss: { $ne: true },
      "followups.0": { $exists: true }
    })
      .select("clientName phoneNumber leadId followups leadBy inSalesManagement")
      .lean();

    for (const lead of leads) {
      if (!lead.followups || !lead.followups.length) continue;

      // Check the latest or scheduled followups
      for (const fu of lead.followups) {
        if (!fu.dateTime) continue;

        const fuDate = new Date(fu.dateTime);
        if (isNaN(fuDate.getTime())) continue;

        const isDueSoon = fuDate >= now && fuDate <= windowEnd;
        const isOverdue = fuDate < now && fuDate >= overdueCutoff;

        if (isDueSoon || isOverdue) {
          const type = isOverdue ? "FOLLOWUP_OVERDUE" : "FOLLOWUP_DUE";

          // Avoid spam: Check if notification was already sent in the last 6 hours
          const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          const existingNotif = await Notification.findOne({
            leadId: lead._id,
            type,
            createdAt: { $gte: sixHoursAgo }
          });

          if (!existingNotif) {
            const timeFormatted = fuDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true
            });
            const dateFormatted = fuDate.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short"
            });

            const title = isOverdue
              ? `Follow-up Overdue ⚠️`
              : `Follow-up Reminder ⏰`;

            const message = isOverdue
              ? `Follow-up with ${lead.clientName || "Client"} (${lead.phoneNumber || ""}) was scheduled for ${dateFormatted} at ${timeFormatted}.`
              : `Upcoming follow-up with ${lead.clientName || "Client"} (${lead.phoneNumber || ""}) scheduled for today at ${timeFormatted}.`;

            await Notification.create({
              recipient: lead.leadBy || null,
              department: "sales",
              title,
              message,
              type,
              priority: isOverdue ? "urgent" : "high",
              leadId: lead._id,
              clientName: lead.clientName || "",
              link: `/sales/leads/details/${lead._id}`,
              isRead: false
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(" Error running follow-up reminder cron:", error.message);
  }
};

/**
 * Initialize all Cron Jobs
 */
export const initCronJobs = () => {
  console.log("⏰ [Cron Service] Initializing Automated Cron Jobs...");

  // Run every 10 minutes: "*/10 * * * *"
  cron.schedule("*/10 * * * *", async () => {
    await checkFollowupReminders();
  });

  // Run once after server boot (with 5s delay so DB is ready)
  setTimeout(() => {
    checkFollowupReminders();
  }, 5000);

  console.log(" [Cron Service] Follow-up reminder cron scheduled (Every 10 minutes)");
};
