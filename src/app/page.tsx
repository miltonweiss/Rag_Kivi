"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import TextInput from "@/components/TextInput"
import FileInput from "@/components/FileInput"
import AudioInput from "@/components/AudioInput"

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">KIVI RAG</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Main Content Area (3/4 width on medium screens and above) */}
        <div className="md:col-span-3 space-y-4">
          {/* Tabs Container */}
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid grid-cols-5 mb-2">
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="youtube">YouTube Links</TabsTrigger>
              <TabsTrigger value="website">Website Links</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
            </TabsList>

            {/* Text Tab */}
            <TabsContent value="text" className="border rounded-md p-4 min-h-[600px]">
              <TextInput />
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="border rounded-md p-4 min-h-[600px]">
              <FileInput />
            </TabsContent>

            {/* YouTube Links Tab */}
            <TabsContent value="youtube" className="border rounded-md p-4 min-h-[600px]">
              <textarea
                className="w-full h-[600px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter YouTube links (one per line)..."
              />
            </TabsContent>

            {/* Website Links Tab */}
            <TabsContent value="website" className="border rounded-md p-4 min-h-[600px]">
              <textarea
                className="w-full h-[600px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter website URLs (one per line)..."
              />
            </TabsContent>

            {/* Audio Tab */}
            <TabsContent value="audio" className="border rounded-md p-4 min-h-[600px]">
              <AudioInput />
            </TabsContent>
          </Tabs>

          {/* Controls below the tabs */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <Input type="text" placeholder="Name" className="w-full" disabled aria-label="Display Name" />
            </div>
            <Button className="w-full sm:w-auto">Process</Button>
            <Button className="w-full sm:w-auto">Add to Queue</Button>
          </div>
        </div>

        {/* Queue (1/4 width on medium screens and above) */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[650px] pr-4">
                <div className="space-y-2">
                  {/* Queue items will appear here */}
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    No items in queue
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 