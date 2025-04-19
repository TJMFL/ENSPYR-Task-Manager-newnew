import { apiRequest } from '@/lib/queryClient';
import { ExtractedTask, AIMessage } from '@/lib/types';

// Function to extract tasks from text
export async function extractTasksFromText(text: string): Promise<ExtractedTask[]> {
  try {
    const response = await apiRequest('POST', '/api/ai/extract-tasks', { text });
    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error('Error extracting tasks:', error);
    throw error;
  }
}

// Function to save AI messages
export async function saveAIMessage(message: Omit<AIMessage, 'id' | 'timestamp'>): Promise<AIMessage> {
  try {
    const response = await apiRequest('POST', '/api/ai/messages', message);
    return await response.json();
  } catch (error) {
    console.error('Error saving AI message:', error);
    throw error;
  }
}

// Function to get recent AI messages
export async function getAIMessages(limit?: number): Promise<AIMessage[]> {
  try {
    const url = limit ? `/api/ai/messages?limit=${limit}` : '/api/ai/messages';
    const response = await apiRequest('GET', url);
    return await response.json();
  } catch (error) {
    console.error('Error fetching AI messages:', error);
    throw error;
  }
}
