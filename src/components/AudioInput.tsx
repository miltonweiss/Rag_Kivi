import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, Mic, Loader2, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { transcribeAudio } from "@/lib/assemblyai"

interface AudioItem {
  file: File
  id: string
  duration?: number
  status: 'pending' | 'uploading' | 'uploaded' | 'transcribing' | 'transcribed' | 'error'
  downloadUrl?: string
  transcription?: string
  storageRef?: string
}

export default function AudioInput() {
  const [dragActive, setDragActive] = useState(false)
  const [audioFiles, setAudioFiles] = useState<AudioItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = async (newFiles: File[]) => {
    try {
      setIsProcessing(true)
      const validFiles = newFiles.filter(file => 
        file.type.startsWith('audio/') || 
        file.name.endsWith('.mp3') || 
        file.name.endsWith('.wav') ||
        file.name.endsWith('.m4a')
      )
      
      if (validFiles.length === 0) {
        toast.error("Please upload valid audio files (.mp3, .wav, .m4a)")
        return
      }

      if (validFiles.length !== newFiles.length) {
        toast.warning("Some files were skipped because they are not valid audio files")
      }
      
      const processedFiles = validFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substring(7),
        status: 'pending' as const,
      }))
      
      setAudioFiles(prev => [...prev, ...processedFiles])
      toast.success(`Successfully added ${validFiles.length} audio file${validFiles.length > 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error processing files:', error)
      toast.error("Error processing files. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const uploadToFirebase = async (file: File, id: string) => {
    try {
      // Update status to uploading
      setAudioFiles(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status: 'uploading' as const } : item
        )
      )

      // Create a reference to the file in Firebase Storage
      const storagePath = `${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_AUDIO_PATH}/${file.name}`
      const storageRef = ref(storage, storagePath)
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file)
      
      // Get the download URL
      const downloadUrl = await getDownloadURL(snapshot.ref)

      // Verify the URL is accessible
      const urlCheck = await fetch(downloadUrl);
      if (!urlCheck.ok) {
        throw new Error('Uploaded file is not publicly accessible');
      }

      // Update the file status and save the download URL and storage reference
      setAudioFiles(prev => 
        prev.map(item => 
          item.id === id 
            ? { 
                ...item, 
                status: 'uploaded' as const, 
                downloadUrl,
                storageRef: storagePath
              } 
            : item
        )
      )

      toast.success(`Successfully uploaded ${file.name} to Firebase`)
      return downloadUrl
    } catch (error) {
      console.error('Error uploading to Firebase:', error)
      setAudioFiles(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status: 'error' as const } : item
        )
      )
      toast.error(`Failed to upload ${file.name}`)
      throw error
    }
  }

  const deleteFromFirebase = async (storageRef: string, fileName: string) => {
    try {
      const fileRef = ref(storage, storageRef)
      await deleteObject(fileRef)
      console.log(`Deleted ${fileName} from Firebase Storage`)
    } catch (error) {
      console.error('Error deleting file from Firebase:', error)
      toast.error(`Note: Could not delete temporary file from storage: ${fileName}`)
    }
  }

  const handleTranscribe = async (file: File, id: string, e?: React.MouseEvent) => {
    try {
      // Prevent the dialog from opening/closing when clicking the button
      e?.preventDefault();
      e?.stopPropagation();

      // First upload to Firebase if not already uploaded
      let downloadUrl = audioFiles.find(f => f.id === id)?.downloadUrl
      let storageRef = audioFiles.find(f => f.id === id)?.storageRef
      
      if (!downloadUrl) {
        downloadUrl = await uploadToFirebase(file, id)
        storageRef = audioFiles.find(f => f.id === id)?.storageRef
      }

      // Verify the download URL is valid
      if (!downloadUrl) {
        throw new Error('Failed to get download URL from Firebase')
      }

      console.log('Firebase download URL:', downloadUrl)

      // Test if the URL is accessible
      try {
        const urlTest = await fetch(downloadUrl)
        if (!urlTest.ok) {
          throw new Error(`Firebase URL not accessible: ${urlTest.statusText}`)
        }
        console.log('Firebase URL is accessible')
      } catch (error) {
        console.error('Error accessing Firebase URL:', error)
        throw new Error(`Cannot access Firebase URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // Update status to transcribing
      setAudioFiles(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status: 'transcribing' as const } : item
        )
      )

      console.log('Starting transcription with URL:', downloadUrl);

      // Start transcription
      try {
        const transcriptionResult = await transcribeAudio(downloadUrl)
        console.log('Transcription result:', transcriptionResult)

        // Update the file with transcription result
        setAudioFiles(prev => 
          prev.map(item => 
            item.id === id 
              ? { 
                  ...item, 
                  status: 'transcribed' as const,
                  transcription: transcriptionResult.text 
                } 
              : item
          )
        )

        // Delete the file from Firebase after successful transcription
        if (storageRef) {
          await deleteFromFirebase(storageRef, file.name)
        }

        toast.success(`Successfully transcribed ${file.name}`)
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError)
        throw new Error(`Transcription failed: ${transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error in transcription process:', error)
      setAudioFiles(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status: 'error' as const } : item
        )
      )
      toast.error(`Failed to transcribe ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    await processFiles(droppedFiles)
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      await processFiles(selectedFiles)
      // Reset the input value so the same file can be uploaded again if needed
      e.target.value = ''
    }
  }

  const handleDelete = (id: string) => {
    setAudioFiles(prev => prev.filter(file => file.id !== id))
    toast.success("File removed")
  }

  const onButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }

  return (
    <div className="space-y-4">
      <div 
        className={`
          flex flex-col items-center justify-center h-[300px] 
          border-2 border-dashed rounded-md relative
          transition-colors duration-200
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a"
          onChange={handleChange}
          className="hidden"
          multiple
          disabled={isProcessing}
        />
        <div 
          className="absolute inset-0 w-full h-full"
          onClick={onButtonClick}
        />
        <p className="text-muted-foreground mb-2 pointer-events-none">
          {isProcessing ? 'Processing...' : 'Drag and drop audio files here or click to browse'}
        </p>
        <p className="text-sm text-muted-foreground mb-4 pointer-events-none">
          Accepted formats: .mp3, .wav, .m4a
        </p>
        <Button 
          variant="outline" 
          type="button"
          onClick={onButtonClick}
          className="pointer-events-auto relative z-10"
          disabled={isProcessing}
        >
          Browse Audio Files
        </Button>
      </div>

      {audioFiles.length > 0 && (
        <div className="border rounded-md p-4">
          <h3 className="text-sm font-medium mb-3">Selected Audio Files:</h3>
          <div className="space-y-2">
            {audioFiles.map(({ file, id, status, transcription }) => (
              <div 
                key={id} 
                className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
              >
                <div className="flex flex-col">
                  <span className="text-sm truncate">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    {status === 'uploading' && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Uploading...
                      </span>
                    )}
                    {status === 'transcribing' && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Transcribing...
                      </span>
                    )}
                    {status === 'uploaded' && (
                      <span className="text-xs text-green-500">
                        Ready for transcription
                      </span>
                    )}
                    {status === 'transcribed' && (
                      <span className="text-xs text-green-500">
                        Transcription complete
                      </span>
                    )}
                    {status === 'error' && (
                      <span className="text-xs text-red-500">
                        Error occurred
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleTranscribe(file, id, e)}
                        disabled={status === 'uploading' || status === 'transcribing'}
                      >
                        {(status === 'uploading' || status === 'transcribing') ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>
                          Transcribe Audio - {file.name}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-4 p-4">
                        <p className="text-muted-foreground">
                          {status === 'uploading' && 'Uploading to Firebase...'}
                          {status === 'transcribing' && 'Transcribing audio...'}
                          {status === 'uploaded' && 'Ready for transcription'}
                          {status === 'transcribed' && 'Transcription complete'}
                          {status === 'error' && 'Error occurred. Please try again.'}
                          {status === 'pending' && 'Preparing to upload...'}
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {status === 'transcribed' && transcription && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>
                            Transcription - {file.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 p-4">
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">Transcription Text:</h4>
                            <div className="max-h-[60vh] overflow-y-auto">
                              <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
                                {transcription}
                              </p>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(id)}
                    className="h-8 w-8"
                    disabled={status === 'uploading' || status === 'transcribing'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

