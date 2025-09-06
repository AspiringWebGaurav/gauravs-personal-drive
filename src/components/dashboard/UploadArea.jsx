'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, FileIcon, Loader2 } from 'lucide-react'
import { storage, firestore } from '@/lib/firebaseClient'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'

export function UploadArea({ currentFolder, onUploadComplete }) {
  const { user } = useAuth()
  const [uploads, setUploads] = useState([])
  const [isDragActive, setIsDragActive] = useState(false)

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const uploadFile = async (file) => {
    if (!user) return

    const uploadId = Date.now() + Math.random()
    const fileName = file.name
    const storagePath = `${user.uid}/${uploadId}_${fileName}`
    
    // Add upload to state
    setUploads(prev => [...prev, {
      id: uploadId,
      name: fileName,
      size: file.size,
      progress: 0,
      status: 'uploading'
    }])

    try {
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, progress: Math.round(progress) }
              : upload
          ))
        },
        (error) => {
          console.error('Upload error:', error)
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, status: 'error' }
              : upload
          ))
          toast.error(`Failed to upload ${fileName}`)
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            
            // Save file metadata to Firestore
            await addDoc(collection(firestore, 'files'), {
              userId: user.uid,
              filename: fileName,
              size: file.size,
              contentType: file.type,
              storagePath: storagePath,
              downloadURL: downloadURL,
              folderId: currentFolder?.id || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })

            setUploads(prev => prev.map(upload => 
              upload.id === uploadId 
                ? { ...upload, status: 'completed', progress: 100 }
                : upload
            ))

            // Remove completed upload after 2 seconds
            setTimeout(() => {
              setUploads(prev => prev.filter(upload => upload.id !== uploadId))
            }, 2000)

            toast.success(`${fileName} uploaded successfully!`)
          } catch (error) {
            console.error('Error saving file metadata:', error)
            setUploads(prev => prev.map(upload => 
              upload.id === uploadId 
                ? { ...upload, status: 'error' }
                : upload
            ))
            toast.error(`Failed to save ${fileName}`)
          }
        }
      )
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(`Failed to upload ${fileName}`)
    }
  }

  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach(uploadFile)
    setIsDragActive(false)
  }, [currentFolder, user])

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    noClick: true,
    noKeyboard: true,
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const removeUpload = (uploadId) => {
    setUploads(prev => prev.filter(upload => upload.id !== uploadId))
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card 
        {...getRootProps()} 
        className={`upload-area transition-all duration-200 ${
          isDragActive ? 'upload-area-active scale-[1.02]' : ''
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <div className="mb-6">
            <div className={`flex items-center justify-center w-16 h-16 mx-auto rounded-full transition-all duration-200 ${
              isDragActive 
                ? 'bg-primary/20 text-primary scale-110' 
                : 'bg-muted/20 text-muted-foreground'
            }`}>
              <Upload className="w-8 h-8" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select files
            </p>
          </div>

          <Button
            onClick={open}
            className="mt-6 glass-button"
            size="lg"
          >
            <Upload className="w-5 h-5 mr-2" />
            Choose Files
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Maximum file size: 100MB
          </p>

          <input {...getInputProps()} />
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium text-sm">Uploading Files</h4>
            {uploads.map((upload) => (
              <div key={upload.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20">
                <div className="flex-shrink-0">
                  {upload.status === 'uploading' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : upload.status === 'completed' ? (
                    <FileIcon className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(upload.size)}</p>
                  
                  {upload.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={upload.progress} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {upload.progress}%
                      </p>
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUpload(upload.id)}
                  className="flex-shrink-0 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}