'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input as InputField } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Spinner, PageLoader } from '@/components/ui/spinner'
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Save,
  Play,
  Trash2,
  Plus,
  MessageSquare,
  GitFork,
  Zap,
  Square,
  Target,
} from 'lucide-react'
import { FormInput as InputIcon } from 'lucide-react'
import type { ConversationFlow } from '@/types'

const nodeTypeConfig = {
  START: { label: 'Start', color: 'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-600', icon: Target },
  MESSAGE: { label: 'Message', color: 'bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600', icon: MessageSquare },
  CONDITION: { label: 'Condition', color: 'bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600', icon: GitFork },
  ACTION: { label: 'Action', color: 'bg-purple-100 border-purple-400 dark:bg-purple-900/30 dark:border-purple-600', icon: Zap },
  INPUT: { label: 'Input', color: 'bg-indigo-100 border-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-600', icon: InputIcon },
  END: { label: 'End', color: 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600', icon: Square },
}

function FlowNodeComponent({ data, selected }: NodeProps) {
  const config = nodeTypeConfig[data.nodeType as keyof typeof nodeTypeConfig] || nodeTypeConfig.MESSAGE
  const Icon = config.icon

  return (
    <div
      className={`px-4 py-2 rounded-lg border-2 min-w-[160px] shadow-sm bg-white dark:bg-gray-800 ${
        selected ? 'ring-2 ring-blue-500' : ''
      } ${config.color}`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider">{config.label}</span>
      </div>
      <div className="mt-1 text-sm font-medium truncate">
        {data.label || `${config.label} Node`}
      </div>
      {data.nodeType === 'CONDITION' && (
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
          <span className="bg-green-100 dark:bg-green-900/30 px-1 rounded">✔ true</span>
          <span className="bg-red-100 dark:bg-red-900/30 px-1 rounded">✘ false</span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3"
        id={data.nodeType === 'CONDITION' ? 'true' : undefined}
      />
      {data.nodeType === 'CONDITION' && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="!w-3 !h-3 !left-[75%]"
          style={{ left: '75%' }}
        />
      )}
    </div>
  )
}

const nodeTypes = {
  flowNode: FlowNodeComponent,
}

interface FlowEditorProps {
  flow: ConversationFlow
  onSave: (nodes: any[], edges: any[]) => void
  onTest: (nodes: any[], edges: any[]) => void
  isSaving: boolean
}

const defaultNodePosition = { x: 250, y: 50 }

function createNode(nodeType: string, label: string, position = defaultNodePosition): Node {
  const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    type: 'flowNode',
    position,
    data: {
      nodeType,
      label,
      content: nodeType === 'MESSAGE' ? { text: '' } :
               nodeType === 'CONDITION' ? { condition: '' } :
               nodeType === 'ACTION' ? { action: '' } :
               nodeType === 'INPUT' ? { variable: '' } :
               null,
      config: {},
    },
  }
}

function FlowEditor({ flow, onSave, onTest, isSaving }: FlowEditorProps) {
  const reactFlowInstance = useReactFlow()

  const initialNodes = React.useMemo(() => {
    if (flow.nodes && Array.isArray(flow.nodes) && flow.nodes.length > 0) {
      return flow.nodes.map((n: any) => ({
        ...n,
        type: 'flowNode',
      }))
    }
    const startNode = createNode('START', 'Flow Start', { x: 300, y: 50 })
    const endNode = createNode('END', 'Flow End', { x: 300, y: 400 })
    return [startNode, endNode]
  }, [flow.id])

  const initialEdges = React.useMemo(() => {
    if (flow.edges && Array.isArray(flow.edges)) {
      return flow.edges.map((e: any) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
    }
    return []
  }, [flow.id])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null)

  const onConnect = React.useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({
        ...connection,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      }, eds))
    },
    [setEdges],
  )

  const onNodeClick = React.useCallback((_: any, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = React.useCallback(() => {
    setSelectedNode(null)
  }, [])

  const updateNodeData = React.useCallback((nodeId: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              [key]: value,
            },
          }
        }
        return n
      }),
    )
    setSelectedNode((prev) => {
      if (prev && prev.id === nodeId) {
        return {
          ...prev,
          data: {
            ...prev.data,
            [key]: value,
          },
        }
      }
      return prev
    })
  }, [setNodes])

  const updateNodeContent = React.useCallback((nodeId: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              content: {
                ...(n.data.content || {}),
                [key]: value,
              },
            },
          }
        }
        return n
      }),
    )
    setSelectedNode((prev) => {
      if (prev && prev.id === nodeId) {
        return {
          ...prev,
          data: {
            ...prev.data,
            content: {
              ...(prev.data.content || {}),
              [key]: value,
            },
          },
        }
      }
      return prev
    })
  }, [setNodes])

  const addNode = React.useCallback((nodeType: string) => {
    const position = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 3,
    })
    const config = nodeTypeConfig[nodeType as keyof typeof nodeTypeConfig] || nodeTypeConfig.MESSAGE
    const newNode = createNode(nodeType, `${config.label} Node`, position)
    setNodes((nds) => [...nds, newNode])
  }, [reactFlowInstance, setNodes])

  const deleteSelectedNode = React.useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
      setSelectedNode(null)
    }
  }, [selectedNode, setNodes, setEdges])

  const handleSave = React.useCallback(() => {
    const cleanNodes = nodes.map((n) => ({
      id: n.id,
      type: 'flowNode',
      position: n.position,
      data: n.data,
    }))
    const cleanEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))
    onSave(cleanNodes, cleanEdges)
  }, [nodes, edges, onSave])

  const handleTest = React.useCallback(() => {
    const cleanNodes = nodes.map((n) => ({
      id: n.id,
      type: 'flowNode',
      position: n.position,
      data: n.data,
    }))
    const cleanEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }))
    onTest(cleanNodes, cleanEdges)
  }, [nodes, edges, onTest])

  const nodeTypesList = ['START', 'MESSAGE', 'CONDITION', 'ACTION', 'INPUT', 'END'] as const

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-48 shrink-0 space-y-2">
        <Card>
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Nodes</p>
            {nodeTypesList.map((nt) => {
              const cfg = nodeTypeConfig[nt]
              const Icon = cfg.icon
              return (
                <button
                  key={nt}
                  onClick={() => addNode(nt)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {cfg.label}
                </button>
              )
            })}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" /> {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleTest}>
            <Play className="h-4 w-4 mr-1" /> Test
          </Button>
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Backspace"
          className="bg-gray-50 dark:bg-gray-950"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const cfg = nodeTypeConfig[node.data?.nodeType as keyof typeof nodeTypeConfig]
              return cfg ? '#3B82F6' : '#6B7280'
            }}
            className="!border !border-gray-200 dark:!border-gray-700"
          />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="w-72 shrink-0">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Node Properties</h3>
                <Button variant="ghost" size="sm" onClick={deleteSelectedNode}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <InputField
                label="Label"
                value={selectedNode.data?.label || ''}
                onChange={(e) => updateNodeData(selectedNode.id, 'label', e.target.value)}
              />

              {selectedNode.data?.nodeType === 'MESSAGE' && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message Text</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    value={selectedNode.data?.content?.text || ''}
                    onChange={(e) => updateNodeContent(selectedNode.id, 'text', e.target.value)}
                    placeholder="Enter message text. Use {{variable}} for dynamic values."
                  />
                </div>
              )}

              {selectedNode.data?.nodeType === 'CONDITION' && (
                <InputField
                  label="Condition"
                  value={selectedNode.data?.content?.condition || ''}
                  onChange={(e: any) => updateNodeContent(selectedNode.id, 'condition', e.target.value)}
                  placeholder="e.g., status == CONFIRMED"
                />
              )}

              {selectedNode.data?.nodeType === 'ACTION' && (
                <Select
                  label="Action Type"
                  options={[
                    { value: 'create_booking', label: 'Create Booking' },
                    { value: 'cancel_booking', label: 'Cancel Booking' },
                    { value: 'check_availability', label: 'Check Availability' },
                    { value: 'send_payment_link', label: 'Send Payment Link' },
                    { value: 'check_status', label: 'Check Booking Status' },
                    { value: 'reschedule_booking', label: 'Reschedule Booking' },
                  ]}
                  value={selectedNode.data?.content?.action || ''}
                  onChange={(e: any) => updateNodeContent(selectedNode.id, 'action', e.target.value)}
                />
              )}

              {selectedNode.data?.nodeType === 'INPUT' && (
                <InputField
                  label="Variable Name"
                  value={selectedNode.data?.content?.variable || ''}
                  onChange={(e: any) => updateNodeContent(selectedNode.id, 'variable', e.target.value)}
                  placeholder="e.g., customer_name"
                />
              )}

              {selectedNode.data?.nodeType === 'START' && (
                <p className="text-xs text-gray-500">Entry point for the flow. Connect it to the next node.</p>
              )}

              {selectedNode.data?.nodeType === 'END' && (
                <p className="text-xs text-gray-500">End of flow. No outgoing connections needed.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function FlowEditorPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const { data: flow, isLoading } = useQuery({
    queryKey: ['ai-flow', params.id],
    queryFn: async () => {
      const { data } = await api.get(`/ai/flows/${params.id}`)
      return data.data as ConversationFlow
    },
    enabled: !!params.id,
  })

  const updateMutation = useMutation({
    mutationFn: async (updateData: { nodes: any[]; edges: any[] }) => {
      const { data } = await api.patch(`/ai/flows/${params.id}`, updateData)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-flow', params.id] })
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] })
      addToast('Flow saved', 'success')
    },
    onError: () => {
      addToast('Failed to save flow', 'error')
    },
  })

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/ai/flows/${params.id}/test`, {
        message: 'test message',
        context: { bookingStatus: 'CONFIRMED' },
      })
      return data.data
    },
    onSuccess: (result) => {
      const msg = result?.reply || 'Flow executed successfully'
      addToast(`Test: ${msg}`, 'info')
    },
    onError: () => {
      addToast('Test execution failed', 'error')
    },
  })

  if (isLoading) return <PageLoader />
  if (!flow) return <div className="p-6 text-center text-gray-500">Flow not found</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{flow.name}</h1>
          <p className="text-sm text-gray-500">
            {flow.trigger}: {flow.triggerValue}
            {flow.description && <> &middot; {flow.description}</>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/ai/flows')}>
          Back to Flows
        </Button>
      </div>

      <ReactFlowProvider>
        <FlowEditor
          flow={flow}
          onSave={(nodes, edges) => updateMutation.mutate({ nodes, edges })}
          onTest={() => testMutation.mutate()}
          isSaving={updateMutation.isPending}
        />
      </ReactFlowProvider>
    </div>
  )
}
