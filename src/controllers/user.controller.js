import { User } from "../models/user.model.js";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// ============================================
// 1. CREATE - New User
// ============================================
export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      departments,
      branch,
      address
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required"
      });
    }
    if (!departments) {
      return res.status(400).json({
        success: false,
        message: "department is required"
      });
    }


    if (!branch) {
      return res.status(400).json({
        success: false,
        message: "branch is required"
      });
    }


    // Check duplicate email
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Hash password (when you uncomment bcrypt)
    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      phone,
      password, // Change to: password: hashedPassword
      departments,
      branch,
      address
    });

    await user.save();

    // Populate references
    await user.populate([
      { path: "departments", select: "name city" },
      { path: "branch", select: "name city" }
    ]);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: "User created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 2. READ - Get All Users
// ============================================
export const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      branch,
      department,
      isActive,
      includeDeleted,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (branch) {
      filter.branch = branch;
    }

    if (department) {
      filter.departments = department;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (!includeDeleted || includeDeleted === "false") {
      filter.isDeleted = false;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate("departments", "name city")
        .populate("branch", "name city")
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-password -refreshToken -__v"),
      User.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: users,
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
// 3. READ - Get Single User by ID
// ============================================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate("departments", "name city address")
      .populate("branch", "name city pincode")
      .select("-password -refreshToken -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 4. READ - Get User by Email
// ============================================
export const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({
      email: email.toLowerCase(),
      isDeleted: false
    })
      .populate("departments", "name city")
      .populate("branch", "name city")
      .select("-password -refreshToken -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 5. UPDATE - Update User
// ============================================
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      password,
      role,
      departments,
      branch,
      address,
      isActive
    } = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check duplicate email (if email is being changed)
    if (email && email !== user.email) {
      const duplicate = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
        isDeleted: false
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Another user with this email already exists"
        });
      }
    }

    // Hash password if provided (when you uncomment bcrypt)
    // let updatedPassword = user.password;
    // if (password) {
    //   updatedPassword = await bcrypt.hash(password, 10);
    // }

    // Update
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        name,
        email: email?.toLowerCase(),
        phone,
        // password: updatedPassword,
        password,
        role,
        departments,
        branch,
        address,
        isActive
      },
      { new: true, runValidators: true }
    )
      .populate("departments", "name city")
      .populate("branch", "name city")
      .select("-password -refreshToken -__v");

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "User updated successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 6. DELETE - Soft Delete User
// ============================================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Soft delete
    user.isDeleted = true;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(200).json({
      success: true,
      data: userResponse,
      message: "User deleted successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 7. RESTORE - Restore Soft Deleted User
// ============================================
export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "User is not deleted"
      });
    }

    user.isDeleted = false;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(200).json({
      success: true,
      data: userResponse,
      message: "User restored successfully"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 8. PERMANENT DELETE - Hard Delete
// ============================================
export const permanentDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "User permanently deleted"
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// 9. BULK DELETE - Delete Multiple Users
// ============================================
export const bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of user IDs"
      });
    }

    const result = await User.updateMany(
      { _id: { $in: ids } },
      { isDeleted: true }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} users deleted successfully`,
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
// 10. GET USERS BY BRANCH
// ============================================
export const getUsersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch ID is required"
      });
    }

    const users = await User.find({
      branch: branchId,
      isDeleted: false,
      isActive: true
    })
      .populate("departments", "name city")
      .populate("branch", "name city")
      .select("-password -refreshToken -__v")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
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
// 11. GET USERS BY DEPARTMENT
// ============================================
export const getUsersByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message: "Department ID is required"
      });
    }

    const users = await User.find({
      departments: departmentId,
      isDeleted: false,
      isActive: true
    })
      .populate("departments", "name city")
      .populate("branch", "name city")
      .select("-password -refreshToken -__v")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
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
// 12. TOGGLE USER ACTIVE STATUS
// ============================================
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(200).json({
      success: true,
      data: userResponse,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format"
      });
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};