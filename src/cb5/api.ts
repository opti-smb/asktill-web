import { getToken } from '../lib/api';
import type {
  DeliveryProof,
  EvidenceTemplate,
  LineageResponse,
  OrderProof,
  PacketOverview,
  PolicyProof,
  ServiceProof,
} from './types';

async function cb5Json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()?.trim();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(path, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as T & { detail?: string };
  if (!res.ok) {
    const err = new Error(body.detail || `CB5 request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function getActiveTemplate(reason: string, productType: string): Promise<EvidenceTemplate> {
  const params = new URLSearchParams({ reason, product_type: productType });
  return cb5Json<EvidenceTemplate>(`/api/cb5/templates/active?${params.toString()}`);
}

export async function publishTemplateVersion(
  templateId: string,
  requirements: EvidenceTemplate['requirements'],
): Promise<EvidenceTemplate> {
  return cb5Json<EvidenceTemplate>(`/api/cb5/templates/${encodeURIComponent(templateId)}/versions`, {
    method: 'POST',
    body: JSON.stringify({ requirements }),
  });
}

export async function buildEvidencePacket(
  caseId: string,
  productType: string,
  finalDecision = 'FIGHT',
): Promise<PacketOverview> {
  return cb5Json<PacketOverview>(`/api/cb5/cases/${encodeURIComponent(caseId)}/build`, {
    method: 'POST',
    body: JSON.stringify({ product_type: productType, final_decision: finalDecision }),
  });
}

export async function getEvidencePacket(caseId: string): Promise<PacketOverview> {
  return cb5Json<PacketOverview>(`/api/cb5/cases/${encodeURIComponent(caseId)}/packet`);
}

export async function getEvidenceLineage(caseId: string): Promise<LineageResponse> {
  return cb5Json<LineageResponse>(`/api/cb5/cases/${encodeURIComponent(caseId)}/lineage`);
}

export async function getOrderProof(caseId: string): Promise<OrderProof> {
  return cb5Json<OrderProof>(`/api/cb5/cases/${encodeURIComponent(caseId)}/order`);
}

export async function refreshOrderProof(caseId: string): Promise<OrderProof> {
  return cb5Json<OrderProof>(`/api/cb5/cases/${encodeURIComponent(caseId)}/order/refresh`, { method: 'POST', body: '{}' });
}

export async function getDeliveryProof(caseId: string): Promise<DeliveryProof> {
  return cb5Json<DeliveryProof>(`/api/cb5/cases/${encodeURIComponent(caseId)}/delivery`);
}

export async function refreshDeliveryProof(caseId: string): Promise<DeliveryProof> {
  return cb5Json<DeliveryProof>(`/api/cb5/cases/${encodeURIComponent(caseId)}/delivery/refresh`, {
    method: 'POST',
    body: '{}',
  });
}

export async function getServiceProof(caseId: string): Promise<ServiceProof> {
  return cb5Json<ServiceProof>(`/api/cb5/cases/${encodeURIComponent(caseId)}/service`);
}

export async function refreshServiceProof(caseId: string): Promise<ServiceProof> {
  return cb5Json<ServiceProof>(`/api/cb5/cases/${encodeURIComponent(caseId)}/service/refresh`, {
    method: 'POST',
    body: '{}',
  });
}

export async function getPolicyProof(caseId: string): Promise<PolicyProof> {
  return cb5Json<PolicyProof>(`/api/cb5/cases/${encodeURIComponent(caseId)}/policy`);
}

export async function resolvePolicyProof(caseId: string): Promise<PolicyProof> {
  return cb5Json<PolicyProof>(`/api/cb5/cases/${encodeURIComponent(caseId)}/policy/resolve`, {
    method: 'POST',
    body: '{}',
  });
}

export async function markEvidenceReviewed(caseId: string): Promise<PacketOverview> {
  return cb5Json<PacketOverview>(`/api/cb5/cases/${encodeURIComponent(caseId)}/review`, {
    method: 'POST',
    body: '{}',
  });
}
