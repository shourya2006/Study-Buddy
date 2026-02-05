const OpenAI = require("openai");
const Chat = require("../models/Chat.model");
const { generateEmbedding } = require("./vectorService");
const { queryVectors } = require("./pineconeService");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Vortex AI, an expert academic assistant helping students understand their course material. You have access to lecture content that was provided as context.

IMPORTANT GUIDELINES:
1. **Prioritize Lecture Content**: Base your answers primarily on the provided lecture context. Quote or reference specific parts when relevant.
2. **Be Comprehensive**: Provide detailed explanations with examples when helpful. Don't just give one-line answers.
3. **Use Clear Structure**: Format responses with markdown - use headings, bullet points, numbered lists, and code blocks where appropriate.
4. **Academic Accuracy**: Ensure technical accuracy. If the context is insufficient, clearly state what information is missing.
5. **Helpful Context**: When explaining concepts, connect them to related ideas from the lectures if available.
6. **Encourage Learning**: End with follow-up suggestions or related topics the student might want to explore.
7. **Mathematical Formatting**: You MUST wrap ALL mathematical expressions in LaTeX delimiters. Use single $ for inline math (e.g. $x^2$) and double $$ for block math (e.g. $$\int$$). DO NOT use plain parentheses for math (e.g. do not write ( \neg p ), write $(\neg p)$). DO NOT use \[ or \( syntax. STRICTLY use $ and $$.

If no relevant lecture content is found, provide general academic guidance while being clear that it's not from the course materials.`;

async function createChat(userId, subjectId) {
  const chat = new Chat({
    userId,
    subjectId,
    title: "New Chat",
    messages: [],
  });
  await chat.save();
  return chat;
}

async function getRelevantContext(query, subjectId) {
  try {
    console.log(`[Chat] Getting context for subjectId: ${subjectId}`);
    const queryEmbedding = await generateEmbedding(query);
    const matches = await queryVectors(queryEmbedding, subjectId, 8);

    if (!matches || matches.length === 0) {
      return null;
    }

    const contextChunks = matches
      .filter((m) => m.score > 0.25)
      .map((m) => {
        const title = m.metadata?.title || "Unknown Lecture";
        const text = m.metadata?.chunkText || "";
        return `[From: ${title}]\n${text}`;
      });

    if (contextChunks.length === 0) {
      return null;
    }

    return contextChunks.join("\n\n---\n\n");
  } catch (error) {
    console.error("[Chat] Error getting context:", error.message);
    return null;
  }
}

async function sendMessage(chatId, userMessage, userId) {
  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (chat.userId !== userId) {
    throw new Error("Unauthorized");
  }

  chat.messages.push({
    role: "user",
    content: userMessage,
    timestamp: new Date(),
  });

  if (chat.messages.length === 1) {
    chat.title =
      userMessage.substring(0, 50) + (userMessage.length > 50 ? "..." : "");
  }

  const context = await getRelevantContext(userMessage, chat.subjectId);

  const systemMessage = context
    ? `${SYSTEM_PROMPT}\n\nRelevant lecture content:\n${context}`
    : `${SYSTEM_PROMPT}\n\nNo specific lecture content found for this query. Provide general guidance.`;

  const conversationHistory = chat.messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        ...conversationHistory,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message.content;

    chat.messages.push({
      role: "assistant",
      content: assistantMessage,
      timestamp: new Date(),
    });

    chat.updatedAt = new Date();
    await chat.save();

    return {
      message: assistantMessage,
      hasContext: !!context,
    };
  } catch (error) {
    console.error("[Chat] OpenAI error:", error.message);
    throw new Error("Failed to generate response");
  }
}

async function* sendMessageStream(chatId, userMessage, userId) {
  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (chat.userId !== userId) {
    throw new Error("Unauthorized");
  }

  chat.messages.push({
    role: "user",
    content: userMessage,
    timestamp: new Date(),
  });

  if (chat.messages.length === 1) {
    chat.title =
      userMessage.substring(0, 50) + (userMessage.length > 50 ? "..." : "");
  }

  await chat.save();

  const context = await getRelevantContext(userMessage, chat.subjectId);

  const systemMessage = context
    ? `${SYSTEM_PROMPT}\n\nRelevant lecture content:\n${context}`
    : `${SYSTEM_PROMPT}\n\nNo specific lecture content found for this query. Provide general guidance.`;

  const conversationHistory = chat.messages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemMessage },
      ...conversationHistory,
    ],
    max_tokens: 1000,
    temperature: 0.7,
    stream: true,
  });

  let fullContent = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullContent += content;
      yield content;
    }
  }

  chat.messages.push({
    role: "assistant",
    content: fullContent,
    timestamp: new Date(),
  });

  chat.updatedAt = new Date();
  await chat.save();
}

async function getChatById(chatId, userId) {
  const chat = await Chat.findById(chatId).lean();

  if (!chat) {
    return null;
  }

  if (chat.userId !== userId) {
    throw new Error("Unauthorized");
  }

  return chat;
}

async function getUserChats(userId, subjectId) {
  const chats = await Chat.find({ userId, subjectId })
    .sort({ updatedAt: -1 })
    .select("_id title updatedAt messages")
    .lean();

  return chats.map((chat) => ({
    id: chat._id,
    title: chat.title,
    updatedAt: chat.updatedAt,
    messageCount: chat.messages.length,
    preview: chat.messages[0]?.content.substring(0, 50) || "",
  }));
}

async function renameChat(chatId, userId, newTitle) {
  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (chat.userId !== userId) {
    throw new Error("Unauthorized");
  }

  chat.title = newTitle;
  await chat.save();
  return chat;
}

async function deleteChat(chatId, userId) {
  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new Error("Chat not found");
  }

  if (chat.userId !== userId) {
    throw new Error("Unauthorized");
  }

  await Chat.findByIdAndDelete(chatId);
  return true;
}

module.exports = {
  createChat,
  sendMessage,
  sendMessageStream,
  getChatById,
  getUserChats,
  renameChat,
  deleteChat,
  getRelevantContext,
};
