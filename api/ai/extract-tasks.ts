import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { TaskPriority } from '../../shared/schema';
import { isAuthenticated } from '../../lib/auth';

// Initialize OpenAI client with Groq API endpoint
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Task extraction schema
const extractedTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum([
    TaskPriority.HIGH,
    TaskPriority.MEDIUM,
    TaskPriority.LOW
  ]).default(TaskPriority.MEDIUM),
  category: z.string().optional(),
});

export type ExtractedTask = z.infer<typeof extractedTaskSchema>;

export async function POST(request: NextRequest) {
  // Check authentication
  const authResponse = await isAuthenticated(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ message: 'Text content is required' }, { status: 400 });
    }

    // Extract tasks from text using AI
    const completion = await groqClient.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: `You are a task extraction assistant. Extract actionable tasks from the user's text and return them as a JSON object with the following format:
          { "tasks": [
              { 
                "title": "Task title", 
                "description": "Detailed task description", 
                "dueDate": "YYYY-MM-DD", (optional, if mentioned in the text)
                "priority": "HIGH" | "MEDIUM" | "LOW" (based on importance, urgency, or impact),
                "category": "Work" | "Personal" | "Shopping" | etc. (optional, if a category is mentioned or implied)
              }
            ]
          }`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    const parsedContent = JSON.parse(content);
    
    // Validate the extracted tasks
    if (!parsedContent.tasks || !Array.isArray(parsedContent.tasks)) {
      throw new Error('Invalid response format from AI');
    }

    // Validate each task against our schema
    const validatedTasks: ExtractedTask[] = [];
    for (const task of parsedContent.tasks) {
      try {
        const validatedTask = extractedTaskSchema.parse(task);
        validatedTasks.push(validatedTask);
      } catch (error) {
        console.error('Task validation error:', error);
        // Skip invalid tasks
      }
    }

    return NextResponse.json({ tasks: validatedTasks });
  } catch (error) {
    return NextResponse.json({ 
      message: 'Failed to extract tasks', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}