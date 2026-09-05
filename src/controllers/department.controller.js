import { Department } from "../models/department.model.js";

// ============================================
// 1. CREATE - New Department
// ============================================
export const createDepartment = async (req, res) => {
  try {
    const { name, city, state, pincode, address, isActive } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required"
      });
    }

    // Check duplicate (case-insensitive)
    const existingDepartment = await Department.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      isDeleted: false
    });

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: "Department with this name already exists"
      });
    }

    const department = new Department({
      name,
      city,
      state,
      pincode,
      address,
      isActive: isActive !== undefined ? isActive : true
    });

    await department.save();

    res.status(201).json({
      success: true,
      data: department,
      message: "Department created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 2. READ - Get All Departments (Pagination & Filters)
// ============================================
export const getAllDepartments = async (req, res) => {
  try {
    const { city, state, pincode, isActive, search, includeDeleted, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }

    if (state) {
      filter.state = { $regex: state, $options: "i" };
    }

    if (pincode) {
      filter.pincode = pincode;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
        { pincode: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } }
      ];
    }

    if (!includeDeleted || includeDeleted === "false") {
      filter.isDeleted = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [departments, total] = await Promise.all([
      Department.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
      Department.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: departments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 3. READ - Get Single Department by ID
// ============================================
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id).select("-__v");

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 4. READ - Get Departments by City
// ============================================
export const getDepartmentsByCity = async (req, res) => {
  try {
    const { city } = req.params;

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "City is required"
      });
    }

    const departments = await Department.find({
      city: { $regex: city, $options: "i" },
      isDeleted: false
    })
      .sort({ name: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 5. READ - Get Departments by State
// ============================================
export const getDepartmentsByState = async (req, res) => {
  try {
    const { state } = req.params;

    if (!state) {
      return res.status(400).json({
        success: false,
        message: "State is required"
      });
    }

    const departments = await Department.find({
      state: { $regex: state, $options: "i" },
      isDeleted: false
    })
      .sort({ city: 1, name: 1 })
      .select("-__v");

    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 6. UPDATE - Update Department
// ============================================
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, state, pincode, address, isActive } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    if (name && name !== department.name) {
      const duplicate = await Department.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
        isDeleted: false
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another department with this name already exists"
        });
      }
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      { name, city, state, pincode, address, isActive },
      { new: true, runValidators: true }
    ).select("-__v");

    res.status(200).json({
      success: true,
      data: updatedDepartment,
      message: "Department updated successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 7. TOGGLE - Active / Inactive Status
// ============================================
export const toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    department.isActive = !department.isActive;
    await department.save();

    res.status(200).json({
      success: true,
      data: department,
      message: `Department ${department.isActive ? "activated" : "deactivated"} successfully`
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 8. DELETE - Soft Delete Department
// ============================================
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    department.isDeleted = true;
    await department.save();

    res.status(200).json({
      success: true,
      data: department,
      message: "Department deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 9. RESTORE - Restore Soft Deleted Department
// ============================================
export const restoreDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    if (!department.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Department is not deleted"
      });
    }

    department.isDeleted = false;
    await department.save();

    res.status(200).json({
      success: true,
      data: department,
      message: "Department restored successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 10. PERMANENT DELETE - Hard Delete
// ============================================
export const permanentDeleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndDelete(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Department permanently deleted"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid department ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 11. BULK DELETE - Delete Multiple Departments
// ============================================
export const bulkDeleteDepartments = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of department IDs"
      });
    }

    const result = await Department.updateMany(
      { _id: { $in: ids } },
      { isDeleted: true }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} departments deleted successfully`,
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};