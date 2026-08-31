/**
 * Formats a Date object or ISO string to India Standard Time (IST) human-readable format.
 * Example: "31 Aug 2026, 12:33:39 PM"
 */
export const formatISTDate = (date = new Date()) => {
  if (!date) return null;
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
};

/**
 * Returns current date string in YYYY-MM-DD format according to India Standard Time (IST).
 * Example: "2026-08-31"
 */
export const getISTDateString = (date = new Date()) => {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

/**
 * Returns time string in hh:mm:ss AM/PM format according to India Standard Time (IST).
 * Example: "04:12:53 PM"
 */
export const getISTTime = (date = new Date()) => {
  return new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
};

/**
 * Returns date string in DD Mon YYYY format according to India Standard Time (IST).
 * Example: "31 Aug 2026"
 */
export const getISTDateFormatted = (date = new Date()) => {
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

/**
 * Helper to log any action performed on a lead with India Standard Time (IST) date & time stamp.
 */
export const recordLeadAction = (lead, actionType, description = "", remark = "", userName = "System") => {
  const now = new Date();
  const dateStr = getISTDateFormatted(now);
  const timeStr = getISTTime(now);
  const fullIST = formatISTDate(now);

  lead.lastActionDate = dateStr;
  lead.lastActionTime = timeStr;
  lead.lastActionType = actionType;
  lead.lastActionRemark = remark || description;
  lead.lastActionIST = fullIST;

  if (!lead.actionHistory) {
    lead.actionHistory = [];
  }

  lead.actionHistory.unshift({
    actionType,
    description,
    remark,
    date: dateStr,
    time: timeStr,
    timestampIST: fullIST,
    performedBy: userName
  });
};
