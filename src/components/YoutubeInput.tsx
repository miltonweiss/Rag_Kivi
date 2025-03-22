import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Eye, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface YoutubeItem {
  url: string
  id: string
  transcript?: string
}

async function getPlainTranscript(videoId: string, lang = 'en') {
  console.log('Fetching transcript for video ID:', videoId);
  const response = await fetch(`https://video.google.com/timedtext?lang=${lang}&v=${videoId}`);

  if (!response.ok) {
    throw new Error('Transcript not available or video ID is incorrect.');
  }

  const xml = await response.text();
  console.log('Raw XML response:', xml);
  
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'text/xml');
  const texts = xmlDoc.getElementsByTagName('text');

  const fullText = Array.from(texts)
    .map(node => node.textContent?.replace(/&#39;/g, `'`).replace(/&quot;/g, `"`) || "")
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log('Processed transcript:', fullText);
  return fullText;
}

function extractVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export default function YoutubeInput() {
  const [urls, setUrls] = useState<YoutubeItem[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<YoutubeItem | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      const videoId = extractVideoId(inputValue.trim())
      if (!videoId) {
        toast.error("Invalid YouTube URL")
        return
      }
      
      const newItem: YoutubeItem = {
        url: inputValue.trim(),
        id: Math.random().toString(36).substring(7),
      }
      setUrls(prev => [...prev, newItem])
      setInputValue("")
      
      // Automatically fetch transcript for the newly added URL
      await handleGetTranscript(newItem)
    }
  }

  const handleDelete = (id: string) => {
    setUrls(prev => prev.filter(url => url.id !== id))
  }

  const handleGetTranscript = async (item: YoutubeItem) => {
    if (item.transcript) {
      console.log('Using cached transcript:', item.transcript);
      setSelectedItem(item)
      setDialogOpen(true)
      return
    }

    try {
      setIsLoading(item.id)
      const videoId = extractVideoId(item.url)
      if (!videoId) {
        throw new Error("Invalid YouTube URL")
      }
      
      const transcript = await getPlainTranscript(videoId)
      console.log('Fetched new transcript:', transcript);
      
      if (!transcript) {
        throw new Error("No transcript available")
      }

      const updatedItem = { ...item, transcript }
      setUrls(prev => prev.map(url => 
        url.id === item.id ? updatedItem : url
      ))
      setSelectedItem(updatedItem)
      setDialogOpen(true)
      toast.success("Transcript fetched successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch transcript")
      setDialogOpen(false)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter YouTube URL"
          className="flex-1"
        />
        <Button type="submit">Add URL</Button>
      </form>

      {urls.length > 0 && (
        <div className="border rounded-md p-4">
          <h3 className="text-sm font-medium mb-3">Added URLs:</h3>
          <div className="space-y-2">
            {urls.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
              >
                <span className="text-sm truncate">{item.url}</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleGetTranscript(item)}
                    disabled={isLoading === item.id}
                  >
                    {isLoading === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
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

      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setSelectedItem(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Video Transcript</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(80vh-100px)]">
            {selectedItem?.transcript ? (
              <pre className="whitespace-pre-wrap text-sm p-4 bg-muted/30 rounded-md">
                {selectedItem.transcript}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-20 gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading transcript...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

