import { Branch } from "../models/branch.model.js";

// ============================================
// 1. CREATE - New Branch
// ============================================
export const createBranch = async (req, res) => {
  try {
    const { name, city, state, pincode } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Branch name is required"
      });
    }

    // Check duplicate (case-insensitive)
    const existingBranch = await Branch.findOne({
      name: name,
      isDeleted: false
    });

    if (existingBranch) {
      return res.status(409).json({
        success: false,
        message: "Branch with this name already exists"
      });
    }

    const branch = new Branch({ name, city, state, pincode });
    await branch.save();

    res.status(201).json({
      success: true,
      data: branch,
      message: "Branch created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 2. READ - Get All Branches
// ============================================
export const getAllBranches = async (req, res) => {
  try {
    const { 
      city, 
      state, 
      pincode, 
      search, 
      includeDeleted, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Build filter
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
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
        { pincode: { $regex: search, $options: "i" } }
      ];
    }
    
    if (!includeDeleted || includeDeleted === "false") {
      filter.isDeleted = false;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [branches, total] = await Promise.all([
      Branch.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v"),
      Branch.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: branches,
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
// 3. READ - Get Single Branch by ID
// ============================================
export const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await Branch.findById(id).select("-__v");

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    res.status(200).json({
      success: true,
      data: branch
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 4. READ - Get Branches by State
// ============================================
export const getBranchesByState = async (req, res) => {
  try {
    const { state } = req.params;

    if (!state) {
      return res.status(400).json({
        success: false,
        message: "State is required"
      });
    }

    const branches = await Branch.find({
      state: { $regex: state, $options: "i" },
      isDeleted: false
    })
    .sort({ city: 1, name: 1 })
    .select("-__v");

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 5. READ - Get Branches by City
// ============================================
export const getBranchesByCity = async (req, res) => {
  try {
    const { city } = req.params;

    if (!city) {
      return res.status(400).json({
        success: false,
        message: "City is required"
      });
    }

    const branches = await Branch.find({
      city: { $regex: city, $options: "i" },
      isDeleted: false
    })
    .sort({ name: 1 })
    .select("-__v");

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 6. READ - Get Branches by Pincode
// ============================================
export const getBranchesByPincode = async (req, res) => {
  try {
    const { pincode } = req.params;

    if (!pincode) {
      return res.status(400).json({
        success: false,
        message: "Pincode is required"
      });
    }

    const branches = await Branch.find({
      pincode: pincode,
      isDeleted: false
    })
    .sort({ name: 1 })
    .select("-__v");

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 7. UPDATE - Update Branch
// ============================================
export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, state, pincode } = req.body;

    // Check if branch exists
    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    // Check duplicate name (if name is being changed)
    if (name && name !== branch.name) {
      const duplicate = await Branch.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id },
        isDeleted: false
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another branch with this name already exists"
        });
      }
    }

    // Update
    const updatedBranch = await Branch.findByIdAndUpdate(
      id,
      { name, city, state, pincode },
      { new: true, runValidators: true }
    ).select("-__v");

    res.status(200).json({
      success: true,
      data: updatedBranch,
      message: "Branch updated successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 8. DELETE - Soft Delete Branch
// ============================================
export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    // Soft delete
    branch.isDeleted = true;
    await branch.save();

    res.status(200).json({
      success: true,
      data: branch,
      message: "Branch deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 9. RESTORE - Restore Soft Deleted Branch
// ============================================
export const restoreBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await Branch.findById(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    if (!branch.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Branch is not deleted"
      });
    }

    branch.isDeleted = false;
    await branch.save();

    res.status(200).json({
      success: true,
      data: branch,
      message: "Branch restored successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID format"
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
export const permanentDeleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await Branch.findByIdAndDelete(id);
    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Branch permanently deleted"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 11. BULK DELETE - Delete Multiple Branches
// ============================================
export const bulkDeleteBranches = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of branch IDs"
      });
    }

    const result = await Branch.updateMany(
      { _id: { $in: ids } },
      { isDeleted: true }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} branches deleted successfully`,
      deletedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ============================================
// GET BRANCH STATISTICS (with toggle filter)
// ============================================
export const getBranchStatistics = async (req, res) => {
  try {
    const { status = "active" } = req.query; // ✅ Toggle filter: active, inactive, all, deleted

    // Build match condition based on status
    let matchCondition = {};
    
    switch (status) {
      case "active":
        matchCondition = { isDeleted: false, isActive: true };
        break;
      case "inactive":
        matchCondition = { isDeleted: false, isActive: false };
        break;
      case "deleted":
        matchCondition = { isDeleted: true };
        break;
      case "all":
        matchCondition = {};
        break;
      default:
        matchCondition = { isDeleted: false };
    }

    // Count total branches based on status
    const totalBranches = await Branch.countDocuments(matchCondition);

    // State-wise statistics
    const stateStats = await Branch.aggregate([
      { $match: matchCondition },
      { $group: { _id: "$state", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // City-wise statistics (top 10)
    const cityStats = await Branch.aggregate([
      { $match: matchCondition },
      { $group: { _id: "$city", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Pincode-wise statistics (top 10)
    const pincodeStats = await Branch.aggregate([
      { $match: matchCondition },
      { $group: { _id: "$pincode", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get active/inactive counts (if not deleted)
    let activeCount = 0;
    let inactiveCount = 0;
    let deletedCount = 0;

    if (status === "all" || status === "active" || status === "inactive") {
      const activeBranches = await Branch.countDocuments({ isDeleted: false, isActive: true });
      const inactiveBranches = await Branch.countDocuments({ isDeleted: false, isActive: false });
      const deletedBranches = await Branch.countDocuments({ isDeleted: true });
      
      activeCount = activeBranches;
      inactiveCount = inactiveBranches;
      deletedCount = deletedBranches;
    }

    res.status(200).json({
      success: true,
      data: {
        status: status,
        totalBranches,
        summary: {
          active: activeCount,
          inactive: inactiveCount,
          deleted: deletedCount
        },
        stateWise: stateStats,
        topCities: cityStats,
        topPincodes: pincodeStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};