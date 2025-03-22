import { useState, useEffect } from "react"

export default function TextInput() {
  const [rawText, setRawText] = useState("")
  const [processedText, setProcessedText] = useState("")
  const [showProcessed, setShowProcessed] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newRawText = e.target.value
    setRawText(newRawText)
    processText(newRawText)
  }

  const processText = (text: string) => {
    // Split the text into words and filter out empty strings
    const words = text.split(/\s+/).filter(word => word.length > 0)
    
    // Update word count
    setWordCount(words.length)
    
    // Process the text to add line breaks and $$$$$ every 300 words
    const processedWords = words.reduce((acc, word, index) => {
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

    setProcessedText(processedWords)
  }

  return (
    <div className="w-full h-full space-y-2">
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
        <div className="text-sm text-gray-600">
          Words: {wordCount}
        </div>
      </div>
      <textarea
        value={showProcessed ? processedText : rawText}
        onChange={handleTextChange}
        readOnly={showProcessed}
        className="w-full h-[600px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Enter your text here..."
      />
    </div>
  )
}

