'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Shield, QrCode, Copy, Check, AlertTriangle, Download } from 'lucide-react'

export default function TwoFactorSetupPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { addToast } = useToast()

  const [stage, setStage] = React.useState<'loading' | 'setup' | 'manage'>('loading')
  const [generating, setGenerating] = React.useState(false)
  const [secret, setSecret] = React.useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState('')
  const [token, setToken] = React.useState('')
  const [verifying, setVerifying] = React.useState(false)
  const [backupCodes, setBackupCodes] = React.useState<string[]>([])
  const [copiedSecret, setCopiedSecret] = React.useState(false)
  const [copiedAll, setCopiedAll] = React.useState(false)
  const [disableDialogOpen, setDisableDialogOpen] = React.useState(false)
  const [disabling, setDisabling] = React.useState(false)

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  React.useEffect(() => {
    if (!isAuthenticated) return

    const check2FAStatus = async () => {
      try {
        const { data } = await api.post('/auth/2fa/generate')
        const payload = data.data
        if (payload?.secret && payload?.qrCodeDataUrl) {
          setSecret(payload.secret)
          setQrCodeDataUrl(payload.qrCodeDataUrl)
          setStage('setup')
        } else {
          setStage('manage')
        }
      } catch (err: any) {
        if (err.response?.status === 400) {
          setStage('manage')
        } else {
          setStage('setup')
        }
      }
    }

    check2FAStatus()
  }, [isAuthenticated])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { data } = await api.post('/auth/2fa/generate')
      const payload = data.data
      setSecret(payload.secret)
      setQrCodeDataUrl(payload.qrCodeDataUrl)
      setStage('setup')
      addToast('QR code generated', 'success')
    } catch (err: any) {
      if (err.response?.status === 400) {
        setStage('manage')
        addToast('Two-factor authentication is already enabled', 'info')
      } else {
        addToast(err.response?.data?.message || 'Failed to generate QR code', 'error')
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleVerify = async () => {
    if (!token || token.length < 6) return
    setVerifying(true)
    try {
      const { data } = await api.post('/auth/2fa/verify', { token })
      const payload = data.data
      setBackupCodes(payload.backupCodes || [])
      addToast('Two-factor authentication enabled', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Invalid verification code', 'error')
    } finally {
      setVerifying(false)
    }
  }

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch {
      addToast('Failed to copy', 'error')
    }
  }

  const handleCopyAllCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    } catch {
      addToast('Failed to copy', 'error')
    }
  }

  const handleDownloadCodes = () => {
    const content = backupCodes.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bookermap-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDisable = async () => {
    setDisabling(true)
    try {
      await api.post('/auth/2fa/disable')
      setStage('setup')
      setSecret('')
      setQrCodeDataUrl('')
      setBackupCodes([])
      setDisableDialogOpen(false)
      addToast('Two-factor authentication disabled', 'success')
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Failed to disable 2FA', 'error')
    } finally {
      setDisabling(false)
    }
  }

  if (authLoading || stage === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Spinner size="lg" />
      </div>
    )
  }

  if (stage === 'manage') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
            <CardDescription>
              <Badge variant="success" className="mt-2">Enabled</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your account is protected with two-factor authentication. You will be asked for a verification code each time you log in.
            </p>
            <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Disable 2FA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to disable two-factor authentication? This will make your account less secure.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setDisableDialogOpen(false)}
                      disabled={disabling}
                    >
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDisable} disabled={disabling}>
                      {disabling ? <Spinner size="sm" /> : 'Disable'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    )
  }

  const showQr = !!qrCodeDataUrl
  const verified = backupCodes.length > 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl">Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account by requiring a verification code in addition to your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!showQr && (
            <Button onClick={handleGenerate} className="w-full" disabled={generating}>
              {generating ? (
                <Spinner size="sm" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate QR Code'}
            </Button>
          )}

          {showQr && !verified && (
            <>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                <div className="flex justify-center mb-3">
                  <img
                    src={qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="h-48 w-48 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all flex-1">
                    {secret}
                  </p>
                  <Button variant="ghost" size="icon" onClick={handleCopySecret} title="Copy secret">
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Scan this QR code with Google Authenticator, Authy, or any TOTP app.
                </p>
              </div>

              <div className="space-y-2">
                <Input
                  label="Verification Code"
                  placeholder="000000"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
                <Button onClick={handleVerify} className="w-full" disabled={verifying || token.length < 6}>
                  {verifying ? <Spinner size="sm" /> : 'Verify'}
                </Button>
              </div>
            </>
          )}

          {verified && (
            <>
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center">
                <Check className="mx-auto h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Two-factor authentication has been enabled successfully!
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Backup Codes
                </h4>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, i) => (
                      <code
                        key={i}
                        className="text-xs font-mono bg-white dark:bg-gray-900 rounded px-2 py-1 border border-gray-200 dark:border-gray-700 text-center"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyAllCodes}>
                    {copiedAll ? (
                      <Check className="mr-1 h-3.5 w-3.5" />
                    ) : (
                      <Copy className="mr-1 h-3.5 w-3.5" />
                    )}
                    {copiedAll ? 'Copied' : 'Copy All'}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleDownloadCodes}>
                    <Download className="mr-1 h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Save these backup codes in a safe place. Each code can only be used once.
                </p>
              </div>

              <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
