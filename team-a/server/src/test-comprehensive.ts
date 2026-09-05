import http from 'http';
import fs from 'fs';
import path from 'path';
import { app } from './app';
import { connectAll, disconnectAll } from './database/connection';
import { prisma } from './config/database';

interface EndpointReport {
    category: string;
    method: string;
    endpoint: string;
    status: number;
    passed: boolean;
    durationMs: number;
    responseSnippet: string;
    notes?: string;
}

const reports: EndpointReport[] = [];

function request(
    server: http.Server,
    method: string,
    reqPath: string,
    body?: any,
    token?: string
): Promise<{ status: number; body: any; raw: string; duration: number }> {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
            return reject(new Error('Server address unavailable'));
        }

        const dataStr = body !== undefined ? JSON.stringify(body) : undefined;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (dataStr) {
            headers['Content-Length'] = Buffer.byteLength(dataStr).toString();
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const start = Date.now();
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: addr.port,
                path: reqPath,
                method,
                headers,
            },
            (res) => {
                let chunks = '';
                res.on('data', (d) => (chunks += d));
                res.on('end', () => {
                    const duration = Date.now() - start;
                    try {
                        const parsed = chunks ? JSON.parse(chunks) : {};
                        resolve({ status: res.statusCode ?? 500, body: parsed, raw: chunks, duration });
                    } catch {
                        resolve({ status: res.statusCode ?? 500, body: chunks, raw: chunks, duration });
                    }
                });
            }
        );

        req.on('error', reject);
        if (dataStr) req.write(dataStr);
        req.end();
    });
}

async function recordTest(
    server: http.Server,
    category: string,
    method: string,
    endpoint: string,
    body?: any,
    token?: string,
    expectedStatuses: number[] = [200, 201]
): Promise<{ status: number; body: any }> {
    try {
        const res = await request(server, method, endpoint, body, token);
        const passed = expectedStatuses.includes(res.status);
        const snippet = typeof res.body === 'object' ? JSON.stringify(res.body).substring(0, 140) : String(res.body).substring(0, 140);

        reports.push({
            category,
            method,
            endpoint,
            status: res.status,
            passed,
            durationMs: res.duration,
            responseSnippet: snippet,
            notes: passed ? 'OK' : `Unexpected status: expected ${expectedStatuses.join('|')}, received ${res.status}`,
        });

        return { status: res.status, body: res.body };
    } catch (err: any) {
        reports.push({
            category,
            method,
            endpoint,
            status: 500,
            passed: false,
            durationMs: 0,
            responseSnippet: err.message,
            notes: `Error: ${err.message}`,
        });
        return { status: 500, body: {} };
    }
}

async function runComprehensiveAudit() {
    console.log('\n============================================================');
    console.log('🔍 DealFlow360 - Comprehensive 100% Endpoint API Audit');
    console.log('============================================================\n');

    await connectAll();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
        // 1. Health Probe
        await recordTest(server, 'System', 'GET', '/health');

        // 2. Auth Endpoints
        const adminLogin = await recordTest(
            server,
            'Auth',
            'POST',
            '/api/auth/login',
            { email: 'admin@dealflow360.com', password: 'password123' },
            undefined,
            [200]
        );
        const adminToken = adminLogin.body?.token;

        const repLogin = await recordTest(
            server,
            'Auth',
            'POST',
            '/api/auth/login',
            { email: 'rep@dealflow360.com', password: 'password123' },
            undefined,
            [200]
        );
        const repToken = repLogin.body?.token;

        const managerLogin = await recordTest(
            server,
            'Auth',
            'POST',
            '/api/auth/login',
            { email: 'manager@dealflow360.com', password: 'password123' },
            undefined,
            [200]
        );
        const managerToken = managerLogin.body?.token;

        const portalLogin = await recordTest(
            server,
            'Auth',
            'POST',
            '/api/auth/portal-login',
            { email: 'contact@acmecorp.com', password: 'password123' },
            undefined,
            [200]
        );
        const portalToken = portalLogin.body?.token;

        const tempEmail = `test.staff.${Date.now()}@dealflow360.com`;
        await recordTest(
            server,
            'Auth',
            'POST',
            '/api/auth/signup',
            { name: 'Audit Test Staff', email: tempEmail, password: 'password123', role: 'SALES_REP' },
            undefined,
            [201]
        );

        await recordTest(server, 'Auth', 'GET', '/api/auth/me', undefined, adminToken, [200]);

        // 3. Products
        const prodList = await recordTest(server, 'Products', 'GET', '/api/products', undefined, adminToken, [200]);
        const sampleProdId = prodList.body?.data?.[0]?.id || 'p-hardware-backup';

        await recordTest(server, 'Products', 'GET', '/api/products?category=HARDWARE', undefined, adminToken, [200]);
        await recordTest(server, 'Products', 'GET', `/api/products/${sampleProdId}`, undefined, adminToken, [200]);

        const tempProdCode = `p-audit-${Date.now()}`;
        const createdProd = await recordTest(
            server,
            'Products',
            'POST',
            '/api/products',
            {
                name: 'Audit Test Product',
                category: 'HARDWARE',
                price: 199.99,
                unit: 'unit',
                taxPct: 18,
                description: 'Temporary audit product',
            },
            adminToken,
            [201]
        );
        const newProdId = createdProd.body?.data?.id;

        if (newProdId) {
            await recordTest(
                server,
                'Products',
                'PATCH',
                `/api/products/${newProdId}`,
                { name: 'Updated Audit Test Product', price: 219.99 },
                adminToken,
                [200]
            );

            const addedVar = await recordTest(
                server,
                'Products',
                'POST',
                `/api/products/${newProdId}/variants`,
                { attribute: 'Color', value: 'Matte Black', extraPrice: 25 },
                adminToken,
                [201]
            );
            const varId = addedVar.body?.data?.id;

            if (varId) {
                await recordTest(
                    server,
                    'Products',
                    'DELETE',
                    `/api/products/${newProdId}/variants/${varId}`,
                    undefined,
                    adminToken,
                    [200]
                );
            }

            await recordTest(server, 'Products', 'DELETE', `/api/products/${newProdId}`, undefined, adminToken, [200]);
        }

        // 4. Customers
        const custList = await recordTest(server, 'Customers', 'GET', '/api/customers', undefined, adminToken, [200]);
        const sampleCustId = custList.body?.data?.[0]?.id || 'c-bronze-acme';

        await recordTest(server, 'Customers', 'GET', '/api/customers?tier=BRONZE', undefined, adminToken, [200]);
        await recordTest(server, 'Customers', 'GET', `/api/customers/${sampleCustId}`, undefined, adminToken, [200]);

        const tempCustEmail = `cust.${Date.now()}@audit.com`;
        const createdCust = await recordTest(
            server,
            'Customers',
            'POST',
            '/api/customers',
            { name: 'Audit Customer Corp', email: tempCustEmail, tier: 'SILVER' },
            adminToken,
            [201]
        );
        const newCustId = createdCust.body?.data?.id;

        if (newCustId) {
            await recordTest(
                server,
                'Customers',
                'PATCH',
                `/api/customers/${newCustId}`,
                { name: 'Audit Customer Corp Updated', tier: 'GOLD' },
                adminToken,
                [200]
            );

            await recordTest(server, 'Customers', 'DELETE', `/api/customers/${newCustId}`, undefined, adminToken, [200]);
        }

        // 5. Warehouses
        const whList = await recordTest(server, 'Warehouses', 'GET', '/api/warehouses', undefined, adminToken, [200]);
        const sampleWhId = whList.body?.data?.[0]?.id || 'w-main-warehouse';

        await recordTest(server, 'Warehouses', 'GET', `/api/warehouses/${sampleWhId}`, undefined, adminToken, [200]);

        const createdWh = await recordTest(
            server,
            'Warehouses',
            'POST',
            '/api/warehouses',
            { name: `Audit Warehouse ${Date.now()}`, location: 'Seattle West', costMultiplier: 1.1 },
            adminToken,
            [201]
        );
        const newWhId = createdWh.body?.data?.id;

        if (newWhId) {
            await recordTest(
                server,
                'Warehouses',
                'PATCH',
                `/api/warehouses/${newWhId}`,
                { costMultiplier: 1.25 },
                adminToken,
                [200]
            );

            await recordTest(server, 'Warehouses', 'DELETE', `/api/warehouses/${newWhId}`, undefined, adminToken, [200]);
        }

        // 6. Stock Levels
        await recordTest(server, 'Stock', 'GET', '/api/stock', undefined, adminToken, [200]);
        await recordTest(
            server,
            'Stock',
            'GET',
            `/api/stock/${sampleWhId}/${sampleProdId}`,
            undefined,
            adminToken,
            [200]
        );

        await recordTest(
            server,
            'Stock',
            'POST',
            '/api/stock',
            { warehouseId: sampleWhId, productId: sampleProdId, qtyAvailable: 50 },
            adminToken,
            [200, 201]
        );

        await recordTest(
            server,
            'Stock',
            'PATCH',
            `/api/stock/${sampleWhId}/${sampleProdId}`,
            { qtyAvailableDelta: 5 },
            adminToken,
            [200]
        );

        // 7. Pricing Lists
        const pricingList = await recordTest(server, 'Pricing', 'GET', '/api/pricing', undefined, adminToken, [200]);
        const samplePriceListId = pricingList.body?.data?.[0]?.id;

        if (samplePriceListId) {
            await recordTest(server, 'Pricing', 'GET', `/api/pricing/${samplePriceListId}`, undefined, adminToken, [200]);
        }

        const createdPl = await recordTest(
            server,
            'Pricing',
            'POST',
            '/api/pricing',
            {
                customerTier: 'SILVER',
                currency: 'USD',
                priceRule: 'Cost + 20% margin standard formula',
            },
            adminToken,
            [201]
        );
        const newPlId = createdPl.body?.data?.id;

        if (newPlId) {
            await recordTest(
                server,
                'Pricing',
                'PATCH',
                `/api/pricing/${newPlId}`,
                { priceRule: 'Cost + 25% updated formula' },
                adminToken,
                [200]
            );

            await recordTest(server, 'Pricing', 'DELETE', `/api/pricing/${newPlId}`, undefined, adminToken, [200]);
        }

        // 8. Discounts & Category Limits
        await recordTest(server, 'Discounts', 'GET', '/api/discounts', undefined, adminToken, [200]);

        const createdTier = await recordTest(
            server,
            'Discounts',
            'POST',
            '/api/discounts/tiers',
            { tierName: 'Platinum', maxDiscountPct: 25 },
            adminToken,
            [200, 201]
        );
        const createdTierId = createdTier.body?.data?.id;
        if (createdTierId) {
            await recordTest(server, 'Discounts', 'DELETE', `/api/discounts/tiers/${createdTierId}`, undefined, adminToken, [200]);
        }

        const createdCat = await recordTest(
            server,
            'Discounts',
            'POST',
            '/api/discounts/categories',
            { category: 'HARDWARE', maxDiscountPct: 20 },
            adminToken,
            [200, 201]
        );
        const createdCatId = createdCat.body?.data?.id;
        if (createdCatId) {
            await recordTest(server, 'Discounts', 'DELETE', `/api/discounts/categories/${createdCatId}`, undefined, adminToken, [200]);
        }

        // 9. Approval Chains Config
        const acList = await recordTest(server, 'Approval Chains', 'GET', '/api/approval-chains', undefined, adminToken, [200]);
        const createdRule = await recordTest(
            server,
            'Approval Chains',
            'POST',
            '/api/approval-chains',
            { discountRangeMin: 75, discountRangeMax: 100, requiresManager: true, requiresFinance: true },
            adminToken,
            [201]
        );
        const ruleId = createdRule.body?.data?.id;

        if (ruleId) {
            await recordTest(server, 'Approval Chains', 'DELETE', `/api/approval-chains/${ruleId}`, undefined, adminToken, [200]);
        }

        // 10. Upsell Rules Config
        const upsellList = await recordTest(server, 'Upsell Rules', 'GET', '/api/upsell-rules', undefined, adminToken, [200]);
        const prod2 = prodList.body?.data?.[1]?.id;

        if (prod2 && sampleProdId !== prod2) {
            const upRule = await recordTest(
                server,
                'Upsell Rules',
                'POST',
                '/api/upsell-rules',
                { baseProductId: sampleProdId, suggestedProductId: prod2, minMarginPct: 20, promoActive: true },
                adminToken,
                [200, 201]
            );
            const upRuleId = upRule.body?.data?.id;

            if (upRuleId) {
                await recordTest(
                    server,
                    'Upsell Rules',
                    'PATCH',
                    `/api/upsell-rules/${upRuleId}`,
                    { promoActive: false },
                    adminToken,
                    [200]
                );
                await recordTest(server, 'Upsell Rules', 'DELETE', `/api/upsell-rules/${upRuleId}`, undefined, adminToken, [200]);
            }
        }

        // 11. Quotations Core Engine
        await recordTest(server, 'Quotations', 'GET', '/api/quotations', undefined, adminToken, [200]);

        const quotationRes = await recordTest(
            server,
            'Quotations',
            'POST',
            '/api/quotations',
            {
                customerId: sampleCustId,
                lines: [{ productId: sampleProdId, qty: 3, discountPct: 5 }],
            },
            repToken,
            [201]
        );
        const qId = quotationRes.body?.data?.id;
        const lineId = quotationRes.body?.data?.lines?.[0]?.id;

        if (qId) {
            await recordTest(server, 'Quotations', 'GET', `/api/quotations/${qId}`, undefined, repToken, [200]);

            await recordTest(
                server,
                'Quotations',
                'PATCH',
                `/api/quotations/${qId}/lines`,
                { lines: [{ productId: sampleProdId, qty: 4, discountPct: 18 }] },
                repToken,
                [200]
            );

            // 12. Smart Layer Analytics
            await recordTest(server, 'Smart Layer', 'GET', `/api/risk-score/${qId}`, undefined, repToken, [200]);
            await recordTest(server, 'Smart Layer', 'GET', `/api/upsell-suggestions/${qId}`, undefined, repToken, [200]);

            // 13. Approvals Workflow
            await recordTest(server, 'Approvals', 'GET', '/api/approvals', undefined, managerToken, [200]);

            await recordTest(
                server,
                'Approvals',
                'POST',
                `/api/approvals/${qId}/approve`,
                { note: 'Approved in audit test run' },
                managerToken,
                [200]
            );

            // 14. Fulfillment
            await recordTest(
                server,
                'Fulfillment',
                'GET',
                `/api/fulfillment/${qId}/suggest-split`,
                undefined,
                repToken,
                [200]
            );

            await recordTest(
                server,
                'Fulfillment',
                'POST',
                `/api/fulfillment/${qId}/splits`,
                {
                    splits: [{ warehouseId: sampleWhId, qtyFulfilled: 4, shipmentCost: 30 }],
                    isManualOverride: false,
                },
                repToken,
                [200, 201]
            );

            await recordTest(server, 'Fulfillment', 'GET', `/api/fulfillment/${qId}/splits`, undefined, repToken, [200]);

            // 15. Subscriptions
            const planList = await recordTest(server, 'Subscriptions', 'GET', '/api/subscriptions/plans', undefined, adminToken, [200]);
            const planId = planList.body?.data?.[0]?.id;

            if (planId) {
                await recordTest(
                    server,
                    'Subscriptions',
                    'POST',
                    '/api/subscriptions/attach',
                    { quotationId: qId, planId },
                    adminToken,
                    [200, 201]
                );

                const subList = await recordTest(server, 'Subscriptions', 'GET', '/api/subscriptions', undefined, adminToken, [200]);
                const subId = subList.body?.data?.[0]?.id;
                if (subId) {
                    await recordTest(
                        server,
                        'Subscriptions',
                        'PATCH',
                        `/api/subscriptions/${subId}/status`,
                        { status: 'ACTIVE' },
                        adminToken,
                        [200]
                    );
                }
            }

            // 16. Invoices
            const invGen = await recordTest(
                server,
                'Invoices',
                'POST',
                `/api/invoices/generate/${qId}`,
                undefined,
                adminToken,
                [200, 201]
            );
            const invoiceId = invGen.body?.data?.[0]?.id;

            await recordTest(server, 'Invoices', 'GET', '/api/invoices', undefined, adminToken, [200]);

            if (invoiceId) {
                await recordTest(server, 'Invoices', 'GET', `/api/invoices/${invoiceId}`, undefined, adminToken, [200]);

                // 17. Payments
                await recordTest(
                    server,
                    'Payments',
                    'POST',
                    '/api/payments',
                    { invoiceId, amount: 200, method: 'CARD', reference: 'AUDIT-PAY-1' },
                    adminToken,
                    [201]
                );

                await recordTest(server, 'Payments', 'GET', `/api/payments/${invoiceId}`, undefined, adminToken, [200]);
            }

            // 18. Customer Portal
            await recordTest(server, 'Portal', 'GET', `/api/portal/quotations/${qId}`, undefined, portalToken, [200, 403]);
        }

        // Test Delete Quotation (Create a temporary draft first)
        const draftToDelete = await recordTest(
            server,
            'Quotations',
            'POST',
            '/api/quotations',
            { customerId: sampleCustId, lines: [] },
            repToken,
            [201]
        );
        const delQId = draftToDelete.body?.data?.id;
        if (delQId) {
            await recordTest(server, 'Quotations', 'DELETE', `/api/quotations/${delQId}`, undefined, repToken, [200]);
        }

        // 19. Deal Health Flags
        const dhList = await recordTest(server, 'Deal Health', 'GET', '/api/deal-health-flags', undefined, managerToken, [200]);
        const flagId = dhList.body?.data?.[0]?.id;
        if (flagId) {
            await recordTest(server, 'Deal Health', 'PATCH', `/api/deal-health-flags/${flagId}/resolve`, undefined, managerToken, [200]);
        }

        // 20. Cron Job Sweep
        await recordTest(server, 'Cron', 'POST', '/api/cron/deal-health-scan', undefined, undefined, [200]);

        // 21. Audit Log
        await recordTest(server, 'Audit Log', 'GET', '/api/audit-log', undefined, adminToken, [200]);
        await recordTest(server, 'Audit Log', 'GET', '/api/audit-log?entityType=Quotation', undefined, adminToken, [200]);
    } finally {
        server.close();
        await disconnectAll();
    }

    // Print Consolidated Report
    console.log('\n================================================================================================');
    console.log(
        `${'CATEGORY'.padEnd(16)} | ${'METHOD'.padEnd(6)} | ${'ENDPOINT'.padEnd(38)} | ${'STATUS'.padEnd(6)} | ${'RESULT'.padEnd(6)} | TIME`
    );
    console.log('================================================================================================');

    let totalPassed = 0;
    for (const r of reports) {
        if (r.passed) totalPassed++;
        const mark = r.passed ? '✔ PASS' : '❌ FAIL';
        console.log(
            `${r.category.padEnd(16)} | ${r.method.padEnd(6)} | ${r.endpoint.padEnd(38)} | ${String(r.status).padEnd(6)} | ${mark.padEnd(6)} | ${r.durationMs}ms`
        );
    }
    console.log('================================================================================================');
    console.log(`\n📊 AUDIT SUMMARY: ${totalPassed} / ${reports.length} Endpoints Operational (${Math.round((totalPassed / reports.length) * 100)}% Success Rate)\n`);

    // Write full report to JSON file
    const reportPath = path.join(__dirname, 'api-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2), 'utf-8');
    console.log(`Report written to ${reportPath}`);

    if (totalPassed === reports.length) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runComprehensiveAudit().catch((err) => {
    console.error('Fatal error during audit:', err);
    process.exit(1);
});
