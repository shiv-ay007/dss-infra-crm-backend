import { PmsProjectStatus } from "../models/pmsProjectStatus.model.js";

const DEFAULT_STATUSES = [
  { status_code: "ON_TRACK", status_name: "On Track", color: "#10B981", order: 1 },
  { status_code: "IN_PROGRESS", status_name: "In Progress", color: "#3B82F6", order: 2 },
  { status_code: "DELAYED", status_name: "Delayed", color: "#EF4444", order: 3 },
  { status_code: "ON_HOLD", status_name: "On Hold", color: "#F59E0B", order: 4 },
  { status_code: "COMPLETED", status_name: "Completed", color: "#059669", order: 5 }
];

// Helper: Auto-seed default statuses if table is empty
const ensureDefaultStatuses = async () => {
  const count = await PmsProjectStatus.countDocuments({ isDeleted: false });
  if (count === 0) {
    for (const item of DEFAULT_STATUSES) {
      await PmsProjectStatus.findOneAndUpdate(
        { status_code: item.status_code },
        { ...item, isDeleted: false, status: "Active" },
        { upsert: true, new: true }
      );
    }
  }
};

// 1. GET ALL ACTIVE PROJECT STATUSES (For Dropdowns like Add PMS Task)
export const getAllProjectStatuses = async (req, res) => {
  try {
    await ensureDefaultStatuses();

    const statuses = await PmsProjectStatus.find({
      isDeleted: false,
      status: "Active"
    }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "Project statuses fetched successfully",
      data: statuses
    });
  } catch (error) {
    console.error("Error fetching project statuses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch project statuses: " + error.message
    });
  }
};

// 2. GET PAGINATED STATUSES (For WBS Master Status Table)
export const getStatusesPaginated = async (req, res) => {
  try {
    await ensureDefaultStatuses();

    const { page = 1, limit = 10, search = "", status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { isDeleted: false };
    if (status && status !== "All") query.status = status;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { status_code: regex },
        { status_name: regex },
        { description: regex }
      ];
    }

    const [statuses, total] = await Promise.all([
      PmsProjectStatus.find(query).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limitNum),
      PmsProjectStatus.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: statuses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Error fetching paginated statuses:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching paginated statuses: " + error.message
    });
  }
};

// 3. CREATE PROJECT STATUS
export const createProjectStatus = async (req, res) => {
  try {
    const { status_code, status_name, color, description, order, status } = req.body;

    if (!status_name || !status_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Status Name is required"
      });
    }

    const trimmedName = status_name.trim();
    const generatedCode = status_code && status_code.trim()
      ? status_code.trim().toUpperCase()
      : trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 30);

    let normalizedCode = generatedCode;
    const existing = await PmsProjectStatus.findOne({
      status_code: normalizedCode,
      isDeleted: false
    });

    if (existing) {
      normalizedCode = `${generatedCode}_${Date.now().toString().slice(-4)}`;
    }

    const newStatus = await PmsProjectStatus.create({
      status_code: normalizedCode,
      status_name: trimmedName,
      color: color || "#3B82F6",
      description: description ? description.trim() : "",
      order: order !== undefined ? Number(order) : 0,
      status: status || "Active"
    });

    return res.status(201).json({
      success: true,
      message: "Project status created successfully",
      data: newStatus
    });
  } catch (error) {
    console.error("Error creating project status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create project status: " + error.message
    });
  }
};

// 4. UPDATE PROJECT STATUS
export const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_code, status_name, color, description, order, status } = req.body;

    const existing = await PmsProjectStatus.findOne({ _id: id, isDeleted: false });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Project status not found"
      });
    }

    if (status_code) {
      const normalizedCode = status_code.trim().toUpperCase();
      if (normalizedCode !== existing.status_code) {
        const codeConflict = await PmsProjectStatus.findOne({
          _id: { $ne: id },
          status_code: normalizedCode,
          isDeleted: false
        });
        if (codeConflict) {
          return res.status(409).json({
            success: false,
            message: `Status code '${normalizedCode}' already in use`
          });
        }
        existing.status_code = normalizedCode;
      }
    }

    if (status_name) existing.status_name = status_name.trim();
    if (color) existing.color = color.trim();
    if (description !== undefined) existing.description = description ? description.trim() : "";
    if (order !== undefined) existing.order = Number(order);
    if (status) existing.status = status;

    await existing.save();

    return res.status(200).json({
      success: true,
      message: "Project status updated successfully",
      data: existing
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update project status: " + error.message
    });
  }
};

// 5. DELETE (SOFT DELETE)
export const deleteProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await PmsProjectStatus.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Project status not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project status deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting project status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete project status: " + error.message
    });
  }
};

// 6. SEED / RESTORE DEFAULT STATUSES
export const seedDefaultStatuses = async (req, res) => {
  try {
    for (const item of DEFAULT_STATUSES) {
      await PmsProjectStatus.findOneAndUpdate(
        { status_code: item.status_code },
        { ...item, isDeleted: false, status: "Active" },
        { upsert: true, new: true }
      );
    }

    const all = await PmsProjectStatus.find({ isDeleted: false }).sort({ order: 1 });
    return res.status(200).json({
      success: true,
      message: "Default project statuses seeded successfully",
      data: all
    });
  } catch (error) {
    console.error("Error seeding project statuses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to seed default statuses: " + error.message
    });
  }
};
