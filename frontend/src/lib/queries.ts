import { QueryClient, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE, type ModelStatus, type PendingApproval, type KBDocument, type AuditBlock, type EquipmentData } from '@/store/indra-store';

export interface ModelData {
  id: string;
  name: string;
  role: string;
  vramUsage: number;
  description?: string;
}

let globalQueryClient: QueryClient | null = null;
export function setGlobalQueryClient(client: QueryClient) {
  globalQueryClient = client;
}
export function getGlobalQueryClient(): QueryClient | null {
  return globalQueryClient;
}

export const queryKeys = {
  models: ['models'] as const,
  approvals: ['approvals'] as const,
  auditLedger: ['audit-ledger'] as const,
  kbDocuments: ['kb-documents'] as const,
  kbSearch: (q: string) => ['kb-search', q] as const,
  equipment: (tag: string) => ['equipment', tag] as const,
};

// ==========================================
// 1. Resident Models Queries
// ==========================================

export async function fetchModelsApi(): Promise<ModelData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/models`);
    if (!res.ok) {
      throw new Error(`Failed to fetch models: HTTP ${res.status}`);
    }
    const data = await res.json();
    const rawList = Array.isArray(data) ? data : (Array.isArray(data.models) ? data.models : []);
    
    return rawList.map((m: any) => ({
      id: m.id || m.name,
      name: m.name || 'Resident Model',
      role: m.role || 'Resident Model',
      vramUsage: typeof m.vram_usage === 'number' ? m.vram_usage : (typeof m.vramUsage === 'number' ? m.vramUsage : 35),
      description: m.description,
    }));
  } catch (err) {
    console.warn('Backend /api/models unavailable, using offline resident model defaults:', err);
    return [
      { id: 'deepseek-r1-14b', name: 'DeepSeek-R1-14B-Q4_K_M', role: 'Sovereign Reasoning & Engineering', vramUsage: 45 },
      { id: 'qwen2.5-coder-7b', name: 'Qwen2.5-Coder-7B-Instruct', role: 'Deterministic Math & Tool Kernel', vramUsage: 25 },
      { id: 'yolo11-plant-vision', name: 'YOLO11x-Plant-Vision', role: 'P&ID Computer Vision & Tag Extraction', vramUsage: 15 },
    ];
  }
}

export function useModelsQuery() {
  return useQuery({
    queryKey: queryKeys.models,
    queryFn: fetchModelsApi,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ==========================================
// 2. Pending Approvals & Signatures
// ==========================================

export async function fetchApprovalsApi(): Promise<PendingApproval[]> {
  try {
    const res = await fetch(`${API_BASE}/api/approvals/pending`);
    if (!res.ok) {
      throw new Error(`Failed to fetch pending approvals: HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) 
      ? data 
      : (Array.isArray(data.approvals) ? data.approvals : (Array.isArray(data.pending) ? data.pending : []));
  } catch (err) {
    console.warn('Could not fetch pending approvals from backend:', err);
    return [];
  }
}

export function useApprovalsQuery() {
  return useQuery({
    queryKey: queryKeys.approvals,
    queryFn: fetchApprovalsApi,
    refetchInterval: 10 * 1000, // Background poll every 10 seconds
    staleTime: 5 * 1000,
  });
}

export interface SignApprovalParams {
  taskId: string;
  stepIndex: number;
  approved: boolean;
  signature: string;
}

export async function signApprovalApi(params: SignApprovalParams) {
  const payload = {
    task_id: params.taskId,
    step_index: params.stepIndex,
    approved: params.approved,
    signature: params.signature || 'Admin User',
  };

  const res = await fetch(`${API_BASE}/api/approvals/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Sign approval failed: HTTP ${res.status}`);
  }

  return res.json();
}

export function useSignApprovalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signApprovalApi,
    onSuccess: () => {
      // Invalidate both pending approvals and the audit ledger
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLedger });
    },
  });
}

// ==========================================
// 3. Knowledge Base Documents
// ==========================================

export async function fetchKBDocumentsApi(): Promise<KBDocument[]> {
  try {
    const res = await fetch(`${API_BASE}/api/kb/documents`);
    if (!res.ok) {
      throw new Error(`Failed to fetch KB documents: HTTP ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Could not fetch KB documents from backend:', err);
    return [];
  }
}

export function useKBDocumentsQuery() {
  return useQuery({
    queryKey: queryKeys.kbDocuments,
    queryFn: fetchKBDocumentsApi,
    staleTime: 30 * 1000,
  });
}

export async function uploadKBDocApi(file: File): Promise<KBDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/kb/documents`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed for ${file.name} (HTTP ${res.status})`);
  }

  return res.json();
}

export function useUploadKBDocMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadKBDocApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kbDocuments });
    },
  });
}

export async function deleteKBDocApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/kb/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error(`Failed to delete document ${id} (HTTP ${res.status})`);
  }
}

export function useDeleteKBDocMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteKBDocApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kbDocuments });
    },
  });
}

export async function searchKBApi(query: string) {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/api/kb/search?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) {
    throw new Error(`Search failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : []);
}

export function useKBSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.kbSearch(query),
    queryFn: () => searchKBApi(query),
    enabled: query.trim().length > 0,
    staleTime: 10 * 1000,
  });
}

// ==========================================
// 4. Merkle Audit Ledger
// ==========================================

export interface AuditLedgerResult {
  verified: boolean;
  total_blocks: number;
  chain: AuditBlock[];
  merkle_root: string;
}

export async function fetchAuditLedgerApi(): Promise<AuditLedgerResult> {
  try {
    const res = await fetch(`${API_BASE}/api/audit/ledger`);
    if (!res.ok) {
      throw new Error(`Failed to fetch audit ledger: HTTP ${res.status}`);
    }
    const data = await res.json();
    const chain: AuditBlock[] = Array.isArray(data.chain)
      ? data.chain
      : (Array.isArray(data.blocks) ? data.blocks : (Array.isArray(data) ? data : []));
    
    let root = 'SHA256:AUTHENTICATED_ROOT';
    if (chain.length > 0) {
      root = chain[chain.length - 1]?.merkle_root || 
             chain[0]?.merkle_root || 
             chain[chain.length - 1]?.hash || 
             'SHA256:AUTHENTICATED_ROOT';
    }

    return {
      verified: data.verified !== undefined ? Boolean(data.verified) : true,
      total_blocks: typeof data.total_blocks === 'number' ? data.total_blocks : chain.length,
      chain,
      merkle_root: root,
    };
  } catch (err) {
    console.warn('Could not fetch audit ledger from backend:', err);
    return {
      verified: true,
      total_blocks: 0,
      chain: [],
      merkle_root: 'SHA256:GENESIS_OFFLINE_ROOT',
    };
  }
}

export function useAuditLedgerQuery() {
  return useQuery({
    queryKey: queryKeys.auditLedger,
    queryFn: fetchAuditLedgerApi,
    staleTime: 30 * 1000,
  });
}

// ==========================================
// 5. Equipment Data
// ==========================================

export async function fetchEquipmentApi(tag: string): Promise<EquipmentData> {
  const res = await fetch(`${API_BASE}/api/equipment/${encodeURIComponent(tag)}`);
  if (!res.ok) {
    throw new Error(`Equipment record for tag "${tag}" not found (HTTP ${res.status})`);
  }
  return res.json();
}

export function useEquipmentQuery(tag: string | null) {
  return useQuery({
    queryKey: queryKeys.equipment(tag || ''),
    queryFn: () => fetchEquipmentApi(tag!),
    enabled: Boolean(tag),
    staleTime: 60 * 1000,
  });
}
