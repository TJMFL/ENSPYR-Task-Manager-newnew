import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Browser compatibility check for SpeechRecognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!hasSpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in your browser.');
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US';

    // Set up speech recognition event handlers
    recognitionInstance.onstart = () => {
      setIsListening(true);
      setErrorMessage(null);
    };

    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error', event);
      setErrorMessage(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    recognitionInstance.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    setRecognition(recognitionInstance);

    // Cleanup
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {
          // Ignore errors when stopping an already stopped recognition
        }
      }
    };
  }, [onTranscript]);

  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error('Error starting speech recognition', e);
        setErrorMessage('Error starting speech recognition. Please try again.');
      }
    }
  }, [isListening, recognition]);

  if (!hasSpeechRecognition) {
    return (
      <Button disabled title="Speech recognition not supported in your browser">
        <MicOff className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`p-2 rounded-lg ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-200 hover:bg-gray-300'}`}
        title={isListening ? 'Stop recording' : 'Start voice input'}
      >
        {isListening ? (
          <Mic className="h-5 w-5 text-white" />
        ) : (
          <Mic className="h-5 w-5 text-gray-700" />
        )}
      </Button>
      
      {errorMessage && (
        <div className="absolute bottom-full mb-2 bg-red-100 text-red-800 text-xs p-1 rounded">
          {errorMessage}
        </div>
      )}
      
      {isListening && (
        <div className="absolute top-0 right-0 h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;