// Every payload includes eventVersion — bump it if a shape must change mid-hackathon
// instead of silently breaking the other team's listener (ICD §7).
interface EventEnvelope {
    eventVersion: 1;
}

// ── 3.1 QuotationUpdated — Team A publishes, Team B (risk-engine, upsell-engine) consumes ──
export interface QuotationUpdatedPayload extends EventEnvelope {
    quotationId: string;
    customerId: string;
    customerTier: 'Bronze' | 'Silver' | 'Gold';
    salesRepId: string;
    lines: {
        lineId: string;
        productId: string;
        category: 'Hardware' | 'Services' | 'Subscriptions';
        qty: number;
        unitPrice: number;
        discountPct: number; // whole number, e.g. 12 = 12%
        categoryMaxDiscountPct: number;
    }[];
    timestamp: string; // ISO8601
}

// ── 3.2 RiskScoreComputed — Team B publishes, Team A (quotation, approval) consumes ──
export interface RiskScoreComputedPayload extends EventEnvelope {
    quotationId: string;
    blendedRiskScore: number;
    requiresApproval: boolean;
    requiresFinance: boolean;
    flaggedLines: string[];
    reason: string;
    computedAt: string;
}

// ── 3.3 ApprovalRequired — Team A internal (approval.service → audit-log) ──
export interface ApprovalRequiredPayload extends EventEnvelope {
    quotationId: string;
    requiresFinance: boolean;
    reason: string;
    flaggedLines: string[];
    triggeredAt: string;
}

// ── 3.4 QuotationApproved — Team A publishes, Team A fulfillment + Team B optimizer (post-MVP) consume ──
export interface QuotationApprovedPayload extends EventEnvelope {
    quotationId: string;
    approvedLines: { productId: string; qtyOrdered: number }[];
    approvedAt: string;
}

// ── 3.5 SplitSuggested — Team A (basic) or Team B (optimized), same shape either way ──
export interface SplitSuggestedPayload extends EventEnvelope {
    quotationId: string;
    splits: { warehouseId: string; warehouseName: string; qty: number; estCost: number }[];
    generatedBy: 'core-rule' | 'smart-optimizer';
}

// ── 3.6 Upsell request/response — same pattern as 3.1/3.2 ──
export interface UpsellSuggestionsRequestedPayload extends EventEnvelope {
    quotationId: string;
    candidateProducts: { productId: string; category: string }[];
    marginData: { productId: string; marginPct: number }[];
}

export interface UpsellSuggestionsReadyPayload extends EventEnvelope {
    quotationId: string;
    suggestions: { productId: string; marginDelta: number; rank: number }[];
    computedAt: string;
}

// ── 3.7 NegotiationSubmitted — Team A only, re-enters the pipeline via QuotationUpdated ──
export interface NegotiationSubmittedPayload extends EventEnvelope {
    quotationId: string;
    customerId: string;
    requestedChanges: { lineId: string; newDiscountPct: number }[];
    submittedAt: string;
}

// ── 3.8 DealHealthFlagRaised — Team B publishes (scheduled job + on QuotationUpdated) ──
export interface DealHealthFlagRaisedPayload extends EventEnvelope {
    quotationId: string;
    flagType: 'stalled' | 'discount_anomaly' | 'delivery_slippage';
    severity: 'low' | 'medium' | 'high';
    detail: string;
    detectedAt: string;
}

// Map of event name → payload type — this is what makes event-bus.ts type-safe
export interface EventPayloadMap {
    QuotationUpdated: QuotationUpdatedPayload;
    RiskScoreComputed: RiskScoreComputedPayload;
    ApprovalRequired: ApprovalRequiredPayload;
    QuotationApproved: QuotationApprovedPayload;
    SplitSuggested: SplitSuggestedPayload;
    UpsellSuggestionsRequested: UpsellSuggestionsRequestedPayload;
    UpsellSuggestionsReady: UpsellSuggestionsReadyPayload;
    NegotiationSubmitted: NegotiationSubmittedPayload;
    DealHealthFlagRaised: DealHealthFlagRaisedPayload;
}

export type EventName = keyof EventPayloadMap;