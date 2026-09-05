/**
 * DealFlow360 Business Logic & Financial Calculations (Step 7)
 * Follows ICD §7 standard:
 * - Whole number percentages (e.g. 12 means 12%, never 0.12)
 * - Currency rounded to 2 decimal places
 */

export interface CalculationLine {
    lineId?: string;
    productId?: string;
    qty: number;
    unitPrice: number;
    discountPct: number; // e.g. 15 for 15%
    taxPct?: number; // e.g. 18 for 18%
    categoryMaxDiscountPct?: number; // e.g. 15 for Hardware, 10 for Services
    customerTierMaxDiscountPct?: number; // e.g. 5 for Bronze, 10 for Silver, 15 for Gold
    costPrice?: number; // estimated cost to calculate gross margin
}

export interface QuotationCalculationSummary {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    blendedDiscountPct: number;
    overallMarginPct: number;
    flaggedLineCount: number;
}

export interface BlendedRiskAssessment {
    blendedRiskScore: number; // 0.00 to 1.00
    requiresApproval: boolean;
    requiresFinance: boolean;
    flaggedLineIds: string[];
    reasons: string[];
}

/**
 * 1. Line-level breakdown: gross, discount, tax, net totals & limit violation check
 */
export function calculateLineTotals(line: CalculationLine) {
    const gross = line.qty * line.unitPrice;
    const discountAmount = gross * (line.discountPct / 100);
    const net = gross - discountAmount;
    const taxPct = line.taxPct ?? 0;
    const taxAmount = net * (taxPct / 100);
    const total = net + taxAmount;

    // Check if line breaches category or customer ceiling
    const limit = line.categoryMaxDiscountPct ?? line.customerTierMaxDiscountPct ?? 10;
    const excessDiscount = Math.max(0, line.discountPct - limit);
    const isBreached = excessDiscount > 0;

    // Margin on this line
    const cost = (line.costPrice ?? line.unitPrice * 0.6) * line.qty; // default 40% margin if cost unspecified
    const marginAmount = net - cost;
    const marginPct = net > 0 ? (marginAmount / net) * 100 : 0;

    return {
        gross: Number(gross.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        net: Number(net.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        total: Number(total.toFixed(2)),
        marginPct: Number(marginPct.toFixed(2)),
        isBreached,
        excessDiscount,
    };
}

/**
 * 2. Quotation-level summary with live gross margin indicator
 */
export function calculateQuotationTotals(lines: CalculationLine[]): QuotationCalculationSummary {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let totalCost = 0;
    let flaggedLineCount = 0;

    for (const line of lines) {
        const lineCalc = calculateLineTotals(line);
        subtotal += lineCalc.gross;
        discountAmount += lineCalc.discountAmount;
        taxAmount += lineCalc.taxAmount;
        totalCost += (line.costPrice ?? line.unitPrice * 0.6) * line.qty;

        if (lineCalc.isBreached) {
            flaggedLineCount++;
        }
    }

    const netTotal = subtotal - discountAmount;
    const grandTotal = netTotal + taxAmount;
    const blendedDiscountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
    const overallMarginPct = netTotal > 0 ? ((netTotal - totalCost) / netTotal) * 100 : 0;

    return {
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
        blendedDiscountPct: Number(blendedDiscountPct.toFixed(2)),
        overallMarginPct: Number(overallMarginPct.toFixed(2)),
        flaggedLineCount,
    };
}

/**
 * 3. Blended Discount Risk Engine (ICD §3.2, Fallback Contract §5 & Problem Statement §10)
 * Evaluates individual line violations and total pattern across the quotation.
 */
export function calculateBlendedRisk(lines: CalculationLine[]): BlendedRiskAssessment {
    if (lines.length === 0) {
        return {
            blendedRiskScore: 0,
            requiresApproval: false,
            requiresFinance: false,
            flaggedLineIds: [],
            reasons: [],
        };
    }

    const flaggedLineIds: string[] = [];
    const reasons: string[] = [];
    let totalWeightedExcess = 0;
    let totalGross = 0;
    let maxLineDiscount = 0;

    for (const line of lines) {
        const gross = line.qty * line.unitPrice;
        totalGross += gross;
        maxLineDiscount = Math.max(maxLineDiscount, line.discountPct);

        const limit = line.categoryMaxDiscountPct ?? 10;
        if (line.discountPct > limit) {
            const pointsOver = line.discountPct - limit;
            totalWeightedExcess += pointsOver * gross;
            if (line.lineId) flaggedLineIds.push(line.lineId);
            reasons.push(`Line with discount ${line.discountPct}% exceeds ceiling of ${limit}% by ${pointsOver} pts`);
        }
    }

    // Normalized blended risk score between 0.00 and 1.00
    const weightedAverageExcess = totalGross > 0 ? totalWeightedExcess / totalGross : 0;
    const rawScore = Math.min(1.0, weightedAverageExcess / 15); // 15 pts excess corresponds to maximum risk
    const blendedRiskScore = Number(rawScore.toFixed(2));

    // Approval routing rules:
    // Any line violation OR blended score > 0.30 OR max discount > 5% requires Manager
    const requiresApproval = flaggedLineIds.length > 0 || blendedRiskScore > 0.3 || maxLineDiscount > 5;

    // High risk discounts (> 15% discount or blended score > 0.65) require Finance review
    const requiresFinance = maxLineDiscount > 15 || blendedRiskScore > 0.65;

    return {
        blendedRiskScore,
        requiresApproval,
        requiresFinance,
        flaggedLineIds,
        reasons,
    };
}

/**
 * 4. Margin Delta Calculator for Upsell Suggestions (Brief B5 & ICD §3.6)
 * Calculates the exact margin percentage impact (+/- delta points) if an upsell item is added.
 */
export function calculateMarginDelta(
    currentLines: CalculationLine[],
    suggestedItem: { qty: number; unitPrice: number; discountPct: number; costPrice?: number }
): { currentMarginPct: number; newMarginPct: number; marginDelta: number } {
    const current = calculateQuotationTotals(currentLines);
    const newLines = [...currentLines, suggestedItem];
    const updated = calculateQuotationTotals(newLines);

    const marginDelta = Number((updated.overallMarginPct - current.overallMarginPct).toFixed(2));

    return {
        currentMarginPct: current.overallMarginPct,
        newMarginPct: updated.overallMarginPct,
        marginDelta,
    };
}

/**
 * 5. Subscription Proration & Credit Note Calculation (Brief B7 & §5)
 * Calculates unused days for refunds or credit notes on mid-cycle adjustments.
 */
export function calculateProratedCredit(
    recurringPlanAmount: number,
    daysUsed: number,
    daysInPeriod: number = 30
): { dailyRate: number; usedAmount: number; creditRefundAmount: number } {
    if (daysInPeriod <= 0) {
        return { dailyRate: 0, usedAmount: 0, creditRefundAmount: 0 };
    }

    const dailyRate = recurringPlanAmount / daysInPeriod;
    const usedAmount = dailyRate * Math.min(daysUsed, daysInPeriod);
    const creditRefundAmount = Math.max(0, recurringPlanAmount - usedAmount);

    return {
        dailyRate: Number(dailyRate.toFixed(2)),
        usedAmount: Number(usedAmount.toFixed(2)),
        creditRefundAmount: Number(creditRefundAmount.toFixed(2)),
    };
}
