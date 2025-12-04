import { useState, useEffect } from 'react';
import { Copy, Check, FileText, Hash, Image as ImageIcon, Mail, Music, Loader2, Database } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { metadataService } from '@/services/metadataService';
import type { FileMetadataExtracted } from '@/types/metadata';
import { format } from 'date-fns';
import { getMappingFields, formatMappingValue } from '@/lib/inventory-utils';
import type { InventoryItem } from '@/types/inventory';

interface MetadataPanelProps {
  filePath: string;
  fileType?: string;
  item?: InventoryItem;
  caseId?: string;
}

export function MetadataPanel({ filePath, item, caseId }: MetadataPanelProps) {
  // Get mapping fields if item is provided
  const mappingFields = item ? Array.from(getMappingFields(item, caseId).entries()) : []
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
      <div className="p-6 space-y-6">
        {/* Basic File Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center justify-center gap-2 text-center">
            <FileText className="h-4 w-4" />
            File Information
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-4 px-2">
              <span className="text-muted-foreground font-medium">Size:</span>
              <span className="text-right font-mono">{formatBytes(metadata.file_size)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-2">
              <span className="text-muted-foreground font-medium">Type:</span>
              <Badge variant="outline" className="text-[10px]">
                {metadata.file_type.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4 px-2">
              <span className="text-muted-foreground font-medium">Created:</span>
              <span className="text-right">{format(new Date(metadata.created_at * 1000), 'MMM d, yyyy h:mm a')}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-2">
              <span className="text-muted-foreground font-medium">Modified:</span>
              <span className="text-right">{format(new Date(metadata.modified_at * 1000), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Hashes */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center justify-center gap-2 text-center">
            <Hash className="h-4 w-4" />
            File Hashes
          </h3>
          <div className="space-y-3">
            {metadata.md5_hash && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4 px-2">
                  <span className="text-xs text-muted-foreground font-medium">MD5:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => copyToClipboard(metadata.md5_hash!, 'md5')}
                  >
                    {copiedHash === 'md5' ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <code className="text-[10px] block break-all bg-muted/50 p-3 rounded-md font-mono text-center">
                  {metadata.md5_hash}
                </code>
              </div>
            )}
            {metadata.sha256_hash && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4 px-2">
                  <span className="text-xs text-muted-foreground font-medium">SHA-256:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => copyToClipboard(metadata.sha256_hash!, 'sha256')}
                  >
                    {copiedHash === 'sha256' ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <code className="text-[10px] block break-all bg-muted/50 p-3 rounded-md font-mono text-center">
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
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center justify-center gap-2 text-center">
                <FileText className="h-4 w-4" />
                PDF Information
              </h3>
              <div className="space-y-2.5 text-xs">
                {metadata.pdf_info.page_count && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Pages:</span>
                    <span className="text-right">{metadata.pdf_info.page_count}</span>
                  </div>
                )}
                {metadata.pdf_info.title && (
                  <div className="flex items-start justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Title:</span>
                    <span className="text-right break-words flex-1">{metadata.pdf_info.title}</span>
                  </div>
                )}
                {metadata.pdf_info.author && (
                  <div className="flex items-start justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Author:</span>
                    <span className="text-right break-words flex-1">{metadata.pdf_info.author}</span>
                  </div>
                )}
                {metadata.pdf_info.creator && (
                  <div className="flex items-start justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Creator:</span>
                    <span className="text-right break-words flex-1">{metadata.pdf_info.creator}</span>
                  </div>
                )}
                {metadata.pdf_info.encrypted !== undefined && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Encrypted:</span>
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
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center justify-center gap-2 text-center">
                <ImageIcon className="h-4 w-4" />
                Image Information
              </h3>
              <div className="space-y-2.5 text-xs">
                {metadata.image_info.width && metadata.image_info.height && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Dimensions:</span>
                    <span className="text-right font-mono">{metadata.image_info.width} × {metadata.image_info.height}</span>
                  </div>
                )}
                {metadata.image_info.format && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Format:</span>
                    <span className="text-right">{metadata.image_info.format}</span>
                  </div>
                )}
                {metadata.image_info.color_space && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Color Space:</span>
                    <span className="text-right">{metadata.image_info.color_space}</span>
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
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center justify-center gap-2 text-center">
                <Mail className="h-4 w-4" />
                Email Information
              </h3>
              <div className="space-y-2.5 text-xs">
                {metadata.email_info.from && (
                  <div className="space-y-1 px-2">
                    <span className="text-muted-foreground font-medium block">From:</span>
                    <div className="break-all text-right">{metadata.email_info.from}</div>
                  </div>
                )}
                {metadata.email_info.to && (
                  <div className="space-y-1 px-2">
                    <span className="text-muted-foreground font-medium block">To:</span>
                    <div className="break-all text-right">{metadata.email_info.to}</div>
                  </div>
                )}
                {metadata.email_info.subject && (
                  <div className="space-y-1 px-2">
                    <span className="text-muted-foreground font-medium block">Subject:</span>
                    <div className="break-all text-right">{metadata.email_info.subject}</div>
                  </div>
                )}
                {metadata.email_info.date && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Date:</span>
                    <span className="text-right">{metadata.email_info.date}</span>
                  </div>
                )}
                {metadata.email_info.attachment_count !== undefined && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Attachments:</span>
                    <span className="text-right">{metadata.email_info.attachment_count}</span>
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
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center justify-center gap-2 text-center">
                <Music className="h-4 w-4" />
                Media Information
              </h3>
              <div className="space-y-2.5 text-xs">
                {metadata.media_info.duration && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Duration:</span>
                    <span className="text-right font-mono">{Math.floor(metadata.media_info.duration / 60)}:{(Math.floor(metadata.media_info.duration % 60)).toString().padStart(2, '0')}</span>
                  </div>
                )}
                {metadata.media_info.codec && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Codec:</span>
                    <span className="text-right">{metadata.media_info.codec}</span>
                  </div>
                )}
                {metadata.media_info.bitrate && (
                  <div className="flex items-center justify-between gap-4 px-2">
                    <span className="text-muted-foreground font-medium">Bitrate:</span>
                    <span className="text-right font-mono">{Math.round(metadata.media_info.bitrate / 1000)} kbps</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Extracted Mapping Fields */}
        {mappingFields.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center justify-center gap-2 text-center">
                <Database className="h-4 w-4" />
                Extracted Fields
              </h3>
              <div className="space-y-2.5 text-xs">
                {mappingFields.map(([columnId, { value, mapping }]) => {
                  const label = mapping.description || columnId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  return (
                    <div key={columnId} className="flex items-start justify-between gap-4 px-2">
                      <span className="text-muted-foreground font-medium">{label}:</span>
                      <span className="text-right break-words flex-1">{formatMappingValue(value, mapping.extractionMethod)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

