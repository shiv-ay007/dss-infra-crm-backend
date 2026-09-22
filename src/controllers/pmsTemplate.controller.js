import mongoose from "mongoose";
import { PmsTemplate } from "../models/pmsTemplate.model.js";

// 1. CREATE PMS TEMPLATE
export const createPmsTemplate = async (req, res) => {
  try {
    const data = { ...req.body };

    if (!data.leadId) {
      return res.status(400).json({
        success: false,
        message: "Lead reference (leadId) is required"
      });
    }

    if (!data.projectId) {
      return res.status(400).json({
        success: false,
        message: "Project reference (projectId) is required"
      });
    }

    // Check if an active template already exists for this projectId
    const existingTemplate = await PmsTemplate.findOne({
      projectId: data.projectId,
      isDeleted: false
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: "A PMS Template already exists for this project. Duplicate templates cannot be created."
      });
    }

    if (!Array.isArray(data.stages) || data.stages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one stage is required"
      });
    }

    // Set creator if user is authenticated
    if (req.user && req.user._id) {
      data.createdBy = req.user._id;
    }

    const template = await PmsTemplate.create(data);

    return res.status(201).json({
      success: true,
      message: "PMS Task Template created successfully",
      data: template
    });
  } catch (error) {
    console.error("Error creating PMS Template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create PMS Template: " + error.message
    });
  }
};

// 2. GET ALL PMS TEMPLATES WITH ADVANCED BACKEND FILTERING
export const getAllPmsTemplates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      leadId,
      projectId,
      stageId,
      contractorId,
      supplierId,
      materialId,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { isDeleted: false };

    // 1. Status Filter
    if (status && status !== "All") {
      query.status = status;
    }

    // 2. Entity Filters
    if (leadId) query.leadId = leadId;
    if (projectId) query.projectId = projectId;
    if (stageId) query["stages.stageId"] = stageId;

    if (contractorId) {
      query.$or = [
        { "stages.fieldData.contractorId": contractorId },
        { "stages.works.fieldData.contractorId": contractorId },
        { "stages.works.tasks.fieldData.contractorId": contractorId }
      ];
    }
    if (supplierId) {
      query.$or = [
        { "stages.fieldData.materialSupplier.supplierId": supplierId },
        { "stages.works.fieldData.materialSupplier.supplierId": supplierId },
        { "stages.works.tasks.fieldData.materialSupplier.supplierId": supplierId }
      ];
    }
    if (materialId) {
      query.$or = [
        { "stages.fieldData.materialSupplier.materialId": materialId },
        { "stages.works.fieldData.materialSupplier.materialId": materialId },
        { "stages.works.tasks.fieldData.materialSupplier.materialId": materialId }
      ];
    }

    const sortOption = {};
    sortOption[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [templates, total] = await Promise.all([
      PmsTemplate.find(query)
        .populate("leadId", "clientName companyName phoneNumber alternateNumber emailAddress")
        .populate("projectId", "projectName clientName companyName businessType workCategory workType expectedBusiness")
        .populate("projectStatus.statusId", "status_code status_name color")
        .populate("stages.stageId", "stage_code stage_name description")
        .populate("stages.fieldData.contractorId", "name contractorType")
        .populate("stages.fieldData.materialSupplier.materialId", "name materialName code materialCode")
        .populate("stages.fieldData.materialSupplier.supplierId", "name supplierType")
        .populate("stages.works.workId", "work_code work_name contractor_type")
        .populate("stages.works.fieldData.contractorId", "name contractorType")
        .populate("stages.works.fieldData.materialSupplier.materialId", "name materialName code materialCode")
        .populate("stages.works.fieldData.materialSupplier.supplierId", "name supplierType")
        .populate("stages.works.tasks.taskId", "task_code task_name")
        .populate("stages.works.tasks.fieldData.contractorId", "name contractorType")
        .populate("stages.works.tasks.fieldData.materialSupplier.materialId", "name materialName code materialCode")
        .populate("stages.works.tasks.fieldData.materialSupplier.supplierId", "name supplierType")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PmsTemplate.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      message: "PMS Templates retrieved successfully",
      data: templates,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Error fetching PMS Templates:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch PMS Templates: " + error.message
    });
  }
};

// 3. GET SINGLE PMS TEMPLATE BY ID (DEEP POPULATED)
export const getPmsTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await PmsTemplate.findOne({ _id: id, isDeleted: false })
      .populate("leadId")
      .populate("projectId")
      .populate("projectStatus.statusId")
      .populate("stages.stageId")
      .populate("stages.fieldData.contractorId")
      .populate("stages.fieldData.materialSupplier.materialId")
      .populate("stages.fieldData.materialSupplier.supplierId")
      .populate("stages.works.workId")
      .populate("stages.works.fieldData.contractorId")
      .populate("stages.works.fieldData.materialSupplier.materialId")
      .populate("stages.works.fieldData.materialSupplier.supplierId")
      .populate("stages.works.tasks.taskId")
      .populate("stages.works.tasks.fieldData.contractorId")
      .populate("stages.works.tasks.fieldData.materialSupplier.materialId")
      .populate("stages.works.tasks.fieldData.materialSupplier.supplierId")
      .populate("createdBy", "name email");

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "PMS Template not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error("Error fetching single PMS Template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch PMS Template: " + error.message
    });
  }
};

// 4. UPDATE PMS TEMPLATE
export const updatePmsTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.projectId) {
      const existingOther = await PmsTemplate.findOne({
        _id: { $ne: id },
        projectId: updateData.projectId,
        isDeleted: false
      });

      if (existingOther) {
        return res.status(400).json({
          success: false,
          message: "A PMS Template already exists for this project. Duplicate templates cannot be created."
        });
      }
    }

    const updated = await PmsTemplate.findOneAndUpdate(
      { _id: id, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "PMS Template not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "PMS Template updated successfully",
      data: updated
    });
  } catch (error) {
    console.error("Error updating PMS Template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update PMS Template: " + error.message
    });
  }
};

// 5. DELETE PMS TEMPLATE (Soft delete)
export const deletePmsTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await PmsTemplate.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "PMS Template not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "PMS Template deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting PMS Template:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete PMS Template: " + error.message
    });
  }
};

// 6. ADD EXECUTION TRACKING RECORD (MODULE: ACTIVE PROJECTS)
export const addExecutionTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const trackingData = { ...req.body };

    if (req.user && req.user._id) {
      trackingData.updatedBy = req.user._id;
    }
    trackingData.recordedAt = new Date();

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = {
      isDeleted: false,
      ...(isObjectId
        ? {
            $or: [{ _id: id }, { projectId: id }, { leadId: id }]
          }
        : { _id: id })
    };

    const updatedTemplate = await PmsTemplate.findOneAndUpdate(
      query,
      {
        $push: { executionTracking: trackingData }
      },
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({
        success: false,
        message: "PMS Template not found for this project"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Execution tracking recorded successfully",
      data: updatedTemplate
    });
  } catch (error) {
    console.error("Error saving execution tracking:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save execution tracking: " + error.message
    });
  }
};
