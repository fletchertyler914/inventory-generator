/**
 * Pattern Builder - Simple pattern configuration with live preview
 * ELITE: Dead-simple UI for non-technical users
 */

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Alert, AlertDescription } from '../ui/alert'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ExtractionMethod } from '@/types/mapping'
import { validatePattern } from '@/types/mapping'

interface PatternBuilderProps {
  extractionMethod: ExtractionMethod
  pattern: string
  onPatternChange: (pattern: string) => void
  patternFlags: string
  onPatternFlagsChange: (flags: string) => void
  sampleData: string
}

export function PatternBuilder({
  extractionMethod,
  pattern,
  onPatternChange,
  patternFlags,
  onPatternFlagsChange,
  sampleData,
}: PatternBuilderProps) {
  const [testInput, setTestInput] = useState(sampleData)

  // Sync testInput when sampleData changes
  useEffect(() => {
    setTestInput(sampleData)
  }, [sampleData])

  // Validation
  const validation = useMemo(() => {
    if (extractionMethod === 'direct') {
      return { valid: true }
    }
    if (!pattern.trim()) {
      return { valid: false, error: 'Pattern is required' }
    }
    return validatePattern(pattern, extractionMethod)
  }, [pattern, extractionMethod])

  // Preview extraction result
  const preview = useMemo(() => {
    if (!testInput || extractionMethod === 'direct') {
      return testInput || ''
    }

    if (!validation.valid) {
      return 'Invalid pattern'
    }

    try {
      const regex = new RegExp(pattern, patternFlags || undefined)
      const match = regex.exec(testInput)
      
      if (match) {
        return match[0] || match[1] || 'Match found'
      }
      
      return 'No match found'
    } catch {
      return 'Invalid pattern'
    }
  }, [testInput, pattern, patternFlags, extractionMethod, validation.valid])

  // Common patterns for quick selection
  const commonPatterns = useMemo(() => {
    if (extractionMethod === 'date') {
      return [
        { label: 'YYYY-MM-DD', pattern: '\\d{4}-\\d{2}-\\d{2}' },
        { label: 'MM/DD/YYYY', pattern: '\\d{2}/\\d{2}/\\d{4}' },
        { label: 'Month Year', pattern: '[A-Za-z]+\\s+\\d{4}' },
      ]
    }
    if (extractionMethod === 'number') {
      return [
        { label: 'Any Number', pattern: '\\d+' },
        { label: 'Decimal', pattern: '\\d+\\.\\d+' },
        { label: 'With Currency', pattern: '\\$?\\d+(?:\\.\\d{2})?' },
      ]
    }
    return [
      { label: 'Word', pattern: '\\w+' },
      { label: 'Letters', pattern: '[A-Za-z]+' },
      { label: 'Digits', pattern: '\\d+' },
    ]
  }, [extractionMethod])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Configure Pattern</CardTitle>
        <CardDescription>
          {extractionMethod === 'date' && 'Enter a pattern to find dates, or use a common pattern below'}
          {extractionMethod === 'number' && 'Enter a pattern to find numbers, or use a common pattern below'}
          {extractionMethod === 'pattern' && 'Enter a pattern to extract specific text'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Common patterns quick select */}
        {commonPatterns.length > 0 && (
          <div className="space-y-2">
            <Label>Quick Patterns</Label>
            <div className="flex flex-wrap gap-2">
              {commonPatterns.map((cp) => (
                <Badge
                  key={cp.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => onPatternChange(cp.pattern)}
                >
                  {cp.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Pattern input */}
        <div className="space-y-2">
          <Label htmlFor="pattern-input">
            Pattern {extractionMethod === 'pattern' && '(regex)'}
          </Label>
          <Input
            id="pattern-input"
            placeholder={extractionMethod === 'date' ? 'e.g., \\d{4}-\\d{2}-\\d{2}' : extractionMethod === 'number' ? 'e.g., \\d+' : 'Enter pattern...'}
            value={pattern}
            onChange={(e) => onPatternChange(e.target.value)}
          />
          {!validation.valid && validation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validation.error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Pattern flags (optional) */}
        <div className="space-y-2">
          <Label htmlFor="pattern-flags">Options (optional)</Label>
          <Input
            id="pattern-flags"
            placeholder="e.g., i (case-insensitive)"
            value={patternFlags}
            onChange={(e) => onPatternFlagsChange(e.target.value)}
          />
          <div className="text-xs text-muted-foreground">
            Common flags: i (case-insensitive), g (global), m (multiline)
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-2">
          <Label htmlFor="test-input">Test with sample data</Label>
          <Textarea
            id="test-input"
            placeholder="Enter text to test pattern..."
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={2}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              {validation.valid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Pattern is valid</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground">Pattern has errors</span>
                </>
              )}
            </div>
            {testInput && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-xs text-muted-foreground mb-1">Preview:</div>
                <div className="font-mono text-sm">
                  {preview || <span className="text-muted-foreground">No match</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

