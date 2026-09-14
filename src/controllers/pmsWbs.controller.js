import { PmsStage } from "../models/pmsStage.model.js";
import { PmsWork } from "../models/pmsWork.model.js";
import { PmsTask } from "../models/pmsTask.model.js";

// 1. GET ALL WBS MASTER DATA (Directly from MongoDB collections: pms_stages, pms_works, pms_tasks)
export const getAllWbsMasterData = async (req, res) => {
  try {
    const stages = await PmsStage.find({ isDeleted: false }).sort({ order: 1, createdAt: 1 });
    const works = await PmsWork.find({ isDeleted: false }).sort({ order: 1, createdAt: 1 });
    const tasks = await PmsTask.find({ isDeleted: false }).sort({ order: 1, createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: "PMS WBS master data retrieved successfully from MongoDB",
      data: {
        stages,
        works,
        tasks
      }
    });
  } catch (error) {
    console.error("Error fetching PMS WBS data from MongoDB:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch PMS WBS data: " + error.message
    });
  }
};

// 1.1 GET PAGINATED & FILTERED STAGES
export const getStagesPaginated = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { isDeleted: false };
    if (status && status !== "All") query.status = status;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { stage_code: regex },
        { stage_name: regex },
        { description: regex }
      ];
    }

    const [stages, total] = await Promise.all([
      PmsStage.find(query).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limitNum),
      PmsStage.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: stages,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error("Error fetching paginated stages:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 1.2 GET PAGINATED & FILTERED WORKS
export const getWorksPaginated = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", stage_id, status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { isDeleted: false };
    if (stage_id && stage_id !== "All") query.stage_id = stage_id;
    if (status && status !== "All") query.status = status;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { work_code: regex },
        { work_name: regex },
        { stage_code: regex }
      ];
    }

    const [works, total] = await Promise.all([
      PmsWork.find(query).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limitNum),
      PmsWork.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: works,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error("Error fetching paginated works:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 1.3 GET PAGINATED & FILTERED TASKS
export const getTasksPaginated = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", stage_id, work_id, work_done_by, status } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { isDeleted: false };
    if (stage_id && stage_id !== "All") query.stage_id = stage_id;
    if (work_id && work_id !== "All") query.work_id = work_id;
    if (work_done_by && work_done_by !== "All") query.work_done_by = work_done_by;
    if (status && status !== "All") query.status = status;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { task_code: regex },
        { task_name: regex },
        { work_code: regex },
        { stage_code: regex }
      ];
    }

    const [tasks, total] = await Promise.all([
      PmsTask.find(query).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limitNum),
      PmsTask.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error("Error fetching paginated tasks:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. GET CURRENT MASTER DATA
export const seedInitialData = async (req, res) => {
  try {
    const stages = await PmsStage.find({ isDeleted: false }).sort({ order: 1 });
    const works = await PmsWork.find({ isDeleted: false }).sort({ order: 1 });
    const tasks = await PmsTask.find({ isDeleted: false }).sort({ order: 1 });

    return res.status(200).json({
      success: true,
      message: "PMS master data retrieved successfully",
      data: { stages, works, tasks }
    });
  } catch (error) {
    console.error("Error retrieving PMS data:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 3. CREATE STAGE
export const createStage = async (req, res) => {
  try {
    const { stage_code, stage_name, description, order, status } = req.body;

    if (!stage_code || !stage_code.trim()) {
      return res.status(400).json({ success: false, message: "Stage Code is required" });
    }
    if (!stage_name || !stage_name.trim()) {
      return res.status(400).json({ success: false, message: "Stage Name is required" });
    }

    const trimmedCode = stage_code.trim().toUpperCase();
    const existing = await PmsStage.findOne({ stage_code: trimmedCode, isDeleted: false });
    if (existing) {
      return res.status(409).json({ success: false, message: "Stage with code " + trimmedCode + " already exists" });
    }

    let itemOrder = Number(order);
    if (isNaN(itemOrder) || itemOrder === 0) {
      const maxStage = await PmsStage.findOne({ isDeleted: false }).sort({ order: -1 });
      itemOrder = maxStage && maxStage.order ? maxStage.order + 1 : 1;
    }

    const newStage = await PmsStage.create({
      stage_code: trimmedCode,
      stage_name: stage_name.trim(),
      description: description ? description.trim() : stage_name.trim(),
      order: itemOrder,
      status: status || "Active"
    });

    return res.status(201).json({
      success: true,
      message: "Stage created successfully in pms_stages collection",
      data: newStage
    });
  } catch (error) {
    console.error("Error creating stage:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. UPDATE STAGE
export const updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage_code, stage_name, description, order, status } = req.body;

    const stage = await PmsStage.findById(id);
    if (!stage || stage.isDeleted) {
      return res.status(404).json({ success: false, message: "Stage not found" });
    }

    if (stage_code && stage_code.trim().toUpperCase() !== stage.stage_code) {
      const trimmedCode = stage_code.trim().toUpperCase();
      const duplicate = await PmsStage.findOne({ stage_code: trimmedCode, _id: { $ne: id }, isDeleted: false });
      if (duplicate) {
        return res.status(409).json({ success: false, message: "Stage code " + trimmedCode + " is already used" });
      }
      await PmsWork.updateMany({ stage_id: id }, { stage_code: trimmedCode });
      await PmsTask.updateMany({ stage_id: id }, { stage_code: trimmedCode });
      stage.stage_code = trimmedCode;
    }

    if (stage_name !== undefined) stage.stage_name = stage_name.trim();
    if (description !== undefined) stage.description = description.trim();
    if (order !== undefined) stage.order = Number(order) || stage.order;
    if (status !== undefined) stage.status = status;

    await stage.save();

    return res.status(200).json({
      success: true,
      message: "Stage updated successfully",
      data: stage
    });
  } catch (error) {
    console.error("Error updating stage:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. CREATE WORK
export const createWork = async (req, res) => {
  try {
    const { stage_id, work_code, work_name, contractor_type, order, status } = req.body;

    if (!stage_id) {
      return res.status(400).json({ success: false, message: "Stage is required" });
    }
    if (!work_code || !work_code.trim()) {
      return res.status(400).json({ success: false, message: "Work Code is required" });
    }
    if (!work_name || !work_name.trim()) {
      return res.status(400).json({ success: false, message: "Work Name is required" });
    }

    const parentStage = await PmsStage.findById(stage_id);
    if (!parentStage || parentStage.isDeleted) {
      return res.status(404).json({ success: false, message: "Selected Stage not found" });
    }

    const trimmedCode = work_code.trim().toUpperCase();
    const existing = await PmsWork.findOne({ work_code: trimmedCode, isDeleted: false });
    if (existing) {
      return res.status(409).json({ success: false, message: "Work with code " + trimmedCode + " already exists" });
    }

    let itemOrder = Number(order);
    if (isNaN(itemOrder) || itemOrder === 0) {
      const maxWork = await PmsWork.findOne({ isDeleted: false }).sort({ order: -1 });
      itemOrder = maxWork && maxWork.order ? maxWork.order + 1 : 1;
    }

    const newWork = await PmsWork.create({
      stage_id: parentStage._id,
      stage_code: parentStage.stage_code,
      work_code: trimmedCode,
      work_name: work_name.trim(),
      contractor_type: contractor_type ? contractor_type.trim() : "",
      order: itemOrder,
      status: status || "Active"
    });

    return res.status(201).json({
      success: true,
      message: "Work created successfully in pms_works collection",
      data: newWork
    });
  } catch (error) {
    console.error("Error creating work:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. UPDATE WORK
export const updateWork = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage_id, work_code, work_name, contractor_type, order, status } = req.body;

    const work = await PmsWork.findById(id);
    if (!work || work.isDeleted) {
      return res.status(404).json({ success: false, message: "Work not found" });
    }

    if (stage_id && stage_id !== work.stage_id) {
      const parentStage = await PmsStage.findById(stage_id);
      if (!parentStage || parentStage.isDeleted) {
        return res.status(404).json({ success: false, message: "New Stage not found" });
      }
      work.stage_id = parentStage._id;
      work.stage_code = parentStage.stage_code;
      await PmsTask.updateMany({ work_id: id }, { stage_id: parentStage._id, stage_code: parentStage.stage_code });
    }

    if (work_code && work_code.trim().toUpperCase() !== work.work_code) {
      const trimmedCode = work_code.trim().toUpperCase();
      const duplicate = await PmsWork.findOne({ work_code: trimmedCode, _id: { $ne: id }, isDeleted: false });
      if (duplicate) {
        return res.status(409).json({ success: false, message: "Work code " + trimmedCode + " already exists" });
      }
      await PmsTask.updateMany({ work_id: id }, { work_code: trimmedCode });
      work.work_code = trimmedCode;
    }

    if (work_name !== undefined) work.work_name = work_name.trim();
    if (contractor_type !== undefined) work.contractor_type = contractor_type.trim();
    if (order !== undefined) work.order = Number(order) || work.order;
    if (status !== undefined) work.status = status;

    await work.save();

    return res.status(200).json({
      success: true,
      message: "Work updated successfully",
      data: work
    });
  } catch (error) {
    console.error("Error updating work:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. CREATE TASK
export const createTask = async (req, res) => {
  try {
    const { work_id, task_code, task_name, work_done_by, materials, order, status } = req.body;

    if (!work_id) {
      return res.status(400).json({ success: false, message: "Work is required" });
    }
    if (!task_code || !task_code.trim()) {
      return res.status(400).json({ success: false, message: "Task Code is required" });
    }
    if (!task_name || !task_name.trim()) {
      return res.status(400).json({ success: false, message: "Task Name is required" });
    }

    const parentWork = await PmsWork.findById(work_id);
    if (!parentWork || parentWork.isDeleted) {
      return res.status(404).json({ success: false, message: "Selected Work not found" });
    }

    const trimmedCode = task_code.trim().toUpperCase();
    const existing = await PmsTask.findOne({ task_code: trimmedCode, isDeleted: false });
    if (existing) {
      return res.status(409).json({ success: false, message: "Task with code " + trimmedCode + " already exists" });
    }

    let itemOrder = Number(order);
    if (isNaN(itemOrder) || itemOrder === 0) {
      const maxTask = await PmsTask.findOne({ isDeleted: false }).sort({ order: -1 });
      itemOrder = maxTask && maxTask.order ? maxTask.order + 1 : 1;
    }

    const newTask = await PmsTask.create({
      work_id: parentWork._id,
      work_code: parentWork.work_code,
      stage_id: parentWork.stage_id,
      stage_code: parentWork.stage_code,
      task_code: trimmedCode,
      task_name: task_name.trim(),
      work_done_by: work_done_by ? work_done_by.trim() : "",
      contractor_type: "",
      tools: "",
      materials: materials ? materials.trim() : "",
      order: itemOrder,
      status: status || "Active"
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully in pms_tasks collection",
      data: newTask
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. UPDATE TASK
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { work_id, task_code, task_name, work_done_by, materials, order, status } = req.body;

    const task = await PmsTask.findById(id);
    if (!task || task.isDeleted) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (work_id && work_id !== task.work_id) {
      const parentWork = await PmsWork.findById(work_id);
      if (!parentWork || parentWork.isDeleted) {
        return res.status(404).json({ success: false, message: "Selected Work not found" });
      }
      task.work_id = parentWork._id;
      task.work_code = parentWork.work_code;
      task.stage_id = parentWork.stage_id;
      task.stage_code = parentWork.stage_code;
    }

    if (task_code && task_code.trim().toUpperCase() !== task.task_code) {
      const trimmedCode = task_code.trim().toUpperCase();
      const duplicate = await PmsTask.findOne({ task_code: trimmedCode, _id: { $ne: id }, isDeleted: false });
      if (duplicate) {
        return res.status(409).json({ success: false, message: "Task code " + trimmedCode + " already exists" });
      }
      task.task_code = trimmedCode;
    }

    if (task_name !== undefined) task.task_name = task_name.trim();
    if (work_done_by !== undefined) task.work_done_by = work_done_by.trim();
    if (materials !== undefined) task.materials = materials.trim();
    if (order !== undefined) task.order = Number(order) || task.order;
    if (status !== undefined) task.status = status;

    await task.save();

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
