import React, { useState, useRef, useEffect } from 'react';
import { MicroStory, UserRole, UiLanguage, UserProfile } from '../types';
import { PROFILES } from '../data/mockData';
import { dbService } from '../lib/dbService';
import { Camera, Mic, X, RotateCcw, Video } from 'lucide-react';
import { translations } from '../lib/translations';

interface NewStoryModalProps {
  currentUser: UserProfile;
  currentLang: UiLanguage;
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  onAddStory: (story: MicroStory) => void;
}

export const NewStoryModal: React.FC<NewStoryModalProps> = ({ currentUser, currentLang, roomId, isOpen, onClose, onAddStory }) => {
  const [caption, setCaption] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const t = translations[currentLang].newStory;

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Video play failed:", e));
        };
      }
      streamRef.current = stream;
      setIsCameraActive(true);
      setCapturedImage(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access denied. Please check your browser permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 5000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() || isUploading) return;

    setIsUploading(true);

    try {
      let finalImageUrl = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80';
      if (capturedImage) {
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        finalImageUrl = await dbService.uploadMedia(blob, `rooms/${roomId}/stories/photo_${Date.now()}.jpg`);
      }

      let finalAudioUrl = '';
      if (audioUrl) {
        const res = await fetch(audioUrl);
        const blob = await res.blob();
        finalAudioUrl = await dbService.uploadMedia(blob, `rooms/${roomId}/stories/audio_${Date.now()}.webm`);
      }

      const isWilliam = currentUser.identity === 'William';
      const targetLang = isWilliam ? 'Cantonese' : 'English/Swedish';

      let translatedCaption = `[AI Translated]: ${caption}`;
      let learningBreakdown = undefined;
      let jyutping = '';

      try {
        const transRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: caption, targetLang })
        });
        const transData = await transRes.json();
        if (transData.translatedText) {
          translatedCaption = transData.translatedText;
          learningBreakdown = transData.learningBreakdown;
          jyutping = transData.jyutping;
        }
      } catch (err) {
        console.warn("Story translation failed:", err);
      }

      const newStory: Partial<MicroStory> = {
        userId: currentUser.uid,
        authorName: currentUser.name,
        caption,
        translatedCaption,
        learningBreakdown,
        jyutping,
        imageUrl: finalImageUrl,
        voiceSnippetDuration: finalAudioUrl ? '0:05' : '',
        culturalHotspots: [
          { title: 'Moment Highlight', description: 'Shared cultural check-in.', x: 50, y: 50 }
        ]
      };

      await dbService.addStory(roomId, newStory);
      resetForm();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setCaption('');
    setCapturedImage(null);
    setAudioUrl(null);
    setIsCameraActive(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{t.title}</h3>
            <p className="text-xs text-slate-500">{t.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.captionLabel}</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={t.captionPlaceholder}
              rows={2}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t.photoLabel}</label>
            <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
              {isCameraActive ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : capturedImage ? (
                <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
              ) : (
                <div className="text-center p-6">
                  <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Smile for your partner!</p>
                </div>
              )}
              
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
                {!isCameraActive && !capturedImage && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-rose-700 flex items-center space-x-2"
                  >
                    <Video className="w-4 h-4" />
                    <span>{t.cameraOn}</span>
                  </button>
                )}
                {isCameraActive && (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="bg-rose-600 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-rose-700"
                  >
                    {t.captureBtn}
                  </button>
                )}
                {capturedImage && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t.retakeBtn}</span>
                  </button>
                )}
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="bg-rose-50 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-rose-600'} text-white`}>
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{t.audioLabel}</p>
                <p className="text-[11px] text-slate-500">{t.audioSub}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {audioUrl && !isRecording && <div className="text-[10px] text-emerald-600 font-bold">✓ Ready</div>}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  isRecording ? 'bg-red-600 text-white' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                {isRecording ? t.recordingBtn : t.recordBtn}
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md hover:from-rose-700 hover:to-pink-700"
            >
              {t.postBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
