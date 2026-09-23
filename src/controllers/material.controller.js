import { Material } from "../models/material.model.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import path from "path";

// 1. CREATE - New Material
export const createMaterial = async (req, res) => {
  try {
    const data = { ...req.body };

    if (!data.code) {
      return res.status(400).json({
        success: false,
        message: "Material code is required"
      });
    }

    if (!data.name) {
      return res.status(400).json({
        success: false,
        message: "Material name is required"
      });
    }

    // Check duplicate code
    const existingCode = await Material.findOne({
      code: data.code.trim().toUpperCase(),
      isDeleted: false
    });

    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: "Material with this code already exists"
      });
    }

    // Parse numeric fields if sent as strings (e.g. from FormData)
    if (data.standardPurchaseRate !== undefined && data.standardPurchaseRate !== "") {
      data.standardPurchaseRate = Number(data.standardPurchaseRate) || 0;
    }
    if (data.conversionFactor !== undefined && data.conversionFactor !== "") {
      data.conversionFactor = Number(data.conversionFactor) || null;
    }
    if (data.leadTimeDays !== undefined && data.leadTimeDays !== "") {
      data.leadTimeDays = Number(data.leadTimeDays) || 0;
    }
    if (data.moq !== undefined && data.moq !== "") {
      data.moq = Number(data.moq) || 0;
    }

    // Handle existing documents if sent as JSON string in FormData
    let documentsList = [];
    if (typeof data.documents === "string") {
      try {
        documentsList = JSON.parse(data.documents);
      } catch (e) {
        documentsList = [];
      }
    } else if (Array.isArray(data.documents)) {
      documentsList = [...data.documents];
    }

    // Handle File Uploads via Multer & Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const cloudinaryRes = await uploadOnCloudinary(file.path);
          if (cloudinaryRes && cloudinaryRes.secure_url) {
            const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
            documentsList.push({
              name: file.originalname,
              size: (file.size / 1024).toFixed(1) + " KB",
              type: ext,
              url: cloudinaryRes.secure_url,
              public_id: cloudinaryRes.public_id
            });
          }
        } catch (uploadErr) {
          console.error("Cloudinary upload error for file:", file.originalname, uploadErr);
        }
      }
    }

    data.documents = documentsList;
    data.code = data.code.trim().toUpperCase();

    const material = new Material(data);
    await material.save();

    res.status(201).json({
      success: true,
      data: material,
      message: "Material created and saved to database successfully"
    });
  } catch (error) {
    console.error("Create material error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create material"
    });
  }
};

// 2. READ - Get All Materials with pagination & filters
export const getAllMaterials = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search,
      category,
      subCategory,
      materialType,
      brand,
      status,
      preferredSupplier
    } = req.query;

    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { subCategory: { $regex: search, $options: "i" } },
        { preferredSupplier: { $regex: search, $options: "i" } },
        { specificationGrade: { $regex: search, $options: "i" } }
      ];
    }

    if (category && category !== "All") {
      query.category = category;
    }

    if (subCategory && subCategory !== "All") {
      query.subCategory = subCategory;
    }

    if (materialType && materialType !== "All") {
      query.materialType = materialType;
    }

    if (brand && brand !== "All") {
      query.brand = { $regex: brand, $options: "i" };
    }

    if (status && status !== "All") {
      query.status = status;
    }

    if (preferredSupplier && preferredSupplier !== "All") {
      query.preferredSupplier = { $regex: preferredSupplier, $options: "i" };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [materials, total] = await Promise.all([
      Material.find(query)
        .populate("preferredSupplierId", "name code phone email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Material.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: materials,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error("Get materials error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch materials"
    });
  }
};

// 3. READ - Single Material by ID
export const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await Material.findOne({
      _id: id,
      isDeleted: false
    }).populate("preferredSupplierId", "name code phone email");

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found"
      });
    }

    res.status(200).json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error("Get material by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch material"
    });
  }
};

// 4. UPDATE - Material by ID
export const updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    const material = await Material.findOne({ _id: id, isDeleted: false });
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found"
      });
    }

    // Check code duplication if code changed
    if (data.code && data.code.trim().toUpperCase() !== material.code) {
      const duplicateCode = await Material.findOne({
        code: data.code.trim().toUpperCase(),
        _id: { $ne: id },
        isDeleted: false
      });

      if (duplicateCode) {
        return res.status(409).json({
          success: false,
          message: "Another material with this code already exists"
        });
      }
      data.code = data.code.trim().toUpperCase();
    }

    // Parse numeric values if provided
    if (data.standardPurchaseRate !== undefined && data.standardPurchaseRate !== "") {
      data.standardPurchaseRate = Number(data.standardPurchaseRate) || 0;
    }
    if (data.conversionFactor !== undefined && data.conversionFactor !== "") {
      data.conversionFactor = Number(data.conversionFactor) || null;
    }
    if (data.leadTimeDays !== undefined && data.leadTimeDays !== "") {
      data.leadTimeDays = Number(data.leadTimeDays) || 0;
    }
    if (data.moq !== undefined && data.moq !== "") {
      data.moq = Number(data.moq) || 0;
    }

    // Existing documents parsing
    let currentDocs = [];
    if (typeof data.documents === "string") {
      try {
        currentDocs = JSON.parse(data.documents);
      } catch (e) {
        currentDocs = material.documents || [];
      }
    } else if (Array.isArray(data.documents)) {
      currentDocs = [...data.documents];
    } else {
      currentDocs = material.documents || [];
    }

    // Upload newly provided files via Multer to Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const cloudinaryRes = await uploadOnCloudinary(file.path);
          if (cloudinaryRes && cloudinaryRes.secure_url) {
            const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
            currentDocs.push({
              name: file.originalname,
              size: (file.size / 1024).toFixed(1) + " KB",
              type: ext,
              url: cloudinaryRes.secure_url,
              public_id: cloudinaryRes.public_id
            });
          }
        } catch (uploadErr) {
          console.error("Cloudinary upload error on update:", file.originalname, uploadErr);
        }
      }
    }

    data.documents = currentDocs;

    const updatedMaterial = await Material.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedMaterial,
      message: "Material updated successfully"
    });
  } catch (error) {
    console.error("Update material error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update material"
    });
  }
};

// 5. DELETE - Permanent Hard Delete Material
export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await Material.findByIdAndDelete(id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Material permanently deleted successfully"
    });
  } catch (error) {
    console.error("Delete material error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete material"
    });
  }
};
