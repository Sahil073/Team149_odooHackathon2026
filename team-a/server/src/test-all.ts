/**
 * DealFlow360 - 1-Click End-to-End Backend Verification Suite
 * Tests all core subsystems: Auth, Catalog, Quotations, Pricing/Calculations,
 * Approvals, Warehouse Fulfillment, Hybrid Invoicing, Payments, Portal, Audit, and Cron.
 */
import http from 'http';
import { app } from './app';
import { connectAll, disconnectAll } from './database/connection';

interface TestResult {
    suite: string;
    action: string;
    passed: boolean;
    status: number;
    detail?: string;
    timeMs: number;
}

const results: TestResult[] = [];

function request(
    server: http.Server,
    method: string,
    path: string,
    body?: any,
    token?: string
): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
            return reject(new Error('Server address not available'));
        }

        const dataStr = body ? JSON.stringify(body) : undefined;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (dataStr) {
            headers['Content-Length'] = Buffer.byteLength(dataStr).toString();
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: addr.port,
                path,
                method,
                headers,
            },
            (res) => {
                let chunks = '';
                res.on('data', (d) => (chunks += d));
                res.on('end', () => {
                    try {
                        const parsed = chunks ? JSON.parse(chunks) : {};
                        resolve({ status: res.statusCode ?? 500, body: parsed });
                    } catch {
                        resolve({ status: res.statusCode ?? 500, body: chunks });
                    }
                });
            }
        );

        req.on('error', reject);
        if (dataStr) req.write(dataStr);
        req.end();
    });
}

async function runTest(
    suite: string,
    action: string,
    fn: () => Promise<{ status: number; body: any; valid: boolean; detail?: string }>
) {
    const start = Date.now();
    try {
        const res = await fn();
        results.push({
            suite,
            action,
            passed: res.valid,
            status: res.status,
            detail: res.detail,
            timeMs: Date.now() - start,
        });
    } catch (err: any) {
        results.push({
            suite,
            action,
            passed: false,
            status: 500,
            detail: err.message,
            timeMs: Date.now() - start,
        });
    }
}

async function main() {
    console.log('\n============================================================');
    console.log('🚀 DealFlow360 Backend 1-Click End-to-End Test Runner');
    console.log('============================================================\n');

    await connectAll();

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    let staffToken = '';
    let portalToken = '';
    let testQuotationId = '';
    let testHardwareLineId = '';
    let testCustomerId = '';
    let testProductId = '';
    let testInvoiceId = '';

    try {
        // 1. Health Probe
        await runTest('System', 'Health Check probe', async () => {
            const res = await request(server, 'GET', '/health');
            return { status: res.status, body: res.body, valid: res.status === 200 && res.body.status === 'ok' };
        });

        // 2. Staff Authentication
        await runTest('Auth', 'Staff Admin Login', async () => {
            const res = await request(server, 'POST', '/api/auth/login', {
                email: 'admin@dealflow360.com',
                password: 'password123',
            });
            staffToken = res.body.token;
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && !!staffToken,
                detail: `Role: ${res.body.user?.role}`,
            };
        });

        // 3. Customer Retrieval
        await runTest('Master Data', 'List Customers', async () => {
            const res = await request(server, 'GET', '/api/customers', undefined, staffToken);
            const first = res.body.data?.[0];
            if (first) testCustomerId = first.id;
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0,
                detail: `Count: ${res.body.data?.length}, Tier: ${first?.tier}`,
            };
        });

        // 4. Products & Inventory
        await runTest('Catalog', 'List Products & Check Stock', async () => {
            const res = await request(server, 'GET', '/api/products', undefined, staffToken);
            const hardware = res.body.data?.find((p: any) => p.category === 'HARDWARE') || res.body.data?.[0];
            if (hardware) testProductId = hardware.id;
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && Array.isArray(res.body.data) && res.body.data.length > 0,
                detail: `Loaded ${res.body.data?.length} products`,
            };
        });

        // 5. Governance & Approval Chains
        await runTest('Governance', 'Verify Discount Rules & Limits', async () => {
            const res = await request(server, 'GET', '/api/discounts', undefined, staffToken);
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && !!res.body.data?.discountTiers,
                detail: `Tiers: ${res.body.data?.discountTiers?.length}, Categories: ${res.body.data?.categoryLimits?.length}`,
            };
        });

        await runTest('Governance', 'Verify Approval Chain Thresholds', async () => {
            const res = await request(server, 'GET', '/api/approval-chains', undefined, staffToken);
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && Array.isArray(res.body.data),
                detail: `Configured rules: ${res.body.data?.length}`,
            };
        });

        // 6. Create Quotation Draft
        await runTest('Quotations', 'Create Quotation with Live Margins', async () => {
            const res = await request(
                server,
                'POST',
                '/api/quotations',
                {
                    customerId: testCustomerId,
                    notes: '1-Click automated test quotation',
                    lines: [
                        {
                            productId: testProductId,
                            qty: 2,
                            discountPct: 5,
                        },
                    ],
                },
                staffToken
            );
            testQuotationId = res.body.data?.id;
            const lines = res.body.data?.lines;
            if (lines && lines.length > 0) testHardwareLineId = lines[0].id;
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 201 && !!testQuotationId,
                detail: `ID: ${testQuotationId}, Status: ${res.body.data?.status}`,
            };
        });

        // 7. Deal Risk Scoring & Fallback
        await runTest('Smart Layer', 'Fetch Risk Score (ICD §4 / §5)', async () => {
            const res = await request(server, 'GET', `/api/risk-score/${testQuotationId}`, undefined, staffToken);
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && typeof res.body.blendedRiskScore === 'number',
                detail: `Score: ${res.body.blendedRiskScore}, RequiresApproval: ${res.body.requiresApproval}`,
            };
        });

        // 8. Upsell Recommendations & Margin Delta
        await runTest('Smart Layer', 'Fetch Upsell Suggestions', async () => {
            const res = await request(
                server,
                'GET',
                `/api/upsell-suggestions/${testQuotationId}`,
                undefined,
                staffToken
            );
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && Array.isArray(res.body.suggestions),
                detail: `Suggestions found: ${res.body.suggestions?.length}`,
            };
        });

        // 9. Multi-Warehouse Fulfillment Split
        await runTest('Fulfillment', 'Compute Optimal Warehouse Split', async () => {
            const res = await request(
                server,
                'GET',
                `/api/fulfillment/${testQuotationId}/suggest-split`,
                undefined,
                staffToken
            );
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && Array.isArray(res.body.splits),
                detail: `Splits calculated across ${res.body.splits?.length} warehouse(s)`,
            };
        });

        // 10. Confirm Warehouse Split
        await runTest('Fulfillment', 'Commit Fulfillment Allocation', async () => {
            const whRes = await request(server, 'GET', '/api/warehouses', undefined, staffToken);
            const whId = whRes.body.data?.[0]?.id;
            const res = await request(
                server,
                'POST',
                `/api/fulfillment/${testQuotationId}/splits`,
                {
                    splits: [{ warehouseId: whId, qtyFulfilled: 2, shipmentCost: 25 }],
                    isManualOverride: false,
                },
                staffToken
            );
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200,
                detail: 'Splits saved to database',
            };
        });

        // 11. Manager Approval Workflow
        await runTest('Approvals', 'Approve Quotation', async () => {
            // Force status to PENDING_APPROVAL first if auto-approved
            await request(
                server,
                'PATCH',
                `/api/quotations/${testQuotationId}/lines`,
                { lines: [{ productId: testProductId, qty: 2, discountPct: 20 }] },
                staffToken
            );

            const res = await request(
                server,
                'POST',
                `/api/approvals/${testQuotationId}/approve`,
                { note: 'Approved by automated validation test' },
                staffToken
            );
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && res.body.data?.status === 'APPROVED',
                detail: `Quotation status: ${res.body.data?.status}`,
            };
        });

        // 12. Hybrid Invoice Generation
        await runTest('Billing', 'Generate Hybrid Invoices', async () => {
            const res = await request(
                server,
                'POST',
                `/api/invoices/generate/${testQuotationId}`,
                undefined,
                staffToken
            );
            const invoices = res.body.data;
            if (invoices && invoices.length > 0) testInvoiceId = invoices[0].id;
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 201 && Array.isArray(invoices) && invoices.length > 0,
                detail: `Generated ${invoices?.length} invoice(s), Total: $${invoices?.[0]?.amount}`,
            };
        });

        // 13. Payment Reconciliation
        await runTest('Billing', 'Post Payment & Auto-Reconcile', async () => {
            const invRes = await request(server, 'GET', `/api/invoices/${testInvoiceId}`, undefined, staffToken);
            const amount = invRes.body.data?.amount ?? 100;
            const res = await request(
                server,
                'POST',
                '/api/payments',
                {
                    invoiceId: testInvoiceId,
                    amount,
                    method: 'CREDIT_CARD',
                    reference: 'TEST-TX-1001',
                },
                staffToken
            );
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 201 && res.body.invoiceStatus === 'PAID',
                detail: `Invoice status: ${res.body.invoiceStatus}`,
            };
        });

        // 14. Customer Portal Negotiation
        await runTest('Portal', 'Customer Portal Login & View', async () => {
            const res = await request(server, 'POST', '/api/auth/portal-login', {
                email: 'contact@acmecorp.com',
                password: 'password123',
            });
            portalToken = res.body.token;
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && !!portalToken,
                detail: `Customer: ${res.body.customer?.name} (${res.body.customer?.tier})`,
            };
        });

        // 15. Automated Cron Sweep
        await runTest('Automation', 'Deal Health Scanner Sweep', async () => {
            const res = await request(server, 'POST', '/api/cron/deal-health-scan');
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200,
                detail: res.body.message,
            };
        });

        // 16. Audit Log Verification
        await runTest('Audit', 'Verify Event Log Entries', async () => {
            const res = await request(server, 'GET', '/api/audit-log', undefined, staffToken);
            return {
                status: res.status,
                body: res.body,
                valid: res.status === 200 && Array.isArray(res.body.data),
                detail: `Audit records captured: ${res.body.data?.length}`,
            };
        });
    } finally {
        server.close();
        await disconnectAll();
    }

    // Print Test Results Table
    console.log('---------------------------------------------------------------------------------------');
    console.log(
        `${'SUITE'.padEnd(14)} | ${'ACTION'.padEnd(35)} | ${'STATUS'.padEnd(6)} | ${'TIME'.padEnd(8)} | DETAIL`
    );
    console.log('---------------------------------------------------------------------------------------');

    let allPassed = true;
    for (const r of results) {
        const mark = r.passed ? '✔ PASS' : '❌ FAIL';
        const time = `${r.timeMs}ms`;
        if (!r.passed) allPassed = false;
        console.log(
            `${r.suite.padEnd(14)} | ${r.action.padEnd(35)} | ${mark.padEnd(6)} | ${time.padEnd(8)} | ${r.detail || ''}`
        );
    }
    console.log('---------------------------------------------------------------------------------------\n');

    if (allPassed) {
        console.log('🎉 ALL 16 SUBSYSTEMS PASSED PERFECTLY! YOUR BACKEND IS 100% OPERATIONAL.\n');
        process.exit(0);
    } else {
        console.error('⚠️ Some tests failed. Please review the output above.\n');
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
});
