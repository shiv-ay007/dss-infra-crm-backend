import { Contractor } from "../models/contractor.model.js";

// 1. CREATE - New Contractor
export const createContractor = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Contractor code is required"
      });
    }

    const existing = await Contractor.findOne({
      code: code.toUpperCase(),
      isDeleted: false
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Contractor with this code already exists"
      });
    }

    const contractor = new Contractor(req.body);
    await contractor.save();

    res.status(201).json({
      success: true,
      data: contractor,
      message: "Contractor created successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create contractor"
    });
  }
};

// 2. READ - Get All Contractors
export const getAllContractors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search,
      status,
      contractorType,
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

    if (status && status !== "All") query.status = status;
    if (contractorType && contractorType !== "All") query.contractorType = contractorType;
    if (city) query.city = { $regex: city, $options: "i" };
    if (state) query.state = { $regex: state, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);

    const [contractors, total] = await Promise.all([
      Contractor.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Contractor.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: contractors,
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
      message: error.message || "Failed to fetch contractors"
    });
  }
};

// 3. READ - Single Contractor
export const getContractorById = async (req, res) => {
  try {
    const contractor = await Contractor.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    res.status(200).json({
      success: true,
      data: contractor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch contractor details"
    });
  }
};

// 4. UPDATE - Contractor
export const updateContractor = async (req, res) => {
  try {
    const contractor = await Contractor.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      req.body,
      { new: true, runValidators: true }
    );

    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    res.status(200).json({
      success: true,
      data: contractor,
      message: "Contractor updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update contractor"
    });
  }
};

// 5. DELETE - Soft delete
export const deleteContractor = async (req, res) => {
  try {
    const contractor = await Contractor.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!contractor) {
      return res.status(404).json({
        success: false,
        message: "Contractor not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Contractor deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete contractor"
    });
  }
};
