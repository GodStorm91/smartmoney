import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Copy, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  fetchMcpWriteTokenStatus,
  generateMcpWriteToken,
  revokeMcpWriteToken,
} from '@/services/mcp-token-service'
import { toast } from 'sonner'

export function McpWriteTokenSection() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [freshToken, setFreshToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: status, isLoading } = useQuery({
    queryKey: ['mcp-write-token-status'],
    queryFn: fetchMcpWriteTokenStatus,
  })

  const generateMutation = useMutation({
    mutationFn: generateMcpWriteToken,
    onSuccess: (result) => {
      setFreshToken(result.token)
      setCopied(false)
      queryClient.invalidateQueries({ queryKey: ['mcp-write-token-status'] })
      toast.success(t('mcpWrite.tokenGenerated', 'Write token generated'))
    },
    onError: () => toast.error(t('mcpWrite.tokenGenerateError', 'Failed to generate write token')),
  })

  const revokeMutation = useMutation({
    mutationFn: revokeMcpWriteToken,
    onSuccess: () => {
      setFreshToken(null)
      queryClient.invalidateQueries({ queryKey: ['mcp-write-token-status'] })
      toast.success(t('mcpWrite.tokenRevoked', 'Write token revoked'))
    },
    onError: () => toast.error(t('mcpWrite.tokenRevokeError', 'Failed to revoke write token')),
  })

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('mcp.copyError', 'Failed to copy'))
    }
  }

  const isEnabled = status?.enabled ?? false
  const formattedDate = status?.created_at
    ? new Date(status.created_at).toLocaleDateString()
    : null

  return (
    <div className="space-y-4">
      {/* Amber warning — always visible */}
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50 p-3">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-px" />
        <div className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
          <p className="font-bold">
            {t('mcpWrite.warningTitle', 'Write tokens allow imports and other write operations through MCP')}
          </p>
          <p>
            {t(
              'mcpWrite.warningExpiry',
              'Shorter expiry (30 days) — rotate when no longer needed. Treat like a password.',
            )}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
          {t('loading', 'Loading…')}
        </div>
      ) : (
        <>
          {!isEnabled && !freshToken && (
            <Button
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
              className="min-h-[44px] w-full sm:w-auto"
            >
              {t('mcpWrite.generate', 'Generate write token')}
            </Button>
          )}

          {isEnabled && (
            <div className="flex flex-col gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <CheckCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {formattedDate
                  ? t('mcpWrite.activeSince', { date: formattedDate, defaultValue: `Write token active since ${formattedDate}` })
                  : t('mcpWrite.active', 'Write token active')}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateMutation.mutate()}
                  loading={generateMutation.isPending}
                  className="min-h-[44px] flex-1"
                >
                  {t('mcpWrite.regenerate', 'Regenerate')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => revokeMutation.mutate()}
                  loading={revokeMutation.isPending}
                  className="min-h-[44px] flex-1"
                >
                  {t('mcpWrite.revoke', 'Revoke')}
                </Button>
              </div>
            </div>
          )}

          {freshToken && (
            <div className="space-y-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50 p-3">
              <div className="flex items-start gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                <span>{t('mcpWrite.tokenOnce', "You won't see this token again. Copy it now.")}</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={freshToken}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 px-3 h-11 text-xs font-mono bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 select-all"
                />
                <Button
                  variant="outline"
                  onClick={() => handleCopy(freshToken)}
                  className="min-h-[44px] px-3"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t(
                  'mcpWrite.usageHint',
                  'Use this token with the import_csv MCP tool. Valid for 30 days.',
                )}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
