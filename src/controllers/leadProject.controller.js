import { LeadProject } from "../models/leadProject.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * 1. Create & Save New Lead Project
 * POST /api/v1/lead-projects
 */
export const createLeadProject = asyncHandler(async (req, res) => {
  const {
    clientName,
    phoneNumber,
    alternateNumber,
    whatsappNumber,
    emailAddress,
    companyName,
    businessType,
    clientDesignation,
    expectedBusiness,
    priority,
    jobType,
    city,
    state,
    pincode,
    address,
    requirement,
    transferRemark,
    clientRating,
    assignedTo,
    nextPersonName,
    designation,
    leadId
  } = req.body;

  // Essential validations
  if (!clientName?.trim()) {
    throw new ApiError(400, "Client Name is required");
  }
  if (!phoneNumber?.trim()) {
    throw new ApiError(400, "Primary Phone Number is required");
  }

  // Generate unique Lead Project ID if not supplied
  const generatedId = leadId || `LP-${Math.floor(10000 + Math.random() * 90000)}`;

  const projectPayload = {
    leadId: generatedId,
    clientName: clientName.trim(),
    phoneNumber: phoneNumber.trim(),
    alternateNumber: alternateNumber?.trim() || "",
    whatsappNumber: whatsappNumber?.trim() || phoneNumber.trim(),
    emailAddress: emailAddress?.trim() || "",
    companyName: companyName?.trim() || "",
    businessType: businessType || "Information Technology",
    clientDesignation: clientDesignation || "Managing Director",
    expectedBusiness: Number(expectedBusiness) || 0,
    priority: priority || "high",
    jobType: jobType || "NEW",
    city: city?.trim() || "",
    state: state?.trim() || "",
    pincode: pincode?.trim() || "",
    address: address?.trim() || "",
    requirement: requirement?.trim() || "",
    transferRemark: transferRemark?.trim() || "",
    clientRating: Number(clientRating) || 4.5,
    assignedTo: assignedTo || "Admin",
    nextPersonName: nextPersonName?.trim() || "",
    designation: designation?.trim() || "",
    status: "INTERESTED",
    inSalesManagement: true,
    isSalesTransferred: true
  };

  const projectId = req.body._id || req.body.projectId;

  let savedProject;
  if (projectId) {
    // If specific project ID provided (Edit mode), update existing project
    savedProject = await LeadProject.findByIdAndUpdate(
      projectId,
      { $set: projectPayload },
      { new: true, runValidators: true }
    );
  } else {
    // Create a NEW project record for this lead (allows multiple projects per lead)
    savedProject = await LeadProject.create(projectPayload);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, savedProject, "Lead Project saved successfully"));
});

/**
 * 2. Get All Lead Projects
 * GET /api/v1/lead-projects
 */
export const getAllLeadProjects = asyncHandler(async (req, res) => {
  const { search, priority, city, leadId } = req.query;
  const filter = {};

  if (leadId) {
    filter.leadId = leadId;
  }

  if (priority && priority !== "all") filter.priority = priority.toLowerCase();
  if (city && city !== "all") filter.city = new RegExp(city, "i");

  if (search) {
    filter.$or = [
      { clientName: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } }
    ];
  }

  const projects = await LeadProject.find(filter).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { projects, count: projects.length }, "Lead Projects fetched successfully"));
});

/**
 * 3. Get Single Lead Project by ID
 * GET /api/v1/lead-projects/:id
 */
export const getLeadProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await LeadProject.findById(id);

  if (!project) {
    throw new ApiError(404, "Lead Project not found");
  }

  return res.status(200).json(new ApiResponse(200, project, "Lead Project fetched successfully"));
});

/**
 * 4. Update Lead Project
 * PUT /api/v1/lead-projects/:id
 */
export const updateLeadProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedProject = await LeadProject.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!updatedProject) {
    throw new ApiError(404, "Lead Project not found");
  }

  return res.status(200).json(new ApiResponse(200, updatedProject, "Lead Project updated successfully"));
});
