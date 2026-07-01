import { useState, useRef, useEffect } from 'react'

interface UploadFile {
  id: string
  filename: string
  mimetype: string
  size: number
  createdAt: string
}

export default function UploadManager() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_BASE = '/api'

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(API_BASE + '/uploads')
      const json = await res.json()
      setFiles(json.data || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function upload(file: File) {
    setUploading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', API_BASE + '/uploads')

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
          } else {
            reject(new Error(`HTTP ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(formData)
      })

      setProgress(100)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  async function deleteFile(id: string) {
    if (!confirm('确定删除此文件？')) return
    try {
      await fetch(API_BASE + `/uploads/${id}`, { method: 'DELETE' })
      setFiles((prev) => prev.filter((f) => f.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function formatSize(bytes: number) {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024
      i++
    }
    return `${size.toFixed(1)} ${units[i]}`
  }

  function getTypeIcon(mimetype: string) {
    if (mimetype.startsWith('image/')) return '🖼️'
    if (mimetype.startsWith('video/')) return '🎬'
    if (mimetype.startsWith('audio/')) return '🎵'
    if (mimetype.includes('pdf')) return '📄'
    if (mimetype.includes('zip') || mimetype.includes('tar') || mimetype.includes('gz')) return '📦'
    return '📎'
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sage-800)]">文件管理</h1>
          <p className="text-sm text-[var(--sage-500)] mt-1">上传、预览和管理文件</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-[var(--sage-600)] text-white rounded-lg hover:bg-[var(--sage-700)] disabled:opacity-50 text-sm font-medium"
          >
            {uploading ? `上传中 ${progress}%` : '+ 上传文件'}
          </button>
          <button onClick={load} className="text-sm text-[var(--sage-600)] hover:text-[var(--sage-800)]">🔄</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}

      {uploading && progress > 0 && progress < 100 && (
        <div className="mb-4">
          <div className="w-full bg-[var(--sage-200)] rounded-full h-2">
            <div className="bg-[var(--sage-600)] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-[var(--sage-500)] mt-1">{progress}%</div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--sage-500)]">加载中...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-[var(--sage-400)]">暂无文件</div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--sage-200)] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-[var(--sage-50)] border-b border-[var(--sage-200)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">文件</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">类型</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">大小</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--sage-700)]">上传时间</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--sage-700)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b border-[var(--sage-100)] hover:bg-[var(--sage-50)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(f.mimetype)}</span>
                      <span className="font-medium text-[var(--sage-800)] truncate max-w-[200px]">{f.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--sage-600)] text-xs">{f.mimetype}</td>
                  <td className="px-4 py-3 text-[var(--sage-600)]">{formatSize(f.size)}</td>
                  <td className="px-4 py-3 text-[var(--sage-500)] text-xs">{new Date(f.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={`${API_BASE}/uploads/${f.id}/download`} className="text-[var(--sage-600)] hover:text-[var(--sage-800)] text-xs mr-3">下载</a>
                    <button onClick={() => deleteFile(f.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
