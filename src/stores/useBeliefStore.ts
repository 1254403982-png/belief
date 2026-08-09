import { create } from 'zustand'
import type { BeliefNode, BeliefEdge } from '../db'

interface ViewState {
  offsetX: number
  offsetY: number
  scale: number
}

interface BeliefState {
  // 数据
  nodes: BeliefNode[]
  edges: BeliefEdge[]
  viewState: ViewState
  selectedNodeId: string | null
  focusNodeId: string | null

  // 画布视口
  setViewState: (partial: Partial<ViewState>) => void

  // 节点操作
  setNodes: (nodes: BeliefNode[]) => void
  addNode: (node: BeliefNode) => void
  updateNode: (id: string, partial: Partial<BeliefNode>) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void
  setFocusNode: (id: string | null) => void

  // 连线操作
  setEdges: (edges: BeliefEdge[]) => void
  addEdge: (edge: BeliefEdge) => void
  removeEdge: (id: string) => void
}

export const useBeliefStore = create<BeliefState>((set) => ({
  nodes: [],
  edges: [],
  viewState: { offsetX: 0, offsetY: 0, scale: 1 },
  selectedNodeId: null,
  focusNodeId: null,

  setViewState: (partial) =>
    set((s) => ({ viewState: { ...s.viewState, ...partial } })),

  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),
  updateNode: (id, partial) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, ...partial, updatedAt: new Date() } : n
      ),
    })),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      focusNodeId: s.focusNodeId === id ? null : s.focusNodeId,
    })),

  selectNode: (id) => set({ selectedNodeId: id }),
  setFocusNode: (id) => set({ focusNodeId: id }),

  setEdges: (edges) => set({ edges }),
  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),
  removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),
}))
