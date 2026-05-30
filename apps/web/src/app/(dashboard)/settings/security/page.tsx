'use client'

import * as React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/components/ui/toast'
import { Shield, ShieldOff, Copy, Check } from 'lucide-react'
import Image from 'next/image'

export default function SecuritySettingsPage() {
  const { addToast } = useToast()
  const [step, setStep] = React.useState<'idle' | 'generating' | 'verify' | 'backup' | 'enabled'>('idle')
  const [secretData, setSecretData] = React.useState<{ secret: string; qrCodeUrl: string } | null>(null)
  const [backupCodes, setBackupCodes] = React.useState<string[]>([])
  const [verifyToken, setVerifyToken] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  const { data: user } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data.data || data
    },
  })

  const twoFactorEnabled = user?.twoFactorEnabled ?? false

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/2fa/generate')
      return data.data || data
    },
    onSuccess: (data) => {
      setSecretData(data)
      setStep('verify')
    },
    onError: () => addToast('Failed to generate 2FA secret', 'error'),
  })

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/2fa/verify', { token: verifyToken })
      return data.data || data
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || [])
      setStep('backup')
      addToast('Two-factor authentication enabled', 'success')
    },
    onError: () => addToast('Invalid code, please try again', 'error'),
  })

  const disableMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/2fa/disable')
    },
    onSuccess: () => {
      setStep('idle')
      setSecretData(null)
      addToast('Two-factor authentication disabled', 'success')
    },
    onError: () => addToast('Failed to disable 2FA', 'error'),
  })

  const handleCopyCodes = () => {
    if (backupCodes.length > 0) {
      navigator.clipboard.writeText(backupCodes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEnable = () => {
    generateMutation.mutate()
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    verifyMutation.mutate()
  }

  const handleDisable = () => {
    if (window.confirm('Are you sure you want to disable two-factor authentication?')) {
      disableMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your account security settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account by requiring a verification code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorEnabled && step !== 'backup' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-400">
                <Shield className="h-4 w-4" />
                Two-factor authentication is enabled
              </div>
              <Button variant="destructive" onClick={handleDisable} disabled={disableMutation.isPending}>
                {disableMutation.isPending ? <Spinner size="sm" /> : <ShieldOff className="h-4 w-4 mr-2" />}
                Disable 2FA
              </Button>
            </div>
          ) : step === 'verify' && secretData ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy)
              </p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={secretData.qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Or enter this code manually: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">{secretData.secret}</code>
              </p>
              <form onSubmit={handleVerify} className="space-y-3 max-w-xs mx-auto">
                <Input
                  label="6-digit Code"
                  placeholder="000000"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  maxLength={6}
                  required
                  className="text-center text-2xl tracking-widest"
                />
                <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending ? <Spinner size="sm" /> : 'Verify & Enable'}
                </Button>
              </form>
            </div>
          ) : step === 'backup' ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Save these backup codes!</strong> Each code can only be used once. Keep them in a safe place.
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm space-y-1">
                {backupCodes.map((code, i) => (
                  <div key={i} className="text-gray-700 dark:text-gray-300">{code}</div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCopyCodes} variant="outline" size="sm">
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'Copied' : 'Copy Codes'}
                </Button>
                <Button onClick={() => { setStep('idle'); setSecretData(null); }} variant="outline" size="sm">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                When enabled, you will be asked to enter a verification code from your authenticator app after signing in.
              </p>
              <Button onClick={handleEnable} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? <Spinner size="sm" /> : 'Enable 2FA'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
