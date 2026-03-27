import { useState } from 'react';
import { Mic, X, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const handleMicClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsListening(true);
      // Simulate voice recognition
      setTimeout(() => {
        setTranscript('Mere expenses dikhao');
        setIsListening(false);
        setTimeout(() => {
          setTranscript('');
          setIsOpen(false);
        }, 3000);
      }, 2000);
    } else {
      setIsListening(false);
      setTranscript('');
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={handleMicClick}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full shadow-lg flex items-center justify-center hover:shadow-2xl transition-shadow z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Mic className="w-7 h-7 text-white" />
      </motion.button>

      {/* Voice Assistant Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-28 right-8 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Voice Assistant</h3>
                    <p className="text-xs opacity-80">Speak in Hindi or English</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Waveform Animation */}
            <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">
              {isListening ? (
                <div className="flex items-end gap-1 h-16">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-2 bg-gradient-to-t from-green-600 to-blue-600 rounded-full"
                      animate={{
                        height: ['20px', '60px', '20px'],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              ) : transcript ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Volume2 className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-lg font-medium mb-2">Samajh gaya! 👍</p>
                  <p className="text-sm text-gray-600">&quot;{transcript}&quot;</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Mic className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-600">Click mic to start</p>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-gray-600">
                  {isListening ? 'Listening...' : transcript ? 'Processing...' : 'Ready'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
