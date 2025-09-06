'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
import { useNotification, useCompletionNotification } from '@/components/providers/NotificationProvider'
import { logger } from '@/lib/logger'

export function UploadArea({ currentFolder, onUploadComplete, onRegisterTrigger }) {
  const { user } = useAuth()
  const { showSuccess, showInfo } = useNotification()
  const { logUploadCompletion } = useCompletionNotification()
  const [uploads, setUploads] = useState([])
  const [isDragActive, setIsDragActive] = useState(false)
  const openRef = useRef(null)

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const uploadFile = useCallback(async (file) => {
    logger.upload('Starting upload for file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    })
    
    if (!user) {
      logger.error('No user authenticated')
      toast.error('Please sign in to upload files')
      return
    }

    logger.upload('User info:', {
      uid: user.uid,
      email: user.email,
      accessToken: !!user.accessToken
    })

    // Check if user token is still valid
    try {
      const token = await user.getIdToken()
      logger.upload('Got valid token:', !!token)
    } catch (error) {
      logger.error('Token validation failed:', error)
      toast.error('Authentication expired. Please refresh the page.')
      return
    }

    const uploadId = Date.now() + Math.random()
    const fileName = file.name
    const storagePath = `${user.uid}/${uploadId}_${fileName}`
    
    logger.upload('Upload configuration:', {
      uploadId,
      fileName,
      storagePath,
      currentFolder: currentFolder?.id || 'root'
    })
    
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
      logger.upload('Created storage reference:', storagePath)
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          logger.upload(`Progress for ${fileName}: ${Math.round(progress)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`)
          
          setUploads(prev => prev.map(upload =>
            upload.id === uploadId
              ? { ...upload, progress: Math.round(progress) }
              : upload
          ))
        },
        (error) => {
          logger.error('Storage upload error:', {
            code: error.code,
            message: error.message,
            fileName: fileName,
            storagePath: storagePath,
            error: error
          })
          
          setUploads(prev => prev.map(upload =>
            upload.id === uploadId
              ? { ...upload, status: 'error' }
              : upload
          ))
          toast.error(`Failed to upload ${fileName}: ${error.message}`)
        },
        async () => {
          logUploadCompletion(fileName, false) // Don't show dialog for individual files during batch
          
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            logger.upload('Got download URL:', downloadURL.substring(0, 50) + '...')
            
            const metadata = {
              userId: user.uid,
              filename: fileName,
              size: file.size,
              contentType: file.type,
              storagePath: storagePath,
              downloadURL: downloadURL,
              folderId: currentFolder?.id || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }
            
            logger.upload('Saving metadata to Firestore:', metadata)
            
            // Save file metadata to Firestore
            const docRef = await addDoc(collection(firestore, 'files'), metadata)
            logger.upload('Metadata saved with ID:', docRef.id)

            setUploads(prev => prev.map(upload =>
              upload.id === uploadId
                ? { ...upload, status: 'completed', progress: 100 }
                : upload
            ))

            // Remove completed upload after 2 seconds
            setTimeout(() => {
              setUploads(prev => prev.filter(upload => upload.id !== uploadId))
            }, 2000)

            // Show individual file completion for single uploads
            if (uploads.length <= 1) {
              showSuccess(
                'Upload Complete',
                `${fileName} has been uploaded successfully`,
                { autoCloseDuration: 3000 }
              )
            }
            toast.success(`${fileName} uploaded successfully!`)
            
            // Call onUploadComplete callback if provided
            if (onUploadComplete) {
              logger.upload('Calling onUploadComplete callback')
              onUploadComplete()
            }
          } catch (error) {
            logger.error('Firestore metadata save error:', {
              code: error.code,
              message: error.message,
              fileName: fileName,
              error: error,
              userUid: user.uid,
              currentFolder: currentFolder?.id
            })
            
            setUploads(prev => prev.map(upload =>
              upload.id === uploadId
                ? { ...upload, status: 'error' }
                : upload
            ))
            toast.error(`Failed to save ${fileName}: ${error.message}`)
          }
        }
      )
    } catch (error) {
      logger.error('General upload error:', {
        code: error.code,
        message: error.message,
        fileName: fileName,
        storagePath: storagePath,
        error: error
      })
      
      setUploads(prev => prev.map(upload =>
        upload.id === uploadId
          ? { ...upload, status: 'error' }
          : upload
      ))
      toast.error(`Failed to upload ${fileName}: ${error.message}`)
    }
  }, [user, currentFolder, onUploadComplete])

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles?.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        const errorMessages = errors.map(e => {
          if (e.code === 'file-too-large') return `${file.name} is too large (max 100MB)`
          if (e.code === 'file-invalid-type') return `${file.name} has an unsupported file type`
          return `${file.name}: ${e.message}`
        })
        errorMessages.forEach(msg => toast.error(msg))
      })
    }

    // Handle accepted files
    if (acceptedFiles?.length > 0) {
      acceptedFiles.forEach(uploadFile)
      // Show batch upload start notification
      if (acceptedFiles.length > 1) {
        showInfo(
          'Upload Started',
          `Uploading ${acceptedFiles.length} files...`,
          { autoCloseDuration: 2000 }
        )
      }
      toast.success(`Starting upload of ${acceptedFiles.length} file${acceptedFiles.length > 1 ? 's' : ''}`)
    }

    setIsDragActive(false)
  }, [uploadFile])

  const onDragEnter = useCallback(() => {
    setIsDragActive(true)
  }, [])

  const onDragLeave = useCallback((e) => {
    // Only set drag inactive if leaving the dropzone completely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragActive(false)
    }
  }, [])

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    onDragEnter,
    onDragLeave,
    onDragOver,
    noClick: true,
    noKeyboard: true,
    maxSize: 100 * 1024 * 1024, // 100MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
      'video/*': ['.mp4', '.webm', '.ogg', '.avi', '.mov'],
      'audio/*': ['.mp3', '.wav', '.ogg', '.aac'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.json', '.xml', '.csv'],
      'application/*': ['.zip', '.rar', '.7z', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']
    },
    multiple: true
  })

  // Store the open function in a ref
  useEffect(() => {
    openRef.current = open
  }, [open])

  // Register the file picker trigger with parent component (only once)
  useEffect(() => {
    if (onRegisterTrigger) {
      logger.debug('UploadArea useEffect - Registering upload trigger function')
      
      const triggerUpload = () => {
        logger.debug('triggerUpload called - openRef.current available:', !!openRef.current)
        if (openRef.current) {
          logger.debug('About to call openRef.current()')
          try {
            openRef.current()
            logger.debug('openRef.current() called successfully')
          } catch (error) {
            logger.error('Error calling openRef.current():', error)
          }
        }
      }
      
      logger.debug('About to call onRegisterTrigger - no state update, just ref assignment')
      try {
        onRegisterTrigger(triggerUpload)
        logger.debug('onRegisterTrigger called successfully')
      } catch (error) {
        logger.error('Error in onRegisterTrigger:', error)
      }
    }
  }, [onRegisterTrigger])

  const removeUpload = (uploadId) => {
    setUploads(prev => prev.filter(upload => upload.id !== uploadId))
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        {...getRootProps()}
        className={`upload-area relative overflow-hidden transition-all duration-300 ${
          isDragActive
            ? 'upload-area-active scale-[1.02] shadow-2xl border-primary/60'
            : 'hover:scale-[1.01] hover:shadow-lg'
        } ${uploads.length > 0 ? 'mb-2' : ''}`}
        style={{
          background: isDragActive
            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)'
            : undefined
        }}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          {/* Animated background pattern when dragging */}
          {isDragActive && (
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)] animate-ping" />
            </div>
          )}
          
          <div className="relative z-10 mb-6">
            <div className={`flex items-center justify-center w-16 h-16 mx-auto rounded-full transition-all duration-300 ${
              isDragActive
                ? 'bg-primary/30 text-primary scale-125 shadow-lg'
                : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'
            }`}>
              <Upload className={`transition-all duration-300 ${
                isDragActive ? 'w-10 h-10 animate-bounce' : 'w-8 h-8'
              }`} />
            </div>
          </div>
          
          <div className="relative z-10 text-center space-y-2">
            <p className={`text-lg font-medium transition-all duration-200 ${
              isDragActive ? 'text-primary scale-105' : ''
            }`}>
              {isDragActive ? 'Drop files here to upload' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isDragActive ? 'Release to start uploading' : 'or click the button below to browse files'}
            </p>
          </div>

          <Button
            onClick={open}
            className={`mt-6 glass-button transition-all duration-200 ${
              isDragActive ? 'scale-105 bg-primary/20' : 'hover:scale-105'
            }`}
            size="lg"
            disabled={uploads.some(upload => upload.status === 'uploading')}
          >
            <Upload className="w-5 h-5 mr-2" />
            {uploads.some(upload => upload.status === 'uploading') ? 'Uploading...' : 'Choose Files'}
          </Button>

          <div className="relative z-10 text-center mt-4 space-y-1">
            <p className="text-xs text-muted-foreground">
              Maximum file size: 100MB per file
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: Images, Videos, Audio, Documents, Archives
            </p>
          </div>

          <input {...getInputProps()} />
        </CardContent>
        
        {/* Loading indicator overlay */}
        {uploads.some(upload => upload.status === 'uploading') && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Processing uploads...</p>
            </div>
          </div>
        )}
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