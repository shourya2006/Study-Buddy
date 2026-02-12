const express = require("express");
const router = express.Router();
const fetchuser = require("../middlewares/fetchuser");
const {
  createChat,
  sendMessage,
  sendMessageStream,
  getChatById,
  getUserChats,
  renameChat,
  deleteChat,
} = require("../services/chatService");

router.post("/new", fetchuser, async (req, res) => {
  try {
    const { subjectId } = req.body;

    if (!subjectId) {
      return res.status(400).json({ error: "subjectId is required" });
    }

    const chat = await createChat(req.user.id, subjectId);

    res.status(201).json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        subjectId: chat.subjectId,
        messages: [],
      },
    });
  } catch (error) {
    console.error("[Chat API] Create error:", error.message);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

router.post("/:chatId/message", fetchuser, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const result = await sendMessage(chatId, message.trim(), req.user.id);

    res.json({
      success: true,
      response: result.message,
      hasContext: result.hasContext,
    });
  } catch (error) {
    console.error("[Chat API] Message error:", error.message);
    if (error.message === "Chat not found") {
      return res.status(404).json({ error: "Chat not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.status(500).json({ error: "Failed to send message" });
  }
});

router.post("/:chatId/stream", fetchuser, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stream = sendMessageStream(chatId, message.trim(), req.user.id);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("[Chat API] Stream error:", error.message);
    if (error.message === "Chat not found") {
      res.write(`data: ${JSON.stringify({ error: "Chat not found" })}\n\n`);
    } else if (error.message === "Unauthorized") {
      res.write(`data: ${JSON.stringify({ error: "Unauthorized" })}\n\n`);
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`,
      );
    }
    res.end();
  }
});

router.get("/list/:subjectId", fetchuser, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const chats = await getUserChats(req.user.id, subjectId);

    res.json({
      success: true,
      chats,
    });
  } catch (error) {
    console.error("[Chat API] List error:", error.message);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

router.get("/topics/:subjectId", fetchuser, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const ProcessedLecture = require("../models/ProcessedLecture.model");

    const lectures = await ProcessedLecture.find({ subjectId })
      .select("title courseName processedAt")
      .sort({ processedAt: -1 })
      .lean();

    const filteredLectures = lectures.filter(
      (l) => !l.title.includes("Course and Instructor Introduction"),
    );

    const groupedByDate = {};
    filteredLectures.forEach((lecture) => {
      const date = new Date(lecture.processedAt).toDateString();
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(lecture);
    });

    const sortedDates = Object.keys(groupedByDate).sort(
      (a, b) => new Date(a) - new Date(b),
    );

    const sortedTopics = sortedDates.flatMap((date) => groupedByDate[date]);

    res.json({
      success: true,
      topics: sortedTopics.map((l) => ({
        title: l.title,
        courseName: l.courseName || "",
        processedAt: l.processedAt,
      })),
    });
  } catch (error) {
    console.error("[Chat API] Topics error:", error.message);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

router.get("/:chatId", fetchuser, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await getChatById(chatId, req.user.id);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        subjectId: chat.subjectId,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    });
  } catch (error) {
    console.error("[Chat API] Get error:", error.message);
    if (error.message === "Unauthorized") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

router.put("/:chatId/rename", fetchuser, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const chat = await renameChat(chatId, req.user.id, title.trim());

    res.json({
      success: true,
      chat: {
        id: chat._id,
        title: chat.title,
        updatedAt: chat.updatedAt,
      },
    });
  } catch (error) {
    console.error("[Chat API] Rename error:", error.message);
    if (error.message === "Chat not found") {
      return res.status(404).json({ error: "Chat not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.status(500).json({ error: "Failed to rename chat" });
  }
});

router.delete("/:chatId", fetchuser, async (req, res) => {
  try {
    const { chatId } = req.params;
    await deleteChat(chatId, req.user.id);

    res.json({
      success: true,
      message: "Chat deleted",
    });
  } catch (error) {
    console.error("[Chat API] Delete error:", error.message);
    if (error.message === "Chat not found") {
      return res.status(404).json({ error: "Chat not found" });
    }
    if (error.message === "Unauthorized") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

module.exports = router;
