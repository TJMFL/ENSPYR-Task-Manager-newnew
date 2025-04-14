import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Zap, SendHorizontal } from 'lucide-react';
import { useTaskManager } from '@/hooks/useTaskManager';
import { saveAIMessage, getAIMessages } from '@/lib/openai';
import ChatMessage from '@/components/ChatMessage';
import VoiceInput from '@/components/VoiceInput';
import NewTaskDialog from '@/components/NewTaskDialog';
import { ExtractedTask, TaskInput, TaskStatus } from '@/lib/types';

// Define message interface
interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  extractedTasks?: ExtractedTask[];
}

const AIAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ExtractedTask | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    extractTasks, 
    extractedTasks, 
    isExtracting,
    createTask,
    isPending
  } = useTaskManager();

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const fetchedMessages = await getAIMessages(10);
        if (fetchedMessages.length === 0) {
          // Add a welcome message if no messages exist
          const welcomeMessage: Message = {
            id: 0,
            role: 'system',
            content: "Hello! I can help you extract tasks from emails or messages. Just paste your text below, and I'll identify actionable items.",
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
          await saveAIMessage({
            role: 'system',
            content: welcomeMessage.content,
          });
        } else {
          setMessages(fetchedMessages);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    fetchMessages();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle task extraction - runs after user submits a message
  const processTaskExtraction = async (userInput: string) => {
    // Create and show loading message
    const loadingMessage: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: 'Analyzing your message...',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, loadingMessage]);
    
    try {
      // Trigger task extraction and wait for it to complete
      // We use a custom Promise to ensure tasks are properly extracted
      const result = await new Promise<ExtractedTask[]>((resolve, reject) => {
        extractTasks(userInput);
        
        // Check every 300ms if tasks have been extracted
        const checkInterval = setInterval(() => {
          if (extractedTasks && extractedTasks.length > 0) {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            resolve(extractedTasks);
          }
        }, 300);
        
        // Set a timeout to prevent indefinite waiting
        const timeoutId = setTimeout(() => {
          clearInterval(checkInterval);
          // If no tasks found after 5 seconds, resolve with empty array
          resolve(extractedTasks || []);
        }, 5000);
      });
      
      // Create AI response with extracted tasks
      const aiResponse: Message = {
        id: Date.now() + 2,
        role: 'assistant',
        content: result.length > 0 
          ? "I've identified the following tasks from your text and intelligently assigned priorities based on context, deadlines, and importance:" 
          : "I couldn't identify any specific tasks in your message. Could you provide more details or a clearer description of the tasks?",
        timestamp: new Date(),
        extractedTasks: result,
      };
      
      // Save AI response to server
      await saveAIMessage({
        role: 'assistant',
        content: aiResponse.content,
      });
      
      // Update messages state, removing loading message
      setMessages(prev => {
        return prev.filter(msg => msg.id !== loadingMessage.id).concat(aiResponse);
      });
    } catch (error) {
      console.error('Error extracting tasks:', error);
      
      // Show error message
      const errorMessage: Message = {
        id: Date.now() + 2,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
      };
      
      // Save error message to server
      saveAIMessage({
        role: 'assistant',
        content: errorMessage.content,
      });
      
      // Update messages state, removing loading message
      setMessages(prev => {
        return prev.filter(msg => msg.id !== loadingMessage.id).concat(errorMessage);
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const currentInput = input.trim();
    
    // Add user message to UI
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    try {
      // Save user message to server
      await saveAIMessage({
        role: 'user',
        content: currentInput,
      });
      
      // Process task extraction
      await processTaskExtraction(currentInput);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Show error message if overall process fails
      const errorMessage: Message = {
        id: Date.now() + 2,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
      };
      
      // Save error message to server
      saveAIMessage({
        role: 'assistant',
        content: errorMessage.content,
      });
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle adding a single task
  const handleAddTask = (task: ExtractedTask) => {
    const taskInput: TaskInput = {
      ...task,
      status: TaskStatus.TODO,
      isAiGenerated: 1,
      source: 'AI Assistant'
    };
    
    createTask(taskInput);
  };

  // Handle adding all tasks
  const handleAddAllTasks = (tasks: ExtractedTask[]) => {
    tasks.forEach(task => {
      const taskInput: TaskInput = {
        ...task,
        status: TaskStatus.TODO,
        isAiGenerated: 1,
        source: 'AI Assistant'
      };
      
      createTask(taskInput);
    });
  };

  // Handle editing a task
  const handleEditTask = (task: ExtractedTask) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  // Handle task dialog close
  const handleCloseTaskDialog = () => {
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };

  // Handle edited task submission
  const handleTaskSubmit = (data: TaskInput) => {
    const taskInput: TaskInput = {
      ...data,
      status: TaskStatus.TODO,
      isAiGenerated: 1,
      source: 'AI Assistant'
    };
    
    createTask(taskInput);
    handleCloseTaskDialog();
  };

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold">AI Assistant</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow h-[calc(100vh-12rem)] flex flex-col">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center">
            <Zap className="h-5 w-5 mr-2 text-accent" />
            AI Assistant
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4" id="chatMessages">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id}
              role={message.role}
              content={message.content}
              extractedTasks={message.extractedTasks}
              onAddTask={handleAddTask}
              onAddAllTasks={handleAddAllTasks}
              onEditTask={handleEditTask}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <form className="flex items-center" onSubmit={handleSubmit}>
            <Textarea
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 mr-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Paste email or message here..."
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isExtracting}
            />
            <div className="flex flex-col space-y-2">
              <VoiceInput 
                onTranscript={(text) => setInput(prev => prev + ' ' + text)}
                disabled={isExtracting}
              />
              <Button 
                type="submit" 
                className="bg-primary hover:bg-blue-600 p-2 rounded-lg"
                disabled={isExtracting || !input.trim()}
              >
                <SendHorizontal className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Task Dialog */}
      {editingTask && (
        <NewTaskDialog 
          isOpen={isTaskDialogOpen} 
          onClose={handleCloseTaskDialog} 
          onSubmit={handleTaskSubmit}
          editTask={{
            id: 0,
            title: editingTask.title,
            description: editingTask.description,
            priority: editingTask.priority,
            dueDate: editingTask.dueDate ? new Date(editingTask.dueDate) : undefined,
            category: editingTask.category,
            status: TaskStatus.TODO,
            createdAt: new Date()
          }}
          isSubmitting={isPending}
        />
      )}
    </div>
  );
};

export default AIAssistant;
