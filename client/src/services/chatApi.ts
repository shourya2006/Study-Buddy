import { apiClient, apiStreamRequest } from "./apiClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  subjectId: string;
  messages: Message[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatPreview {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}

export interface Topic {
  title: string;
  courseName: string;
  processedAt: string;
}

export interface VideoRec {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnail: string;
  url: string;
  similarityScore: number;
  subtopicsUsed: string[];
}

export interface TopicRecommendation {
  topicTitle: string;
  courseName: string;
  recommendations: VideoRec[];
  lastUpdated: string;
}

interface ChatResponse {
  success: boolean;
  chat?: Chat;
  error?: string;
}

interface ChatsResponse {
  success: boolean;
  chats?: ChatPreview[];
  error?: string;
}

interface TopicsResponse {
  success: boolean;
  topics?: Topic[];
  error?: string;
}

interface MessageResponse {
  success: boolean;
  response?: string;
  hasContext?: boolean;
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  error?: string;
}

interface RecommendationsResponse {
  success: boolean;
  subjectId?: string;
  recommendations?: TopicRecommendation[];
  error?: string;
}

export const chatApi = {
  async createChat(subjectId: string): Promise<ChatResponse> {
    return apiClient.post<ChatResponse>(`${API_BASE}/api/chat/new`, { subjectId });
  },

  async sendMessage(chatId: string, message: string): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(`${API_BASE}/api/chat/${chatId}/message`, { message });
  },

  async sendMessageStream(
    chatId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    return apiStreamRequest(
      `${API_BASE}/api/chat/${chatId}/stream`,
      { method: "POST", body: JSON.stringify({ message }) },
      onChunk,
      onComplete,
      onError
    );
  },

  async getChats(subjectId: string): Promise<ChatsResponse> {
    return apiClient.get<ChatsResponse>(`${API_BASE}/api/chat/list/${subjectId}`);
  },

  async getTopics(subjectId: string): Promise<TopicsResponse> {
    return apiClient.get<TopicsResponse>(`${API_BASE}/api/chat/topics/${subjectId}`);
  },

  async getChat(chatId: string): Promise<ChatResponse> {
    return apiClient.get<ChatResponse>(`${API_BASE}/api/chat/${chatId}`);
  },

  async renameChat(chatId: string, title: string): Promise<ChatResponse> {
    return apiClient.put<ChatResponse>(`${API_BASE}/api/chat/${chatId}/rename`, { title });
  },

  async deleteChat(chatId: string): Promise<DeleteResponse> {
    return apiClient.delete<DeleteResponse>(`${API_BASE}/api/chat/${chatId}`);
  },

  async getRecommendations(subjectId: string): Promise<RecommendationsResponse> {
    return apiClient.get<RecommendationsResponse>(`${API_BASE}/api/chat/recommendations/${subjectId}`);
  },
};
