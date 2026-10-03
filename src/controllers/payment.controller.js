import mongoose from "mongoose";
import { Payment } from "../models/payment.model.js";
import { LeadProject } from "../models/leadProject.model.js";
import { Lead } from "../models/lead.model.js";
import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * 1. Get Payment Summary Grouped By Projects
 * GET /api/v1/payments/summary
 * Query params: search, paymentMode, startDate, endDate
 */
export const getPaymentSummaryByProjects = asyncHandler(async (req, res) => {
  const { search, paymentMode, startDate, endDate } = req.query;

  // Build filter for projects (Active Projects only)
  const projectMatch = {
    isClosed: { $ne: true },
    isCompleted: { $ne: true },
    status: { $ne: "CLOSED" }
  };
  if (search && search.trim()) {
    const s = search.trim();
    projectMatch.$or = [
      { clientName: { $regex: s, $options: "i" } },
      { projectName: { $regex: s, $options: "i" } },
      { phoneNumber: { $regex: s, $options: "i" } }
    ];
  }

  // Fetch all relevant active projects from MongoDB
  const projects = await LeadProject.find(projectMatch)
    .sort({ createdAt: -1 })
    .lean();

  if (!projects.length) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          summary: [],
          overview: {
            overallDealValue: 0,
            overallReceived: 0,
            overallBalanceLeft: 0,
            totalProjects: 0,
            totalClients: 0
          }
        },
        "No projects found"
      )
    );
  }

  const projectIds = projects.map((p) => p._id);

  // Build filter for payments
  const paymentFilter = {
    projectId: { $in: projectIds }
  };

  if (paymentMode && paymentMode !== "ALL") {
    paymentFilter.paymentMode = paymentMode;
  }

  if (startDate || endDate) {
    paymentFilter.dateReceived = {};
    if (startDate) {
      paymentFilter.dateReceived.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      paymentFilter.dateReceived.$lte = end;
    }
  }

  // Aggregation on MongoDB Payments collection
  const paymentAggregates = await Payment.aggregate([
    { $match: paymentFilter },
    {
      $group: {
        _id: "$projectId",
        totalReceived: { $sum: "$amount" },
        paymentsCount: { $sum: 1 },
        lastPaymentDate: { $max: "$dateReceived" },
        modes: { $addToSet: "$paymentMode" }
      }
    }
  ]);

  const paymentMap = new Map();
  for (const item of paymentAggregates) {
    paymentMap.set(String(item._id), item);
  }

  let overallDealValue = 0;
  let overallReceived = 0;
  const uniqueClients = new Set();

  const summary = projects.map((proj) => {
    const pIdStr = String(proj._id);
    const agg = paymentMap.get(pIdStr) || {
      totalReceived: 0,
      paymentsCount: 0,
      lastPaymentDate: null,
      modes: []
    };

    const totalDealValue = Number(proj.expectedBusiness || proj.leadId?.expectedBusiness) || 0;
    const totalReceived = Number(agg.totalReceived) || 0;
    const balanceLeft = Math.max(0, totalDealValue - totalReceived);

    const clientName = proj.clientName || proj.leadId?.clientName || proj.leadId?.concernPersonName || "Unnamed Client";
    const projectName = proj.projectName || proj.leadId?.projectName || "Unnamed Project";
    const phoneNumber = proj.phoneNumber || proj.leadId?.phoneNumber || proj.leadId?.contactNo || "";
    const projectCoordinatorName =
      proj.projectCoordinatorName ||
      proj.nextPersonName ||
      proj.leadId?.projectCoordinatorName ||
      proj.leadId?.nextPersonName ||
      proj.leadId?.salesPerson ||
      proj.leadId?.assignedTo ||
      "";
    const designation = proj.designation || proj.leadId?.designation || "";

    overallDealValue += totalDealValue;
    overallReceived += totalReceived;
    if (clientName) {
      uniqueClients.add(clientName.trim().toLowerCase());
    }

    return {
      projectId: proj._id,
      clientName,
      projectName,
      phoneNumber,
      projectCoordinatorName,
      nextPersonName: projectCoordinatorName,
      designation,
      totalDealValue,
      totalReceived,
      balanceLeft,
      paymentsCount: agg.paymentsCount,
      lastPaymentDate: agg.lastPaymentDate,
      modesUsed: agg.modes,
      status: proj.status || "ACTIVE"
    };
  });

  const overallBalanceLeft = Math.max(0, overallDealValue - overallReceived);

  const overview = {
    overallDealValue,
    overallReceived,
    overallBalanceLeft,
    totalProjects: summary.length,
    totalClients: uniqueClients.size
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      { summary, overview },
      "Payment project summary retrieved successfully"
    )
  );
});

/**
 * 2. Get All Payments for a Specific Project (Passbook / History)
 * GET /api/v1/payments/project/:projectId
 */
export const getProjectPayments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { paymentMode, paymentType, startDate, endDate, search } = req.query;

  let project = null;
  if (mongoose.Types.ObjectId.isValid(projectId)) {
    project = await LeadProject.findById(projectId).lean();
    if (!project) {
      project = await LeadProject.findOne({ leadId: projectId }).lean();
    }
    if (!project) {
      const foundLead = await Lead.findById(projectId).lean();
      if (foundLead) {
        project = {
          _id: foundLead._id,
          clientName: foundLead.clientName || foundLead.concernPersonName,
          projectName: foundLead.projectName,
          expectedBusiness: foundLead.expectedBusiness,
          phoneNumber: foundLead.phoneNumber || foundLead.contactNo,
          leadId: foundLead
        };
      }
    }
  }

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const projectIds = [project._id];
  if (project.leadId?._id) projectIds.push(project.leadId._id);
  if (mongoose.Types.ObjectId.isValid(projectId)) {
    projectIds.push(new mongoose.Types.ObjectId(projectId));
  }

  const query = { projectId: { $in: projectIds } };

  if (paymentMode && paymentMode !== "ALL") {
    query.paymentMode = paymentMode;
  }
  if (paymentType && paymentType !== "ALL") {
    query.paymentType = paymentType;
  }
  if (startDate || endDate) {
    query.dateReceived = {};
    if (startDate) query.dateReceived.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.dateReceived.$lte = end;
    }
  }
  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { receivedBy: { $regex: s, $options: "i" } },
      { remark: { $regex: s, $options: "i" } }
    ];
  }

  const payments = await Payment.find(query)
    .sort({ dateReceived: -1, createdAt: -1 })
    .lean();

  // All time total for project (unfiltered)
  const allProjectPayments = await Payment.find({ projectId: { $in: projectIds } }).select("amount").lean();
  const totalReceivedAllTime = allProjectPayments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  const clientName = project.clientName || project.leadId?.clientName || project.leadId?.concernPersonName || "Unnamed Client";
  const projectName = project.projectName || project.leadId?.projectName || "Unnamed Project";
  const phoneNumber = project.phoneNumber || project.leadId?.phoneNumber || project.leadId?.contactNo || "";
  const totalDealValue = Number(project.expectedBusiness || project.leadId?.expectedBusiness) || 0;
  const balanceLeft = Math.max(0, totalDealValue - totalReceivedAllTime);
  const projectCoordinatorName =
    project.projectCoordinatorName ||
    project.nextPersonName ||
    project.leadId?.projectCoordinatorName ||
    project.leadId?.nextPersonName ||
    project.leadId?.salesPerson ||
    project.leadId?.activePerson ||
    project.leadId?.assignedTo ||
    "";
  const designation = project.designation || project.leadId?.designation || "";

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        project: {
          projectId: project._id,
          clientName,
          projectName,
          phoneNumber,
          totalDealValue,
          totalReceived: totalReceivedAllTime,
          balanceLeft,
          projectCoordinatorName,
          nextPersonName: projectCoordinatorName,
          designation
        },
        payments
      },
      "Project payment passbook retrieved successfully"
    )
  );
});

/**
 * 3. Add New Payment Record (Create)
 * POST /api/v1/payments
 */
export const createPayment = asyncHandler(async (req, res) => {
  const {
    projectId,
    paymentType,
    amount,
    paymentMode,
    dateReceived,
    receivedBy,
    remark,
    remarksFiles
  } = req.body;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Valid Project ID is required");
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new ApiError(400, "Payment amount must be a positive number");
  }

  if (!paymentType || !["Token", "Advance", "Milestone Payment", "Final Payment"].includes(paymentType)) {
    throw new ApiError(400, "Valid Payment Type is required (Token, Advance, Milestone Payment, Final Payment)");
  }

  if (!paymentMode || !["Cash", "Bank Transfer", "UPI", "Cheque"].includes(paymentMode)) {
    throw new ApiError(400, "Valid Payment Mode is required (Cash, Bank Transfer, UPI, Cheque)");
  }

  if (!dateReceived) {
    throw new ApiError(400, "Date received is required");
  }

  if (!receivedBy || !receivedBy.trim()) {
    throw new ApiError(400, "Received by staff name is required");
  }

  const project = await LeadProject.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Linked project not found in database");
  }

  const payment = await Payment.create({
    projectId: project._id,
    leadId: project.leadId || null,
    clientName: project.clientName,
    projectName: project.projectName,
    totalDealValue: Number(project.expectedBusiness) || 0,
    paymentType,
    amount: numAmount,
    paymentMode,
    dateReceived: new Date(dateReceived),
    receivedBy: receivedBy.trim(),
    remark: remark ? remark.trim() : "",
    remarksFiles: Array.isArray(remarksFiles) ? remarksFiles : [],
    createdBy: req.user?._id || null,
    createdByName: req.user?.name || receivedBy.trim()
  });

  // Automatically trigger notification for Accounts / Owner / Sales
  try {
    await Notification.create({
      alertKey: `payment_rec_${payment._id}`,
      recipient: null,
      department: "sales",
      title: `Payment Received: ₹${numAmount.toLocaleString("en-IN")}`,
      message: `${paymentType} of ₹${numAmount.toLocaleString("en-IN")} received via ${paymentMode} for ${project.clientName} (${project.projectName || "Project"}). Received by: ${receivedBy.trim()}.`,
      type: "PAYMENT_RECORDED",
      priority: "normal",
      clientName: project.clientName,
      link: `/sales/payments/details/${project._id}`,
      metadata: {
        paymentId: payment._id,
        projectId: project._id,
        amount: numAmount,
        mode: paymentMode
      }
    });
  } catch (notifErr) {
    console.error("Payment notification trigger error (non-fatal):", notifErr);
  }

  return res.status(201).json(
    new ApiResponse(201, payment, "Payment recorded successfully")
  );
});

/**
 * 4. Update Existing Payment Record (Edit)
 * PUT /api/v1/payments/:id
 */
export const updatePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    paymentType,
    amount,
    paymentMode,
    dateReceived,
    receivedBy,
    remark,
    remarksFiles
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid Payment ID format");
  }

  const payment = await Payment.findById(id);
  if (!payment) {
    throw new ApiError(404, "Payment record not found");
  }

  if (amount !== undefined) {
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      throw new ApiError(400, "Amount must be a positive number");
    }
    payment.amount = num;
  }

  if (paymentType) {
    if (!["Token", "Advance", "Milestone Payment", "Final Payment"].includes(paymentType)) {
      throw new ApiError(400, "Invalid payment type");
    }
    payment.paymentType = paymentType;
  }

  if (paymentMode) {
    if (!["Cash", "Bank Transfer", "UPI", "Cheque"].includes(paymentMode)) {
      throw new ApiError(400, "Invalid payment mode");
    }
    payment.paymentMode = paymentMode;
  }

  if (dateReceived) {
    payment.dateReceived = new Date(dateReceived);
  }

  if (receivedBy) {
    payment.receivedBy = receivedBy.trim();
  }

  if (remark !== undefined) {
    payment.remark = remark.trim();
  }

  if (remarksFiles !== undefined) {
    payment.remarksFiles = Array.isArray(remarksFiles) ? remarksFiles : [];
  }

  payment.updatedBy = req.user?._id || null;
  await payment.save();

  return res.status(200).json(
    new ApiResponse(200, payment, "Payment record updated successfully")
  );
});

/**
 * 5. Delete Payment Record
 * DELETE /api/v1/payments/:id
 */
export const deletePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid Payment ID format");
  }

  const payment = await Payment.findByIdAndDelete(id);
  if (!payment) {
    throw new ApiError(404, "Payment record not found");
  }

  return res.status(200).json(
    new ApiResponse(200, { deletedId: id }, "Payment record deleted successfully")
  );
});
