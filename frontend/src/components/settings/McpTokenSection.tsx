import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Copy, CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  fetchMcpTokenStatus,
  generateMcpToken,
  revokeMcpToken,
} from '@/services/mcp-token-service'
import { toast } from 'sonner'

const MCP_BASE_URL = 'https://money.khanh.page'

function buildConfigSnippet(token: string): string {
  return `{
  mcp: {
    servers: {
      smartmoney: {
        url: "${MCP_BASE_URL}/mcp?token=${token}",
        transport: "streamable-http"
      }
    }
  }
}`
}

export function McpTokenSection() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()
  const [freshToken, setFreshToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: status, isLoading } = useQuery({
    queryKey: ['mcp-token-status'],
    queryFn: fetchMcpTokenStatus,
  })

  const generateMutation = useMutation({
    mutationFn: generateMcpToken,
    onSuccess: (result) => {
      setFreshToken(result.token)
      setCopied(false)
      queryClient.invalidateQueries({ queryKey: ['mcp-token-status'] })
      toast.success(t('mcp.tokenGenerated', 'Access token generated'))
    },
    onError: () => toast.error(t('mcp.tokenGenerateError', 'Failed to generate token')),
  })

  const revokeMutation = useMutation({
    mutationFn: revokeMcpToken,
    onSuccess: () => {
      setFreshToken(null)
      queryClient.invalidateQueries({ queryKey: ['mcp-token-status'] })
      toast.success(t('mcp.tokenRevoked', 'Access token revoked'))
    },
    onError: () => toast.error(t('mcp.tokenRevokeError', 'Failed to revoke token')),
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
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t(
          'mcp.description',
          'Connect AI assistants like OpenClaw to SmartMoney over the Model Context Protocol.',
        )}
      </p>

      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-px" />
        <span>{t('mcp.safetyNote', 'Read-only access to your finance data. Revoke anytime.')}</span>
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
              {t('mcp.generate', 'Generate token')}
            </Button>
          )}

          {isEnabled && (
            <div className="flex flex-col gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {formattedDate
                  ? t('mcp.activeSince', { date: formattedDate, defaultValue: `Active since ${formattedDate}` })
                  : t('mcp.active', 'Token active')}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => generateMutation.mutate()}
                  loading={generateMutation.isPending}
                  className="min-h-[44px] flex-1"
                >
                  {t('mcp.regenerate', 'Regenerate')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => revokeMutation.mutate()}
                  loading={revokeMutation.isPending}
                  className="min-h-[44px] flex-1"
                >
                  {t('mcp.revoke', 'Revoke')}
                </Button>
              </div>
            </div>
          )}

          {freshToken && (
            <div className="space-y-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50 p-3">
              <div className="flex items-start gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                <span>{t('mcp.tokenOnce', "You won't see this token again.")}</span>
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t('mcp.configTitle', 'OpenClaw config')}
                  </span>
                  <button
                    onClick={() => handleCopy(buildConfigSnippet(freshToken))}
                    className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline min-h-[44px] sm:min-h-0 px-1"
                  >
                    <Copy className="w-3 h-3" />
                    {t('mcp.copyConfig', 'Copy config')}
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 dark:bg-gray-950 text-gray-100 text-xs p-3 leading-relaxed">
                  <code>{buildConfigSnippet(freshToken)}</code>
                </pre>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t(
                    'mcp.configHint',
                    'Paste into your OpenClaw config. Token rides in the URL because OpenClaw drops custom headers.',
                  )}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
