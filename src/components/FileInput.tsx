import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import mammoth from 'mammoth'

// Add PDF.js types
declare global {
  interface Window {
    pdfjsLib: any
  }
}

interface FileItem {
  file: File
  id: string
  rawText?: string
  processedText?: string
  wordCount?: number
}

export default function FileInput() {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<FileItem[]>([])
  const [showProcessed, setShowProcessed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize PDF.js
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const processText = (text: string): string => {
    // Split the text into words and filter out empty strings
    const words = text.split(/\s+/).filter(word => word.length > 0)
    
    // Process the text to add line breaks and $$$$$ every 300 words
    return words.reduce((acc, word, index) => {
      // Add the word
      acc += word

      // If it's not the last word, add a space
      if (index < words.length - 1) {
        acc += " "
      }

      // Every 300 words, add a line break and $$$$$
      if ((index + 1) % 300 === 0) {
        acc += "\n$$$$$\n"
      }

      return acc
    }, "")
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        fullText += pageText + '\n'
      }
      
      return fullText
    } catch (error) {
      console.error('Error extracting text from PDF:', error)
      return ''
    }
  }

  const extractTextFromTXT = async (file: File): Promise<string> => {
    try {
      const text = await file.text()
      return text
    } catch (error) {
      console.error('Error extracting text from TXT:', error)
      return ''
    }
  }

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value
    } catch (error) {
      console.error('Error extracting text from DOCX:', error)
      return ''
    }
  }

  const processFiles = async (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.docx') || 
      file.name.endsWith('.pdf')
    )
    
    if (validFiles.length > 0) {
      const processedFiles = await Promise.all(
        validFiles.map(async (file) => {
          const fileItem: FileItem = {
            file,
            id: Math.random().toString(36).substring(7),
          }

          let rawText = ''
          if (file.name.endsWith('.pdf')) {
            rawText = await extractTextFromPDF(file)
          } else if (file.name.endsWith('.txt')) {
            rawText = await extractTextFromTXT(file)
          } else if (file.name.endsWith('.docx')) {
            rawText = await extractTextFromDOCX(file)
          }

          if (rawText) {
            fileItem.rawText = rawText
            fileItem.processedText = processText(rawText)
            fileItem.wordCount = rawText.split(/\s+/).filter(word => word.length > 0).length
          }

          return fileItem
        })
      )
      
      setFiles(prev => [...prev, ...processedFiles])
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
    
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      await processFiles(selectedFiles)
    }
  }

  const handleDelete = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id))
  }

  const onButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showProcessed}
              onChange={(e) => setShowProcessed(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>Show Processed Text</span>
          </label>
        </div>
      </div>

      <div 
        className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed rounded-md relative"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{ 
          backgroundColor: dragActive ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.docx,.pdf"
          onChange={handleChange}
          className="hidden"
          multiple
        />
        <div 
          className="absolute inset-0 w-full h-full cursor-pointer"
          onClick={onButtonClick}
        />
        <p className="text-muted-foreground mb-2 pointer-events-none">
          Drag and drop files here or click to browse
        </p>
        <p className="text-sm text-muted-foreground mb-4 pointer-events-none">
          Accepted formats: .txt, .docx, .pdf
        </p>
        <Button 
          variant="outline" 
          type="button"
          onClick={onButtonClick}
          className="pointer-events-auto relative z-10"
        >
          Browse Files
        </Button>
      </div>

      {files.length > 0 && (
        <div className="border rounded-md p-4">
          <h3 className="text-sm font-medium mb-3">Selected Files:</h3>
          <div className="space-y-2">
            {files.map(({ file, id, rawText, processedText, wordCount }) => (
              <div 
                key={id} 
                className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
              >
                <div className="flex flex-col">
                  <span className="text-sm truncate">{file.name}</span>
                  {file.name.endsWith('.pdf') && (
                    <span className="text-xs text-muted-foreground">
                      {rawText ? `Text extracted - ${wordCount?.toLocaleString() || 0} words` : 'Processing...'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {rawText && (
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
                            {showProcessed ? 'Processed Text' : 'Raw Text'} - {file.name} ({wordCount?.toLocaleString() || 0} words)
                          </DialogTitle>
                        </DialogHeader>
                        <div className="overflow-y-auto max-h-[calc(80vh-100px)]">
                          <pre className="whitespace-pre-wrap text-sm p-4 bg-muted/30 rounded-md">
                            {showProcessed ? processedText : rawText}
                          </pre>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(id)}
                    className="h-8 w-8"
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

