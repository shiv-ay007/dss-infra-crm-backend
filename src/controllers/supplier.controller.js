import { Supplier } from "../models/supplier.model.js";

// 1. CREATE - New Supplier
export const createSupplier = async (req, res) => {
  try {
    const { code, gstin } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Supplier code is required"
      });
    }

    // Check duplicate code
    const existingCode = await Supplier.findOne({
      code: code.toUpperCase(),
      isDeleted: false
    });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: "Supplier with this code already exists"
      });
    }

    // Check duplicate GSTIN if provided
    if (gstin && gstin.trim()) {
      const existingGstin = await Supplier.findOne({
        gstin: gstin.toUpperCase(),
        isDeleted: false
      });
      if (existingGstin) {
        return res.status(409).json({
          success: false,
          message: "Supplier with this GSTIN already exists"
        });
      }
    }

    const supplier = new Supplier(req.body);
    await supplier.save();

    res.status(201).json({
      success: true,
      data: supplier,
      message: "Supplier created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create supplier"
    });
  }
};

// 2. READ - Get All Suppliers with pagination & filters
export const getAllSuppliers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search,
      status,
      supplierType,
      city,
      state
    } = req.query;

    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } }
      ];
    }

    if (status && status !== "All") {
      query.status = status;
    }

    if (supplierType && supplierType !== "All") {
      query.supplierType = supplierType;
    }

    if (city) query.city = { $regex: city, $options: "i" };
    if (state) query.state = { $regex: state, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Supplier.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: suppliers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch suppliers"
    });
  }
};

// 3. READ - Get Supplier by ID
export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch supplier details"
    });
  }
};

// 4. UPDATE - Supplier
export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    res.status(200).json({
      success: true,
      data: supplier,
      message: "Supplier updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update supplier"
    });
  }
};

// 5. DELETE - Soft Delete
export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete supplier"
    });
  }
};
