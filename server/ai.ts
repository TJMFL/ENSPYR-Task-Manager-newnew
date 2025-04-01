import OpenAI from "openai";
import { z } from "zod";
import { TaskPriority } from "@shared/schema";

// Initialize OpenAI client with Groq API endpoint
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Task extraction schema
const extractedTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
  category: z.string().optional(),
});

export type ExtractedTask = z.infer<typeof extractedTaskSchema>;

// Function to extract tasks from text using Groq
export async function extractTasksFromText(text: string): Promise<ExtractedTask[]> {
  try {
    // Get current date information for context
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Using Groq's LLaMA 3 model which is fast and efficient
    const response = await groqClient.chat.completions.create({
      model: "llama3-70b-8192", // Using Groq's LLaMA 3 model
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that helps extract actionable tasks from text.
          Today's date is ${currentDate}.
          
          YOUR TASK:
          1. Identify clear tasks from the user's message
          2. For each task, determine:
             - A concise task title
             - A brief description if appropriate
             - Most importantly: Convert relative dates (like "tomorrow", "next week", "Friday") to actual YYYY-MM-DD format dates
             - Assign an appropriate priority (low/medium/high)
             - Assign a logical category if possible
          
          RULES FOR DATE HANDLING:
          - Always convert relative dates to absolute YYYY-MM-DD format
          - "tomorrow" = the day after the current date (${new Date(today.getTime() + 86400000).toISOString().split('T')[0]})
          - "next week" = 7 days from today
          - Specific days of the week (like "Monday") should be the next occurrence of that day
          - If a specific date is mentioned (e.g., "March 15"), use that
          - If no date is mentioned, do not include a dueDate field
          
          Respond with a JSON object containing a 'tasks' array with the following structure:
          {
            "tasks": [
              {
                "title": "Brief task title",
                "description": "Optional longer description",
                "dueDate": "YYYY-MM-DD", (based on current date context)
                "priority": "low", "medium", or "high" (based on urgency),
                "category": "Optional category/tag for the task"
              }
            ]
          }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in Groq AI response");
    }

    const parsedContent = JSON.parse(content);
    
    // Validate the extracted tasks
    if (!parsedContent.tasks || !Array.isArray(parsedContent.tasks)) {
      throw new Error("Invalid response format from AI");
    }

    // Validate each task against our schema
    const validatedTasks: ExtractedTask[] = [];
    for (const task of parsedContent.tasks) {
      try {
        const validatedTask = extractedTaskSchema.parse(task);
        validatedTasks.push(validatedTask);
      } catch (error) {
        console.error("Task validation error:", error);
        // Skip invalid tasks
      }
    }

    return validatedTasks;
  } catch (error) {
    console.error("Error extracting tasks:", error);
    throw new Error("Failed to extract tasks from text: " + (error as Error).message);
  }
}
