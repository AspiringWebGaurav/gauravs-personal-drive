'use client'
import React, { useState } from 'react'
import { UsageBar } from '@/components/dashboard/UsageBar'
import { guardUpload, logQuotaActivity, getCurrentQuota } from '@/lib/quotaGuard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * Test component to demonstrate quota system functionality
 * This shows how to integrate all quota system features
 */
export function QuotaSystemTest() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testGetCurrentQuota = async () => {
    try {
      const quota = await getCurrentQuota()
      if (quota) {
        addResult(`✅ Current quota: ${Math.round(quota.usedBytes / (1024 * 1024))}MB / ${Math.round(quota.limitBytes / (1024 * 1024))}MB`)
        addResult(`📊 Physical: ${Math.round(quota.usedPhysicalBytes / (1024 * 1024))}MB, Deleted: ${Math.round(quota.deletedBytesAccrued / (1024 * 1024))}MB`)
        addResult(`🗓️ Resets: ${new Date(quota.resetAt).toLocaleString()}`)
      } else {
        addResult('❌ Failed to get quota information')
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    }
  }

  const testUploadQuotaCheck = async () => {
    if (!selectedFile) {
      addResult('⚠️ Please select a file first')
      return
    }

    try {
      const guard = await guardUpload(selectedFile)
      if (guard.allowed) {
        addResult(`✅ Upload allowed for ${selectedFile.name} (${Math.round(selectedFile.size / 1024)}KB)`)
      } else {
        addResult(`❌ Upload blocked: ${guard.message}`)
      }
    } catch (error) {
      addResult(`❌ Error checking quota: ${error}`)
    }
  }

  const testLogUploadActivity = async () => {
    if (!selectedFile) {
      addResult('⚠️ Please select a file first')
      return
    }

    try {
      await logQuotaActivity('upload', selectedFile.size, 'test-user')
      addResult(`✅ Logged upload activity: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)}KB)`)
    } catch (error) {
      addResult(`❌ Error logging activity: ${error}`)
    }
  }

  const testLogDeleteActivity = async () => {
    const testSize = 1024 * 1024 // 1MB
    try {
      await logQuotaActivity('delete', testSize, 'test-user')
      addResult(`✅ Logged delete activity: 1MB (Note: deletion still counts toward quota until monthly reset)`)
    } catch (error) {
      addResult(`❌ Error logging delete: ${error}`)
    }
  }

  const testQuotaAPI = async () => {
    try {
      const response = await fetch('/api/quota?projectId=default')
      if (response.ok) {
        const data = await response.json()
        addResult(`✅ API Response: Month ${data.monthKey}, Used: ${Math.round(data.usedBytes / (1024 * 1024))}MB`)
      } else {
        addResult(`❌ API Error: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      addResult(`❌ API Request failed: ${error}`)
    }
  }

  const simulateQuotaExceeded = async () => {
    try {
      // Log a huge fake upload to trigger quota warning
      await logQuotaActivity('upload', 4 * 1024 * 1024 * 1024, 'test-user') // 4GB
      addResult(`⚠️ Simulated 4GB upload - check UsageBar for warning`)
    } catch (error) {
      addResult(`❌ Error simulating quota exceeded: ${error}`)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Quota System Test Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Live Usage Bar */}
          <div>
            <h3 className="text-lg font-medium mb-2">Live Usage Monitoring</h3>
            <UsageBar projectId="default" pollMs={5000} />
          </div>

          {/* File Selection */}
          <div>
            <h3 className="text-lg font-medium mb-2">File Selection</h3>
            <Input
              type="file"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedFile(e.target.files?.[0] || null)}
              className="mb-2"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
              </p>
            )}
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button className="" size="default" onClick={testGetCurrentQuota} variant="outline">
              Get Current Quota
            </Button>
            <Button className="" size="default" onClick={testUploadQuotaCheck} variant="outline">
              Test Upload Guard
            </Button>
            <Button className="" size="default" onClick={testLogUploadActivity} variant="outline">
              Log Upload Activity
            </Button>
            <Button className="" size="default" onClick={testLogDeleteActivity} variant="outline">
              Log Delete Activity
            </Button>
            <Button className="" size="default" onClick={testQuotaAPI} variant="outline">
              Test Quota API
            </Button>
            <Button className="" size="default" onClick={simulateQuotaExceeded} variant="destructive">
              Simulate Quota Exceeded
            </Button>
          </div>

          <div className="flex gap-2">
            <Button className="" size="default" onClick={clearResults} variant="secondary">
              Clear Results
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Test Results</h3>
              <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Examples */}
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Integration Code Examples</CardTitle>
        </CardHeader>
        <CardContent className="">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Basic Upload with Quota Check</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                {`import { guardUpload, logQuotaActivity } from '@/lib/quotaGuard'

const handleUpload = async (file: File) => {
  const guard = await guardUpload(file)
  if (!guard.allowed) {
    toast.error(guard.message) // Use toast instead of alert
    return
  }
  
  // Proceed with upload
  const result = await uploadToFirebase(file)
  await logQuotaActivity('upload', file.size, userId)
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Enhanced UsageBar Component</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                {`import { UsageBar } from '@/components/dashboard/UsageBar'

// In your dashboard component:
<UsageBar projectId="default" pollMs={10000} />`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. Delete with Quota Tracking</h4>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                {`const handleDelete = async (fileId: string, fileSize: number) => {
  await fetch('/api/files', {
    method: 'DELETE',
    body: JSON.stringify({ fileId, fileSize, userId })
  })
  
  // Server automatically logs deletion activity
  console.log('File deleted - quota updated')
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}