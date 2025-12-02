import { useState, useEffect } from 'react';
import { Copy, Check, FileText, Hash, Image as ImageIcon, Mail, Music, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { metadataService } from '@/services/metadataService';
import type { FileMetadataExtracted } from '@/types/metadata';
import { format } from 'date-fns';

interface MetadataPanelProps {
  filePath: string;
  fileType?: string;
}

export function MetadataPanel({ filePath }: MetadataPanelProps) {
  const [metadata, setMetadata] = useState<FileMetadataExtracted | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoading(true);
        const extracted = await metadataService.extractMetadata(filePath);
        setMetadata(extracted);
      } catch (error) {
        console.error('Failed to extract metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    if (filePath) {
      loadMetadata();
    }
  }, [filePath]);

  const copyToClipboard = async (text: string, hashType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHash(hashType);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No metadata available
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Basic File Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            File Information
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{formatBytes(metadata.file_size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="outline" className="text-[10px]">
                {metadata.file_type.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(metadata.created_at * 1000), 'MMM d, yyyy h:mm a')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modified:</span>
              <span>{format(new Date(metadata.modified_at * 1000), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Hashes */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Hash className="h-4 w-4" />
            File Hashes
          </h3>
          <div className="space-y-2">
            {metadata.md5_hash && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">MD5:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2"
                    onClick={() => copyToClipboard(metadata.md5_hash!, 'md5')}
                  >
                    {copiedHash === 'md5' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <code className="text-[10px] block break-all bg-muted p-2 rounded">
                  {metadata.md5_hash}
                </code>
              </div>
            )}
            {metadata.sha256_hash && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">SHA-256:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2"
                    onClick={() => copyToClipboard(metadata.sha256_hash!, 'sha256')}
                  >
                    {copiedHash === 'sha256' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <code className="text-[10px] block break-all bg-muted p-2 rounded">
                  {metadata.sha256_hash}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* PDF Metadata */}
        {metadata.pdf_info && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PDF Information
              </h3>
              <div className="space-y-1 text-xs">
                {metadata.pdf_info.page_count && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pages:</span>
                    <span>{metadata.pdf_info.page_count}</span>
                  </div>
                )}
                {metadata.pdf_info.title && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="truncate ml-2">{metadata.pdf_info.title}</span>
                  </div>
                )}
                {metadata.pdf_info.author && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Author:</span>
                    <span className="truncate ml-2">{metadata.pdf_info.author}</span>
                  </div>
                )}
                {metadata.pdf_info.creator && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creator:</span>
                    <span className="truncate ml-2">{metadata.pdf_info.creator}</span>
                  </div>
                )}
                {metadata.pdf_info.encrypted !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encrypted:</span>
                    <Badge variant={metadata.pdf_info.encrypted ? 'destructive' : 'outline'} className="text-[10px]">
                      {metadata.pdf_info.encrypted ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Image Metadata */}
        {metadata.image_info && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Image Information
              </h3>
              <div className="space-y-1 text-xs">
                {metadata.image_info.width && metadata.image_info.height && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span>{metadata.image_info.width} × {metadata.image_info.height}</span>
                  </div>
                )}
                {metadata.image_info.format && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format:</span>
                    <span>{metadata.image_info.format}</span>
                  </div>
                )}
                {metadata.image_info.color_space && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Color Space:</span>
                    <span>{metadata.image_info.color_space}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Email Metadata */}
        {metadata.email_info && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Information
              </h3>
              <div className="space-y-1 text-xs">
                {metadata.email_info.from && (
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground">From:</span>
                    <div className="break-all">{metadata.email_info.from}</div>
                  </div>
                )}
                {metadata.email_info.to && (
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground">To:</span>
                    <div className="break-all">{metadata.email_info.to}</div>
                  </div>
                )}
                {metadata.email_info.subject && (
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground">Subject:</span>
                    <div className="break-all">{metadata.email_info.subject}</div>
                  </div>
                )}
                {metadata.email_info.date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{metadata.email_info.date}</span>
                  </div>
                )}
                {metadata.email_info.attachment_count !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attachments:</span>
                    <span>{metadata.email_info.attachment_count}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Media Metadata */}
        {metadata.media_info && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Music className="h-4 w-4" />
                Media Information
              </h3>
              <div className="space-y-1 text-xs">
                {metadata.media_info.duration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{Math.floor(metadata.media_info.duration / 60)}:{(Math.floor(metadata.media_info.duration % 60)).toString().padStart(2, '0')}</span>
                  </div>
                )}
                {metadata.media_info.codec && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Codec:</span>
                    <span>{metadata.media_info.codec}</span>
                  </div>
                )}
                {metadata.media_info.bitrate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bitrate:</span>
                    <span>{Math.round(metadata.media_info.bitrate / 1000)} kbps</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

