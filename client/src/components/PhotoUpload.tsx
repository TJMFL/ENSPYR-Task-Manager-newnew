import React, { useState, useRef } from 'react';
import { Upload, X, ImageIcon, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Task, TaskInput } from '@/lib/types';
import { useTaskManager } from '@/hooks/useTaskManager';
import { useToast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  task: Task;
  onPhotoUploaded?: () => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ task, onPhotoUploaded }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(task.photoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateTask, isPending } = useTaskManager();
  const { toast } = useToast();

  // Trigger the file input click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file (JPEG, PNG, etc.).',
        variant: 'destructive',
      });
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Convert file to base64 for storage
      // In a production app, you would typically upload to a server/cloud storage
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        // Update task with the photo URL (base64 data)
        const updatedTask: Partial<TaskInput> = {
          photoUrl: base64data
        };
        
        await updateTask(task.id, updatedTask);
        setPhotoUrl(base64data);
        
        toast({
          title: 'Photo Uploaded',
          description: 'The photo has been attached to this task.',
        });
        
        if (onPhotoUploaded) {
          onPhotoUploaded();
        }
        
        setIsUploading(false);
      };
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload the photo. Please try again.',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  // Remove the uploaded photo
  const handleRemovePhoto = async () => {
    try {
      const updatedTask: Partial<TaskInput> = {
        photoUrl: null
      };
      
      await updateTask(task.id, updatedTask);
      setPhotoUrl(null);
      
      toast({
        title: 'Photo Removed',
        description: 'The photo has been removed from this task.',
      });
      
      if (onPhotoUploaded) {
        onPhotoUploaded();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove the photo. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col space-y-2 p-2 bg-gray-50 rounded-md">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center text-sm text-gray-600">
          <ImageIcon className="h-4 w-4 mr-1" />
          <span>Task Photo</span>
        </div>
      </div>
      
      {photoUrl ? (
        <div className="relative">
          <div className="aspect-video rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
            <img 
              src={photoUrl} 
              alt="Task photo" 
              className="object-contain max-h-full max-w-full" 
            />
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
            onClick={handleRemovePhoto}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 cursor-pointer" onClick={handleUploadClick}>
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500 text-center">
            Click to upload a photo
            <br />
            <span className="text-xs">JPEG, PNG (max 5MB)</span>
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            disabled={isUploading || isPending}
          />
        </div>
      )}
      
      {isUploading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;