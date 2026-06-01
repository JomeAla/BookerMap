'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { BookOpen, Lock, Key, Shield } from 'lucide-react'

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/bookings',
    description: 'List all bookings for the tenant',
    scopes: ['read:bookings'],
    params: [
      { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, description: 'Items per page (max: 100, default: 50)' },
      { name: 'status', type: 'string', required: false, description: 'Filter by booking status' },
      { name: 'dateFrom', type: 'string', required: false, description: 'Start date (ISO 8601)' },
      { name: 'dateTo', type: 'string', required: false, description: 'End date (ISO 8601)' },
    ],
    response: `{
  "success": true,
  "data": [{
    "id": "clx...",
    "startTime": "2026-06-01T10:00:00.000Z",
    "endTime": "2026-06-01T11:00:00.000Z",
    "status": "PENDING",
    "totalPrice": 5000,
    "service": { "id": "...", "name": "Deep Cleaning" },
    "customer": { "id": "...", "firstName": "John", "lastName": "Doe" }
  }],
  "meta": { "page": 1, "limit": 50, "total": 1, "totalPages": 1 }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/bookings/:id',
    description: 'Get a single booking by ID',
    scopes: ['read:bookings'],
    params: [
      { name: 'id', type: 'string', required: true, description: 'Booking ID' },
    ],
    response: `{
  "success": true,
  "data": {
    "id": "clx...",
    "startTime": "2026-06-01T10:00:00.000Z",
    "endTime": "2026-06-01T11:00:00.000Z",
    "status": "PENDING",
    "totalPrice": 5000,
    "service": { ... },
    "customer": { ... },
    "technician": { ... }
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/bookings',
    description: 'Create a new booking',
    scopes: ['write:bookings'],
    params: [
      { name: 'serviceId', type: 'string', required: true, description: 'Service ID' },
      { name: 'customerId', type: 'string', required: true, description: 'Customer ID' },
      { name: 'startTime', type: 'string', required: true, description: 'Start time (ISO 8601)' },
      { name: 'technicianId', type: 'string', required: false, description: 'Technician ID (optional)' },
      { name: 'notes', type: 'string', required: false, description: 'Booking notes' },
    ],
    request: `{
  "serviceId": "clx...",
  "customerId": "clx...",
  "startTime": "2026-06-01T10:00:00.000Z",
  "notes": "Please use the back entrance"
}`,
    response: `{
  "success": true,
  "data": {
    "id": "clx...",
    "startTime": "2026-06-01T10:00:00.000Z",
    "endTime": "2026-06-01T11:00:00.000Z",
    "status": "PENDING",
    "totalPrice": 5000
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/services',
    description: 'List all active services',
    scopes: ['read:services'],
    params: [],
    response: `{
  "success": true,
  "data": [{
    "id": "clx...",
    "name": "Deep Cleaning",
    "description": "Professional deep cleaning service",
    "duration": 60,
    "price": 5000,
    "priceType": "flat"
  }]
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/customers',
    description: 'List customers (paginated)',
    scopes: ['read:customers'],
    params: [
      { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, description: 'Items per page (max: 100)' },
      { name: 'search', type: 'string', required: false, description: 'Search by name, email, or phone' },
    ],
    response: `{
  "success": true,
  "data": [{
    "id": "clx...",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+2348012345678"
  }],
  "meta": { "page": 1, "limit": 50, "total": 10, "totalPages": 1 }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/customers',
    description: 'Create a new customer',
    scopes: ['write:customers'],
    params: [
      { name: 'firstName', type: 'string', required: true, description: 'First name' },
      { name: 'lastName', type: 'string', required: true, description: 'Last name' },
      { name: 'email', type: 'string', required: false, description: 'Email address' },
      { name: 'phone', type: 'string', required: true, description: 'Phone number' },
    ],
    request: `{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+2348012345679"
}`,
    response: `{
  "success": true,
  "data": {
    "id": "clx...",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "+2348012345679"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/availability',
    description: 'Check available time slots',
    scopes: ['read:availability'],
    params: [
      { name: 'serviceId', type: 'string', required: true, description: 'Service ID' },
      { name: 'date', type: 'string', required: true, description: 'Date (YYYY-MM-DD)' },
    ],
    response: `{
  "success": true,
  "data": [{
    "technicianId": "clx...",
    "technicianName": "Michael Tech",
    "startTime": "2026-06-01T08:00:00.000Z",
    "endTime": "2026-06-01T09:00:00.000Z"
  }]
}`,
  },
]

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function ApiDocsPage() {
  const [activeTab, setActiveTab] = React.useState('endpoints')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Developer documentation for the BookerMap Public REST API
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="endpoints">
            <BookOpen className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="auth">
            <Lock className="h-4 w-4 mr-2" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="errors">
            <Shield className="h-4 w-4 mr-2" />
            Errors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4 mt-4">
          {endpoints.map((ep, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${methodColors[ep.method] || 'bg-gray-100 text-gray-800'}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-gray-900 dark:text-white">{ep.path}</code>
                  <div className="flex gap-1 ml-auto">
                    {ep.scopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="text-[10px]">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
                <CardTitle className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                  {ep.description}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(ep as any).params?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Parameters</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-1 pr-4 font-medium text-gray-500">Name</th>
                          <th className="text-left py-1 pr-4 font-medium text-gray-500">Type</th>
                          <th className="text-left py-1 pr-4 font-medium text-gray-500">Required</th>
                          <th className="text-left py-1 font-medium text-gray-500">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ep as any).params.map((p: any, j: number) => (
                          <tr key={j} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-1 pr-4 font-mono text-xs">{p.name}</td>
                            <td className="py-1 pr-4 text-xs text-gray-500">{p.type}</td>
                            <td className="py-1 pr-4">
                              {p.required ? (
                                <Badge variant="destructive" className="text-[10px]">Required</Badge>
                              ) : (
                                <span className="text-xs text-gray-400">Optional</span>
                              )}
                            </td>
                            <td className="py-1 text-xs text-gray-500">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {(ep as any).request && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Request Body</h4>
                    <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono overflow-x-auto border border-gray-200 dark:border-gray-700">
                      {(ep as any).request}
                    </pre>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Response</h4>
                  <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono overflow-x-auto border border-gray-200 dark:border-gray-700">
                    {ep.response}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="auth" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Authentication</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">API Key Format</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  All requests must include an API key in the Authorization header.
                  API keys are generated from the API Keys settings page.
                </p>
                <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono border border-gray-200 dark:border-gray-700">
                  Authorization: Bearer bmap_a1b2c3d4e5f6...
                </pre>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-1">Scopes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Each API key is assigned one or more scopes that control what it can access:
                </p>
                <div className="space-y-1">
                  {['read:bookings', 'write:bookings', 'read:customers', 'write:customers', 'read:services', 'read:availability'].map((scope) => (
                    <div key={scope} className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">{scope}</Badge>
                      <span className="text-gray-500">
                        {scope.startsWith('read') ? 'Read access to' : 'Write access to'} {scope.split(':')[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-1">Rate Limiting</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Each API key has a configurable rate limit (requests per minute).
                  When exceeded, the API returns HTTP 429 with a Retry-After header.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-1">Base URL</h3>
                <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono border border-gray-200 dark:border-gray-700">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Error Handling</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All errors follow a consistent format:
              </p>
              <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono border border-gray-200 dark:border-gray-700">
{`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}`}
              </pre>

              <div>
                <h3 className="text-sm font-semibold mb-2">Common Error Codes</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-1 pr-4 font-medium text-gray-500">HTTP Status</th>
                      <th className="text-left py-1 pr-4 font-medium text-gray-500">Code</th>
                      <th className="text-left py-1 font-medium text-gray-500">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1 pr-4"><Badge variant="destructive">401</Badge></td>
                      <td className="py-1 pr-4 font-mono text-xs">UNAUTHORIZED</td>
                      <td className="py-1 text-xs text-gray-500">Missing or invalid API key</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1 pr-4"><Badge variant="destructive">403</Badge></td>
                      <td className="py-1 pr-4 font-mono text-xs">FORBIDDEN</td>
                      <td className="py-1 text-xs text-gray-500">API key lacks required scope</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1 pr-4"><Badge variant="destructive">404</Badge></td>
                      <td className="py-1 pr-4 font-mono text-xs">NOT_FOUND</td>
                      <td className="py-1 text-xs text-gray-500">Resource not found</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1 pr-4"><Badge variant="destructive">429</Badge></td>
                      <td className="py-1 pr-4 font-mono text-xs">RATE_LIMITED</td>
                      <td className="py-1 text-xs text-gray-500">Rate limit exceeded</td>
                    </tr>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-1 pr-4"><Badge variant="destructive">422</Badge></td>
                      <td className="py-1 pr-4 font-mono text-xs">VALIDATION_ERROR</td>
                      <td className="py-1 text-xs text-gray-500">Invalid request body</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
