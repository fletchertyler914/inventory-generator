import { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef, memo } from "react"
import {
  X,
  FileText,
  Image as ImageIcon,
  File,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Hash,
  Trash2,
  ExternalLink,
  MoreVertical,
  Copy,
  Pencil,
} from "lucide-react"
import { Button } from "../ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { convertFileSrc } from "@tauri-apps/api/core"
import type { InventoryItem } from "@/types/inventory"
import type { FileStatus } from "@/types/inventory"
import { fileService, type FileChangeStatus } from "@/services/fileService"
import { MetadataPanel } from "../viewer/MetadataPanel"
import { FileChangeWarning } from "../viewer/FileChangeWarning"
import { DuplicateFileDialog } from "../viewer/DuplicateFileDialog"
import { DeleteFileDialog } from "../ui/delete-file-dialog"
import { RenameFileDialog } from "../ui/rename-file-dialog"
import { StatusCell } from "../table/StatusCell"
import { toast } from "@/hooks/useToast"
import { ErrorBoundary } from "../ErrorBoundary"
import { createBlobUrlFromBase64, getMimeTypeFromExtension, revokeBlobUrl } from "@/lib/blob-utils"
import { extractFilename } from "@/lib/file-validation"

// ELITE: Lazy load heavy viewer components for optimal bundle size
const LazyViewer = lazy(() => import("react-viewer").then((m) => ({ default: m.default })))
const LazyPdfViewer = lazy(() =>
  import("../viewer/PdfViewerWrapper").then((m) => ({ default: m.PdfViewerWrapper }))
)
const LazyTiptapMarkdownViewer = lazy(() =>
  import("../viewer/TiptapMarkdownViewer").then((m) => ({ default: m.TiptapMarkdownViewer }))
)
const LazyCsvViewer = lazy(() =>
  import("../viewer/CsvViewer").then((m) => ({ default: m.CsvViewer }))
)

interface IntegratedFileViewerProps {
  file: InventoryItem
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  hasNext: boolean
  hasPrevious: boolean
  caseId?: string
  navigatorOpen?: boolean
  onExpandNavigator?: () => void
  onToggleNavigator?: () => void
  onFileRefresh?: () => void
  onFileRemove?: (file: InventoryItem) => void
  onToggleDuplicates?: () => void
}

// File type categories
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "tiff", "tif"]
const PDF_EXTENSIONS = ["pdf"]
const TEXT_EXTENSIONS = ["txt", "log", "md", "markdown", "readme"]
const CODE_EXTENSIONS = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "html",
  "css",
  "scss",
  "sass",
  "less",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "conf",
  "sh",
  "bash",
  "zsh",
  "py",
  "java",
  "cpp",
  "c",
  "h",
  "hpp",
  "cs",
  "php",
  "rb",
  "go",
  "rs",
  "swift",
  "kt",
  "dart",
  "sql",
  "r",
  "m",
  "pl",
  "lua",
  "vim",
  "ps1",
  "bat",
  "cmd",
]
const OFFICE_EXTENSIONS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"]
const CSV_EXTENSIONS = ["csv"]
const VIDEO_EXTENSIONS = [
  "mp4",
  "webm",
  "ogg",
  "ogv",
  "avi",
  "mov",
  "wmv",
  "flv",
  "mkv",
  "m4v",
  "3gp",
  "asf",
  "rm",
  "rmvb",
  "vob",
  "ts",
  "mts",
  "m2ts",
]
const AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "ogg",
  "oga",
  "aac",
  "flac",
  "m4a",
  "wma",
  "opus",
  "3gp",
  "amr",
  "ra",
  "au",
]
const ARCHIVE_EXTENSIONS = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"]

function getFileType(fileName: string): string {
  if (!fileName || fileName.trim().length === 0) {
    return ""
  }

  // Handle files with multiple dots (e.g., "file.2_Sep 25.pdf" or "file.tar.gz")
  const parts = fileName.split(".")
  if (parts.length > 1) {
    // Get the last part that looks like an extension (1-5 chars, alphanumeric)
    // Start from the end and work backwards
    for (let i = parts.length - 1; i > 0; i--) {
      const candidate = (parts[i]?.toLowerCase() || "").trim()
      // Check if it looks like a file extension (1-5 chars, alphanumeric)
      // Allow longer extensions like "docx", "xlsx", "pptx"
      if (candidate.length >= 1 && candidate.length <= 5 && /^[a-z0-9]+$/.test(candidate)) {
        return candidate
      }
    }
  }
  return ""
}

function getFileCategory(
  fileName: string
):
  | "image"
  | "pdf"
  | "text"
  | "code"
  | "office"
  | "csv"
  | "video"
  | "audio"
  | "archive"
  | "unknown" {
  const ext = getFileType(fileName)

  if (IMAGE_EXTENSIONS.includes(ext)) return "image"
  if (PDF_EXTENSIONS.includes(ext)) return "pdf"
  if (TEXT_EXTENSIONS.includes(ext)) return "text"
  if (CODE_EXTENSIONS.includes(ext)) return "code"
  if (OFFICE_EXTENSIONS.includes(ext)) return "office"
  if (CSV_EXTENSIONS.includes(ext)) return "csv"
  if (VIDEO_EXTENSIONS.includes(ext)) return "video"
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio"
  if (ARCHIVE_EXTENSIONS.includes(ext)) return "archive"

  return "unknown"
}

function getLanguageFromExtension(ext: string): string {
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",
    sh: "bash",
    bash: "bash",
    py: "python",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    go: "go",
    rs: "rust",
    swift: "swift",
    kt: "kotlin",
    sql: "sql",
    r: "r",
    m: "objectivec",
    pl: "perl",
    lua: "lua",
    vim: "vim",
    ps1: "powershell",
  }

  return langMap[ext] || "text"
}

/**
 * IntegratedFileViewer - Non-modal file viewer integrated into workspace
 *
 * ELITE FEATURES:
 * - PDF viewer with full controls (@react-pdf-viewer)
 * - Image viewer with zoom/rotate (react-viewer)
 * - Code viewer with syntax highlighting (react-syntax-highlighter)
 * - Text/Markdown viewer (react-markdown)
 * - Office document viewer (Word, Excel via mammoth/xlsx)
 * - CSV viewer (react-csv-viewer)
 * - Video/Audio players (HTML5 native)
 * - Keyboard navigation (arrow keys, Esc)
 * - Previous/Next file controls
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized to prevent unnecessary re-renders
 * - Lazy-loaded heavy components
 * - Optimized event handlers
 */
export const IntegratedFileViewer = memo(
  function IntegratedFileViewer({
    file,
    onClose,
    onNext,
    onPrevious,
    hasNext,
    hasPrevious,
    caseId,
    navigatorOpen = true,
    onExpandNavigator,
    onToggleNavigator,
    onFileRefresh,
    onFileRemove,
    onToggleDuplicates,
  }: IntegratedFileViewerProps) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [fileCategory, setFileCategory] = useState<
      | "image"
      | "pdf"
      | "text"
      | "code"
      | "office"
      | "csv"
      | "video"
      | "audio"
      | "archive"
      | "unknown"
    >("unknown")
    const [fileContent, setFileContent] = useState<string>("")
    const [imageVisible, setImageVisible] = useState(false)
    const [wordContent, setWordContent] = useState<string>("")
    const [excelData, setExcelData] = useState<Array<Array<string | number | null | undefined>>>([])
    const [csvData, setCsvData] = useState<string>("")
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
    const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null)
    const [shouldLoadContent, setShouldLoadContent] = useState(false) // ELITE: Lazy load content
    const [metadataPanelOpen, setMetadataPanelOpen] = useState(false)
    const metadataJustOpenedRef = useRef(false)
    const metadataOpenTimeRef = useRef<number>(0)
    const menuButtonRef = useRef<HTMLButtonElement>(null)
    const popoverTriggerRef = useRef<HTMLButtonElement>(null)

    // Update popover trigger position when menu button position changes
    useEffect(() => {
      if (metadataPanelOpen && menuButtonRef.current && popoverTriggerRef.current) {
        const updatePosition = () => {
          if (menuButtonRef.current && popoverTriggerRef.current) {
            const rect = menuButtonRef.current.getBoundingClientRect()
            popoverTriggerRef.current.style.position = "fixed"
            popoverTriggerRef.current.style.left = `${rect.left}px`
            popoverTriggerRef.current.style.top = `${rect.top}px`
            popoverTriggerRef.current.style.width = `${rect.width}px`
            popoverTriggerRef.current.style.height = `${rect.height}px`
          }
        }

        updatePosition()
        window.addEventListener("resize", updatePosition)
        window.addEventListener("scroll", updatePosition, true)

        return () => {
          window.removeEventListener("resize", updatePosition)
          window.removeEventListener("scroll", updatePosition, true)
        }
      }
    }, [metadataPanelOpen])
    const [vscDarkPlusStyle, setVscDarkPlusStyle] = useState<any>(null)
    const [syntaxHighlighterModule, setSyntaxHighlighterModule] = useState<any>(null)
    const [fileChanged, setFileChanged] = useState<FileChangeStatus | null>(null)
    const [duplicates, setDuplicates] = useState<
      Array<{
        file_id: string
        file_name: string
        absolute_path: string
        folder_path: string
        status: string
      }>
    >([])
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [renameDialogOpen, setRenameDialogOpen] = useState(false)
    // Local state for optimistic status updates
    const [localStatus, setLocalStatus] = useState<FileStatus | undefined>(file.status)

    // Use file_type from inventory item if available, otherwise extract from file_name
    // ELITE: Robust file type detection with multiple fallbacks
    const fileType = useMemo(() => {
      // Try file_type from database first (might be uppercase)
      if (file.file_type && file.file_type.trim()) {
        const ext = file.file_type.toLowerCase().trim()
        // Remove any leading dots
        const cleanExt = ext.startsWith(".") ? ext.slice(1) : ext
        if (cleanExt.length > 0) {
          return cleanExt
        }
      }
      // Fallback: extract from file_name
      const fromName = getFileType(file.file_name)
      if (fromName) {
        return fromName
      }
      // Last resort: try to extract from absolute_path
      if (file.absolute_path) {
        const pathExt = getFileType(file.absolute_path)
        if (pathExt) {
          return pathExt
        }
      }
      return ""
    }, [file.file_name, file.file_type, file.absolute_path])

    const category = useMemo(() => {
      // First try using file_type from inventory (convert to lowercase)
      if (file.file_type && file.file_type.trim()) {
        const ext = file.file_type.toLowerCase().trim()
        const cleanExt = ext.startsWith(".") ? ext.slice(1) : ext
        if (cleanExt && cleanExt.length > 0) {
          if (IMAGE_EXTENSIONS.includes(cleanExt)) return "image"
          if (PDF_EXTENSIONS.includes(cleanExt)) return "pdf"
          if (TEXT_EXTENSIONS.includes(cleanExt)) return "text"
          if (CODE_EXTENSIONS.includes(cleanExt)) return "code"
          if (OFFICE_EXTENSIONS.includes(cleanExt)) return "office"
          if (CSV_EXTENSIONS.includes(cleanExt)) return "csv"
          if (VIDEO_EXTENSIONS.includes(cleanExt)) return "video"
          if (AUDIO_EXTENSIONS.includes(cleanExt)) return "audio"
          if (ARCHIVE_EXTENSIONS.includes(cleanExt)) return "archive"
        }
      }
      // Fallback to file_name extraction
      const fromName = getFileCategory(file.file_name)
      if (fromName !== "unknown") {
        return fromName
      }
      // Last resort: try absolute_path
      if (file.absolute_path) {
        return getFileCategory(file.absolute_path)
      }
      return "unknown"
    }, [file.file_name, file.file_type, file.absolute_path])

    // PDF viewer is now lazy-loaded via LazyPdfViewer component

    // ELITE: Lazy load syntax highlighter when code is detected
    useEffect(() => {
      if (fileCategory === "code" && !syntaxHighlighterModule) {
        Promise.all([
          import("react-syntax-highlighter"),
          import("react-syntax-highlighter/dist/esm/styles/prism"),
        ]).then(([highlighter, styles]) => {
          setSyntaxHighlighterModule(highlighter)
          setVscDarkPlusStyle(styles.vscDarkPlus)
        })
      }
    }, [fileCategory, syntaxHighlighterModule])

    // ELITE: Lazy loading - only load file content when viewer is actually visible
    useEffect(() => {
      if (!file) {
        setLoading(false)
        return undefined
      }

      // File loaded - type detection complete

      setFileCategory(category)
      setLoading(true)
      setError(null)
      setFileContent("")
      setWordContent("")
      setExcelData([])
      setCsvData("")
      setShouldLoadContent(false) // Reset lazy load flag
      setFileChanged(null) // Reset file change status
      // Reset blob URLs (cleanup will revoke them)
      setPdfBlobUrl(null)
      setImageBlobUrl(null)

      // ELITE: For images and PDFs, load immediately (needed for display)
      // For other types, wait until component is mounted/visible
      if (category === "image" || category === "pdf") {
        setShouldLoadContent(true)
        return undefined
      } else {
        // Small delay to ensure component is mounted before loading heavy content
        const timer = setTimeout(() => setShouldLoadContent(true), 50)
        return () => clearTimeout(timer)
      }
    }, [file, category, fileType])

    // Check file change status on mount and periodically while viewing
    useEffect(() => {
      if (!file?.id) {
        setFileChanged(null)
        return
      }

      const checkFileChange = async () => {
        try {
          const status = await fileService.checkFileChanged(file.id!)
          setFileChanged(status)

          // Check for duplicates if file has hash
          if (caseId && status.file_exists) {
            try {
              const dups = await fileService.findDuplicateFiles(caseId, file.id!)
              setDuplicates(dups)
            } catch (err) {
              // Ignore duplicate check errors (non-critical)
            }
          }
        } catch (error) {
          // File change check failed (non-critical, will retry on next poll)
        }
      }

      // Check immediately
      checkFileChange()

      // Poll every 60 seconds while viewing
      const interval = setInterval(checkFileChange, 60000)

      return () => clearInterval(interval)
    }, [file?.id, caseId])

    // Handle file refresh
    const handleRefresh = useCallback(async () => {
      if (!file?.id) return

      try {
        // Determine if we should auto-transition status
        const autoTransition = file.status === "reviewed" || file.status === "flagged"

        await fileService.refreshSingleFile(file.id, autoTransition)

        toast({
          title: "File refreshed",
          description: "File metadata has been updated.",
          variant: "success",
        })

        // Notify parent to reload file data
        if (onFileRefresh) {
          onFileRefresh()
        }

        // Re-check file change status
        if (file.id) {
          const status = await fileService.checkFileChanged(file.id)
          setFileChanged(status)
        }
      } catch (error) {
        toast({
          title: "Failed to refresh file",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        })
      }
    }, [file?.id, file?.status, onFileRefresh])

    // Handle file removal
    const handleConfirmDelete = useCallback(() => {
      if (onFileRemove) {
        onFileRemove(file)
        onClose() // Close viewer after removal
      }
      setDeleteDialogOpen(false)
    }, [file, onFileRemove, onClose])

    // Handle file rename
    const handleRename = useCallback(
      async (newName: string) => {
        if (!file?.id) return

        try {
          // ELITE: Optimistic UI update - update local state immediately
          const oldFileName = file.file_name
          const oldAbsolutePath = file.absolute_path

          // Call rename service
          const newPath = await fileService.renameFile(file.id, newName)

          // Update local file state optimistically
          const newFileName = extractFilename(newPath)
          const updatedFile = {
            ...file,
            file_name: newFileName,
            absolute_path: newPath,
          }

          toast({
            title: "File renamed",
            description: `"${oldFileName}" renamed to "${newFileName}"`,
            variant: "success",
          })

          // Notify parent to reload file data
          if (onFileRefresh) {
            await onFileRefresh()
          }

          // Reset blob URLs since path changed
          revokeBlobUrl(pdfBlobUrl)
          revokeBlobUrl(imageBlobUrl)
          setPdfBlobUrl(null)
          setImageBlobUrl(null)

          // Re-check file change status
          if (file.id) {
            const status = await fileService.checkFileChanged(file.id)
            setFileChanged(status)
          }
        } catch (error) {
          // Rollback optimistic update on error
          toast({
            title: "Failed to rename file",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          })
          throw error // Re-throw to let dialog handle it
        }
      },
      [file, onFileRefresh, pdfBlobUrl, imageBlobUrl]
    )

    // Sync local status with file prop when it changes
    useEffect(() => {
      setLocalStatus(file.status)
    }, [file.status])

    // Handle status change
    const handleStatusChange = useCallback(
      async (newStatus: FileStatus) => {
        if (!file?.id) return

        // Optimistically update local state
        setLocalStatus(newStatus)

        try {
          await fileService.updateFileStatus(file.id, newStatus)

          toast({
            title: "Status updated",
            description: `File status changed to ${newStatus.replace("_", " ")}`,
            variant: "success",
          })

          // Notify parent to reload file data
          if (onFileRefresh) {
            await onFileRefresh()
          }
        } catch (error) {
          // Revert optimistic update on error
          setLocalStatus(file.status)
          toast({
            title: "Failed to update status",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          })
        }
      },
      [file?.id, file?.status, onFileRefresh]
    )

    // ELITE: Separate effect for loading content (only when shouldLoadContent is true)
    useEffect(() => {
      if (!file || !shouldLoadContent) {
        return undefined
      }

      const loadFile = async () => {
        try {
          // Loading file via Rust

          if (category === "text" || category === "code") {
            // ELITE: Use Rust file I/O - much faster than fetch()
            const text = await fileService.readFileText(file.absolute_path)
            setFileContent(text)
          } else if (category === "office") {
            // ELITE: Load Office documents via Rust, convert base64 to ArrayBuffer
            const base64 = await fileService.readFileBase64(file.absolute_path)
            const binaryString = atob(base64)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i)
            }
            const arrayBuffer = bytes.buffer

            if (fileType === "docx" || fileType === "doc") {
              // ELITE: Lazy load mammoth
              const mammoth = await import("mammoth")
              const result = await mammoth.default.convertToHtml({ arrayBuffer })
              setWordContent(result.value)
              // Word conversion messages are non-critical warnings
            } else if (fileType === "xlsx" || fileType === "xls") {
              // ELITE: Lazy load xlsx-js-style
              const XLSX = await import("xlsx-js-style")
              const workbook = XLSX.read(arrayBuffer, { type: "array" })
              const sheetName = workbook.SheetNames[0]
              if (!sheetName) {
                throw new Error("No sheets found in Excel file")
              }
              const worksheet = workbook.Sheets[sheetName]
              if (!worksheet) {
                throw new Error("Worksheet not found")
              }
              const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<
                Array<string | number | null | undefined>
              >
              setExcelData(data)
            }
          } else if (category === "csv") {
            // ELITE: Use Rust file I/O for CSV
            const text = await fileService.readFileText(file.absolute_path)
            setCsvData(text)
          }
          setLoading(false)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          setError(`Failed to load file: ${errorMessage}`)
          setLoading(false)
        }
      }

      // For video, audio, archive - no need to preload content
      if (category === "video" || category === "audio" || category === "archive") {
        setLoading(false)
      } else if (category === "pdf") {
        // ELITE: Load PDF via Rust, convert base64 to blob using shared utility
        const loadPdf = async () => {
          try {
            const base64 = await fileService.readFileBase64(file.absolute_path)
            const blobUrl = createBlobUrlFromBase64(base64, "application/pdf")
            setPdfBlobUrl(blobUrl)
            setLoading(false)
          } catch (err) {
            console.error("[IntegratedFileViewer] Error loading PDF:", err)
            const errorMessage = err instanceof Error ? err.message : String(err)

            // ELITE: Provide helpful error message for file not found (e.g., after rename)
            if (
              errorMessage.includes("File not found") ||
              errorMessage.includes("File does not exist")
            ) {
              setError(
                `File not found. The file may have been moved or renamed.\n\n` +
                  `Path: ${file.absolute_path}\n\n` +
                  `Please re-sync the case to update file paths, or remove this file from the case.`
              )
            } else {
              setError(`Failed to load PDF: ${errorMessage}`)
            }
            setLoading(false)
          }
        }
        loadPdf()
      } else if (category === "image") {
        // ELITE: Load image via Rust, convert base64 to blob using shared utility
        const loadImage = async () => {
          try {
            const base64 = await fileService.readFileBase64(file.absolute_path)
            const mimeType = getMimeTypeFromExtension(fileType)
            const blobUrl = createBlobUrlFromBase64(base64, mimeType)
            setImageBlobUrl(blobUrl)
            setLoading(false)
          } catch (err) {
            console.error("[IntegratedFileViewer] Error loading image:", err)
            const errorMessage = err instanceof Error ? err.message : String(err)

            // ELITE: Provide helpful error message for file not found (e.g., after rename)
            if (
              errorMessage.includes("File not found") ||
              errorMessage.includes("File does not exist")
            ) {
              setError(
                `File not found. The file may have been moved or renamed.\n\n` +
                  `Path: ${file.absolute_path}\n\n` +
                  `Please re-sync the case to update file paths, or remove this file from the case.`
              )
            } else {
              setError(`Failed to load image: ${errorMessage}`)
            }
            setLoading(false)
          }
        }
        loadImage()
      } else {
        loadFile()
      }

      // Cleanup blob URLs on unmount or file change
      return () => {
        setPdfBlobUrl((prev) => {
          revokeBlobUrl(prev)
          return null
        })
        setImageBlobUrl((prev) => {
          revokeBlobUrl(prev)
          return null
        })
      }
    }, [file, category, shouldLoadContent, fileType])

    const handleOpenInSystem = useCallback(async () => {
      try {
        const { openPath } = await import("@tauri-apps/plugin-opener")
        await openPath(file.absolute_path)
      } catch (err) {
        setError(`Failed to open file: ${err}`)
      }
    }, [file])

    const imageSrc = useMemo(() => {
      if (category === "image" && imageBlobUrl) {
        return imageBlobUrl
      }
      return ""
    }, [category, imageBlobUrl])

    const images = useMemo(() => {
      if (category === "image" && imageSrc) {
        return [{ src: imageSrc, alt: file.file_name }]
      }
      return []
    }, [category, imageSrc, file.file_name])

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose()
        } else if (e.key === "ArrowLeft" && hasPrevious) {
          e.preventDefault()
          onPrevious()
        } else if (e.key === "ArrowRight" && hasNext) {
          e.preventDefault()
          onNext()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [onClose, onNext, onPrevious, hasNext, hasPrevious])

    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading file...</div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-2xl">
            <p className="text-sm text-destructive mb-4 whitespace-pre-line">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleOpenInSystem} variant="outline">
                Open in System
              </Button>
              {onFileRefresh && (
                <Button onClick={handleRefresh} variant="default">
                  Refresh File
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    const renderContent = () => {
      switch (fileCategory) {
        case "image":
          if (!imageBlobUrl) {
            return (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading image...</div>
              </div>
            )
          }
          return (
            <div className="flex items-center justify-center w-full h-full p-4">
              <img
                src={imageSrc}
                alt={file.file_name}
                className="max-w-full max-h-full object-contain cursor-pointer"
                onClick={() => setImageVisible(true)}
              />
              <Suspense
                fallback={<div className="text-sm text-muted-foreground">Loading viewer...</div>}
              >
                <LazyViewer
                  visible={imageVisible}
                  onClose={() => setImageVisible(false)}
                  images={images}
                  activeIndex={0}
                  zIndex={10000}
                />
              </Suspense>
            </div>
          )

        case "pdf":
          if (!pdfBlobUrl) {
            return (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading PDF...</div>
              </div>
            )
          }
          return (
            <div className="w-full h-full">
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">Loading PDF viewer...</div>
                  </div>
                }
              >
                <ErrorBoundary
                  fallback={
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-destructive mb-4">Failed to load PDF viewer</p>
                        <Button onClick={handleOpenInSystem}>Open in System</Button>
                      </div>
                    </div>
                  }
                >
                  <LazyPdfViewer fileUrl={pdfBlobUrl} />
                </ErrorBoundary>
              </Suspense>
            </div>
          )

        case "text":
          return (
            <div className="w-full h-full overflow-auto p-4">
              {fileType === "md" || fileType === "markdown" ? (
                <Suspense
                  fallback={
                    <div className="text-sm text-muted-foreground">Loading markdown viewer...</div>
                  }
                >
                  <LazyTiptapMarkdownViewer content={fileContent} className="w-full h-full" />
                </Suspense>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-lg">
                  {fileContent}
                </pre>
              )}
            </div>
          )

        case "code":
          if (!syntaxHighlighterModule || !vscDarkPlusStyle) {
            return (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-sm text-muted-foreground">Loading syntax highlighter...</div>
              </div>
            )
          }
          const { Prism: SyntaxHighlighter } = syntaxHighlighterModule
          return (
            <div className="w-full h-full overflow-auto">
              <SyntaxHighlighter
                language={getLanguageFromExtension(fileType)}
                style={vscDarkPlusStyle}
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  height: "100%",
                }}
                showLineNumbers
                wrapLines
              >
                {fileContent}
              </SyntaxHighlighter>
            </div>
          )

        case "office":
          if (fileType === "docx" || fileType === "doc") {
            return (
              <div className="w-full h-full overflow-auto p-4">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: wordContent }}
                />
              </div>
            )
          } else if (fileType === "xlsx" || fileType === "xls") {
            // Detect header rows: look for rows that are likely headers vs data
            // Strategy: Find the row with the most non-empty cells that looks like column headers
            // (usually has text in most cells, not numbers)
            const detectHeaderRow = (
              data: Array<Array<string | number | null | undefined>>
            ): number => {
              if (data.length === 0) return -1

              // Look for the first row that has multiple non-empty cells
              // and appears to be column headers (mostly text, not numbers)
              for (let i = 0; i < Math.min(data.length, 10); i++) {
                const row = data[i]
                if (!row || row.length === 0) continue

                const nonEmptyCells = row.filter(
                  (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""
                )

                // If this row has at least 2 non-empty cells, it's likely a header row
                if (nonEmptyCells.length >= 2) {
                  // Check if it looks like headers (mostly text, not numbers)
                  const textCells = nonEmptyCells.filter((cell) => {
                    const str = String(cell).trim()
                    // If it's a number, it's probably not a header
                    if (!isNaN(Number(str)) && str !== "") return false
                    return true
                  })

                  // If at least half are text, this is likely the header row
                  if (textCells.length >= nonEmptyCells.length * 0.5) {
                    return i
                  }
                }
              }

              // Fallback: use first row if it has any content
              if (
                data[0] &&
                data[0].some(
                  (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""
                )
              ) {
                return 0
              }

              return -1
            }

            const headerRowIndex = detectHeaderRow(excelData)
            const hasHeaders = headerRowIndex >= 0

            // Split data into title rows (above headers) and data rows (below headers)
            const titleRows = hasHeaders ? excelData.slice(0, headerRowIndex) : []
            const headers = hasHeaders ? excelData[headerRowIndex] : []
            const dataRows = hasHeaders ? excelData.slice(headerRowIndex + 1) : excelData

            // Find the maximum number of columns across all rows to ensure uniform grid
            const maxColumns = Math.max(
              ...titleRows.map((row) => row.length),
              headers.length,
              ...dataRows.map((row) => row.length),
              1 // At least 1 column
            )

            // Normalize title rows
            const normalizedTitleRows = titleRows.map((row) => {
              const normalized = [...row]
              while (normalized.length < maxColumns) {
                normalized.push(null)
              }
              return normalized.slice(0, maxColumns)
            })

            // Normalize headers
            const normalizedHeaders = hasHeaders
              ? (() => {
                  const normalized = [...headers]
                  while (normalized.length < maxColumns) {
                    normalized.push(null)
                  }
                  return normalized.slice(0, maxColumns)
                })()
              : []

            // Normalize data rows
            const normalizedRows = dataRows.map((row) => {
              const normalized = [...row]
              while (normalized.length < maxColumns) {
                normalized.push(null)
              }
              return normalized.slice(0, maxColumns)
            })

            return (
              <div className="w-full h-full overflow-auto p-4">
                <table
                  className="border-collapse border border-border/40 dark:border-border/50"
                  style={{ tableLayout: "auto", width: "max-content" }}
                >
                  {/* Title rows above headers */}
                  {normalizedTitleRows.length > 0 && (
                    <thead>
                      {normalizedTitleRows.map((titleRow, titleRowIndex) => (
                        <tr key={`title-${titleRowIndex}`} className="bg-muted/30">
                          {titleRow.map((cell, cellIndex) => {
                            // Merge cells if the row has mostly empty cells (likely a title row)
                            const hasContent =
                              cell !== null && cell !== undefined && String(cell).trim() !== ""
                            const isEmpty = !hasContent
                            const isFirstCell = cellIndex === 0
                            const isLastCell = cellIndex === titleRow.length - 1

                            // If this is a title row with content in first cell, span across all columns
                            if (
                              isFirstCell &&
                              hasContent &&
                              titleRow.filter(
                                (c) => c !== null && c !== undefined && String(c).trim() !== ""
                              ).length <= 2
                            ) {
                              return (
                                <th
                                  key={cellIndex}
                                  colSpan={maxColumns}
                                  className="border border-border/40 dark:border-border/50 p-2 text-left text-sm font-semibold bg-muted/30"
                                  style={{ textAlign: "left" }}
                                >
                                  {String(cell)}
                                </th>
                              )
                            }

                            // Regular cell
                            return (
                              <th
                                key={cellIndex}
                                className="border border-border/40 dark:border-border/50 p-2 text-left text-sm font-medium bg-muted/30"
                              >
                                {cell !== null && cell !== undefined ? String(cell) : "\u00A0"}
                              </th>
                            )
                          })}
                        </tr>
                      ))}
                    </thead>
                  )}

                  {/* Column headers */}
                  {hasHeaders && normalizedHeaders.length > 0 && (
                    <thead>
                      <tr className="bg-muted">
                        {normalizedHeaders.map((header, index) => (
                          <th
                            key={index}
                            className="border border-border/40 dark:border-border/50 p-2 text-left text-sm font-semibold sticky top-0 bg-muted z-10 whitespace-nowrap"
                            style={{ minWidth: "150px", maxWidth: "none" }}
                          >
                            {header !== null && header !== undefined
                              ? String(header)
                              : `Column ${index + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}

                  {/* Data rows */}
                  <tbody>
                    {normalizedRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-muted/50">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border border-border/40 dark:border-border/50 p-2 text-sm whitespace-nowrap"
                            style={{ minWidth: "150px", maxWidth: "none", overflow: "visible" }}
                          >
                            <span style={{ display: "inline-block", maxWidth: "none" }}>
                              {cell !== null && cell !== undefined ? String(cell) : "\u00A0"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          return (
            <div className="text-center text-muted-foreground p-8">
              <p className="mb-4">Office document viewer for {fileType} files is coming soon!</p>
              <Button onClick={handleOpenInSystem}>Open</Button>
            </div>
          )

        case "csv":
          return (
            <div className="w-full h-full overflow-auto p-4">
              <Suspense
                fallback={
                  <div className="text-sm text-muted-foreground">Loading CSV viewer...</div>
                }
              >
                <LazyCsvViewer data={csvData} />
              </Suspense>
            </div>
          )

        case "video":
          return (
            <div className="w-full h-full flex items-center justify-center p-4">
              <video
                src={convertFileSrc(file.absolute_path)}
                controls
                className="max-w-full max-h-full"
                style={{ maxHeight: "calc(100vh - 200px)" }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )

        case "audio":
          return (
            <div className="w-full h-full flex items-center justify-center p-4">
              <div className="w-full max-w-2xl">
                <div className="text-center mb-4">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-2" />
                  <p className="text-lg font-semibold">{file.file_name}</p>
                </div>
                <audio src={convertFileSrc(file.absolute_path)} controls className="w-full">
                  Your browser does not support the audio tag.
                </audio>
              </div>
            </div>
          )

        case "archive":
          return (
            <div className="text-center text-muted-foreground p-8">
              <p className="mb-4">Archive viewer for {fileType} files is coming soon!</p>
              <p className="text-sm mb-4">
                For now, click &quot;Open in System&quot; to extract and view archive contents.
              </p>
              <Button onClick={handleOpenInSystem}>Open</Button>
            </div>
          )

        default:
          // For unknown file types, show open option
          // This handles files without extensions or unsupported formats
          return (
            <div className="text-center text-muted-foreground p-8">
              <div className="mb-4">
                <p className="mb-2">File type not recognized or viewer not available.</p>
                {fileType ? (
                  <p className="text-sm">
                    File extension: <code className="bg-muted px-2 py-1 rounded">{fileType}</code>
                  </p>
                ) : (
                  <p className="text-sm">No file extension detected.</p>
                )}
                <p className="text-xs mt-2 text-muted-foreground">
                  Debug: file_type=&quot;{file.file_type}&quot;, file_name=&quot;{file.file_name}
                  &quot;
                </p>
              </div>
              <p className="text-sm mb-4">
                Click below to open this file in your system&apos;s default application.
              </p>
              <Button onClick={handleOpenInSystem} size="lg">
                Open
              </Button>
            </div>
          )
      }
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-background animate-in fade-in-0 duration-200">
        {/* Header */}
        <div className="relative flex items-center gap-2 p-3 border-b border-border/40 dark:border-border/50 bg-card flex-shrink-0 shadow-sm">
          {/* Left Section - Toggle Navigator Button and File Name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {(onToggleNavigator || onExpandNavigator) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={navigatorOpen ? onToggleNavigator : onExpandNavigator}
                className="h-8 w-8 flex-shrink-0"
                title={navigatorOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {navigatorOpen ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {fileCategory === "pdf" && (
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            {fileCategory === "image" && (
              <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            {!["pdf", "image"].includes(fileCategory) && (
              <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <h2 className="text-sm font-semibold truncate min-w-0">{file.file_name}</h2>
          </div>

          {/* Center Section - Status Selector */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
            <StatusCell status={localStatus} onStatusChange={handleStatusChange} />
          </div>

          {/* Right Section - Menu and Close */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto relative">
            {/* Navigation Buttons - Only show when available */}
            {hasPrevious && (
              <Button variant="ghost" size="sm" onClick={onPrevious} title="Previous file (←)">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {hasNext && (
              <Button variant="ghost" size="sm" onClick={onNext} title="Next file (→)">
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {/* Duplicate Button - Only show when file has duplicates */}
            {duplicates.length > 0 && onToggleDuplicates && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleDuplicates}
                title={`View duplicates (${duplicates.length} found)`}
                className="relative"
              >
                <Copy className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
              </Button>
            )}

            {/* Overflow Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button ref={menuButtonRef} variant="ghost" size="sm" title="More options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Image fullscreen */}
                {fileCategory === "image" && (
                  <DropdownMenuItem onClick={() => setImageVisible(true)}>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Fullscreen
                  </DropdownMenuItem>
                )}

                {/* Metadata */}
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    // Toggle metadata panel - if already open, close it; otherwise open it
                    if (metadataPanelOpen) {
                      setMetadataPanelOpen(false)
                      metadataJustOpenedRef.current = false
                    } else {
                      // Mark that we're programmatically opening, then delay to allow dropdown to close
                      metadataJustOpenedRef.current = true
                      metadataOpenTimeRef.current = Date.now()
                      setTimeout(() => {
                        setMetadataPanelOpen(true)
                        // Clear the flag after a longer delay to prevent accidental dismissal
                        setTimeout(() => {
                          metadataJustOpenedRef.current = false
                        }, 500)
                      }, 150)
                    }
                  }}
                >
                  <Hash className="h-4 w-4 mr-2" />
                  {metadataPanelOpen ? "Hide metadata" : "Show metadata"}
                </DropdownMenuItem>

                {/* Open in system */}
                <DropdownMenuItem onClick={handleOpenInSystem}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in system
                </DropdownMenuItem>

                {/* Rename file */}
                <DropdownMenuItem onClick={() => setRenameDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename file
                </DropdownMenuItem>

                {/* Remove file */}
                {onFileRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteDialogOpen(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove file
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close Button */}
            <Button variant="ghost" size="sm" onClick={onClose} title="Close (Esc)">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Metadata Popover - positioned relative to menu button */}
        <Popover
          open={metadataPanelOpen}
          onOpenChange={(open) => {
            // Prevent closing immediately after opening (when dropdown closes)
            if (!open && metadataJustOpenedRef.current) {
              metadataJustOpenedRef.current = false
              return
            }
            setMetadataPanelOpen(open)
          }}
          modal={false}
        >
          <PopoverTrigger asChild>
            <Button
              ref={popoverTriggerRef}
              variant="ghost"
              className="opacity-0 pointer-events-none fixed"
              aria-hidden="true"
            />
          </PopoverTrigger>
          <PopoverContent
            className="w-[28rem] max-h-[80vh] p-0"
            align="end"
            side="bottom"
            sideOffset={8}
            onInteractOutside={(e) => {
              // Prevent dismissal during the initial opening period
              const timeSinceOpen = Date.now() - metadataOpenTimeRef.current
              if (metadataJustOpenedRef.current || timeSinceOpen < 500) {
                e.preventDefault()
                return
              }

              // Check if clicking near the menu button area - prevent dismissal
              const target = e.target as HTMLElement
              if (menuButtonRef.current && target) {
                const menuRect = menuButtonRef.current.getBoundingClientRect()
                const targetRect = target.getBoundingClientRect()
                const targetCenterX = targetRect.left + targetRect.width / 2
                const targetCenterY = targetRect.top + targetRect.height / 2

                // Expand the protected area around the menu button
                const padding = 50
                if (
                  targetCenterX >= menuRect.left - padding &&
                  targetCenterX <= menuRect.right + padding &&
                  targetCenterY >= menuRect.top - padding &&
                  targetCenterY <= menuRect.bottom + padding
                ) {
                  e.preventDefault()
                  return
                }
              }
            }}
            onPointerDownOutside={(e) => {
              // Prevent dismissal during the initial opening period
              const timeSinceOpen = Date.now() - metadataOpenTimeRef.current
              if (metadataJustOpenedRef.current || timeSinceOpen < 500) {
                e.preventDefault()
                return
              }

              // Check if clicking near the menu button area - prevent dismissal
              const target = e.target as HTMLElement
              if (menuButtonRef.current && target) {
                const menuRect = menuButtonRef.current.getBoundingClientRect()
                const targetRect = target.getBoundingClientRect()
                const targetCenterX = targetRect.left + targetRect.width / 2
                const targetCenterY = targetRect.top + targetRect.height / 2

                // Expand the protected area around the menu button
                const padding = 50
                if (
                  targetCenterX >= menuRect.left - padding &&
                  targetCenterX <= menuRect.right + padding &&
                  targetCenterY >= menuRect.top - padding &&
                  targetCenterY <= menuRect.bottom + padding
                ) {
                  e.preventDefault()
                  return
                }
              }
            }}
          >
            <div className="flex flex-col h-full max-h-[80vh]">
              <div className="p-3 border-b border-border/40 dark:border-border/50 flex-shrink-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
                <h3 className="text-sm font-semibold">Metadata</h3>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <MetadataPanel
                  filePath={file.absolute_path}
                  fileType={fileType}
                  item={file}
                  caseId={caseId}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Content with optional metadata panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File Change Warning */}
          {fileChanged && file.id && (
            <>
              <FileChangeWarning
                fileId={file.id}
                {...(file.status ? { fileStatus: file.status } : {})}
                changeStatus={fileChanged}
                onRefresh={handleRefresh}
                onDismiss={() => setFileChanged(null)}
                hasDuplicates={duplicates.length > 0}
                duplicateDialogOpen={duplicateDialogOpen}
                onDuplicateDialogOpenChange={setDuplicateDialogOpen}
              />
              {caseId && (
                <DuplicateFileDialog
                  open={duplicateDialogOpen}
                  onOpenChange={setDuplicateDialogOpen}
                  caseId={caseId}
                  fileId={file.id}
                  fileName={file.file_name}
                  duplicates={duplicates.map((d) => ({
                    file_id: d.file_id,
                    file_name: d.file_name,
                    absolute_path: d.absolute_path,
                    folder_path: d.folder_path,
                    status: d.status,
                  }))}
                  onFileSelect={(_fileId) => {
                    // Navigate to selected duplicate file
                    // This would trigger file navigation in the parent component
                  }}
                  onManageAll={() => {
                    // This would open the DuplicateManagementPanel
                    // Implementation depends on parent component structure
                  }}
                />
              )}
            </>
          )}
          <div className="flex-1 overflow-hidden">{renderContent()}</div>
        </div>
        <DeleteFileDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          fileName={file.file_name}
          onConfirm={handleConfirmDelete}
        />

        <RenameFileDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentPath={file.absolute_path}
          currentFileName={file.file_name}
          fileType={file.file_type}
          onConfirm={handleRename}
          onSyncFirst={
            file?.id
              ? async () => {
                  if (!file.id) return
                  const autoTransition = file.status === "reviewed" || file.status === "flagged"
                  await fileService.refreshSingleFile(file.id, autoTransition)
                  if (onFileRefresh) {
                    await onFileRefresh()
                  }
                }
              : undefined
          }
        />
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom memoization comparison
    return (
      prevProps.file.id === nextProps.file.id &&
      prevProps.file.absolute_path === nextProps.file.absolute_path &&
      prevProps.file.file_name === nextProps.file.file_name &&
      prevProps.file.status === nextProps.file.status &&
      prevProps.hasNext === nextProps.hasNext &&
      prevProps.hasPrevious === nextProps.hasPrevious &&
      prevProps.caseId === nextProps.caseId &&
      prevProps.navigatorOpen === nextProps.navigatorOpen &&
      prevProps.onClose === nextProps.onClose &&
      prevProps.onNext === nextProps.onNext &&
      prevProps.onPrevious === nextProps.onPrevious &&
      prevProps.onExpandNavigator === nextProps.onExpandNavigator &&
      prevProps.onToggleNavigator === nextProps.onToggleNavigator &&
      prevProps.onFileRefresh === nextProps.onFileRefresh &&
      prevProps.onFileRemove === nextProps.onFileRemove
    )
  }
)
