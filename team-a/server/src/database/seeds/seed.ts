import {
    PrismaClient,
    Role,
    CustomerTier,
    ProductCategory,
    SubscriptionCycle,
    QuotationStatus,
    QuotationLineStatus,
    SubscriptionStatus,
    InvoiceType,
    InvoiceStatus,
    DealHealthFlagType,
    DealHealthSeverity,
} from '@prisma/client';

const prisma = new PrismaClient();

// Pre-hashed 'password123' (bcrypt 10 rounds) for local testing across all seeded users & customers
const DEFAULT_PASSWORD_HASH = '$2a$10$w0v1V4FwS1t4Z7y1C9V2geH6wV.X5O5yN.H0T6cQ6t8r.J9W2b3eq';

export async function seed(): Promise<void> {
    console.log('🌱 Starting database seed...');

    // ── 1. Users (Roles for Auth & Approval Testing) ─────────────────────────
    const admin = await prisma.user.upsert({
        where: { email: 'admin@dealflow360.com' },
        update: {},
        create: {
            name: 'System Admin',
            email: 'admin@dealflow360.com',
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: Role.ADMIN,
        },
    });

    const salesRep = await prisma.user.upsert({
        where: { email: 'rep@dealflow360.com' },
        update: {},
        create: {
            name: 'Nikhil (Sales Rep)',
            email: 'rep@dealflow360.com',
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: Role.SALES_REP,
        },
    });

    const salesManager = await prisma.user.upsert({
        where: { email: 'manager@dealflow360.com' },
        update: {},
        create: {
            name: 'Sarah (Sales Manager)',
            email: 'manager@dealflow360.com',
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: Role.SALES_MANAGER,
        },
    });

    const finance = await prisma.user.upsert({
        where: { email: 'finance@dealflow360.com' },
        update: {},
        create: {
            name: 'David (Finance Lead)',
            email: 'finance@dealflow360.com',
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: Role.FINANCE,
        },
    });

    console.log('  ✔ Seeded internal staff users (Admin, Rep, Manager, Finance)');

    // ── 2. Customers (All 3 Tiers for Discount Governance) ───────────────────
    const acmeBronze = await prisma.customer.upsert({
        where: { email: 'contact@acmecorp.com' },
        update: {},
        create: {
            name: 'Acme Corp',
            email: 'contact@acmecorp.com',
            tier: CustomerTier.BRONZE,
            portalPasswordHash: DEFAULT_PASSWORD_HASH,
        },
    });

    const betaSilver = await prisma.customer.upsert({
        where: { email: 'procurement@betaindustries.com' },
        update: {},
        create: {
            name: 'Beta Industries',
            email: 'procurement@betaindustries.com',
            tier: CustomerTier.SILVER,
            portalPasswordHash: DEFAULT_PASSWORD_HASH,
        },
    });

    const apexGold = await prisma.customer.upsert({
        where: { email: 'deals@apexglobal.com' },
        update: {},
        create: {
            name: 'Apex Global',
            email: 'deals@apexglobal.com',
            tier: CustomerTier.GOLD,
            portalPasswordHash: DEFAULT_PASSWORD_HASH,
        },
    });

    console.log('  ✔ Seeded customers across tiers (Bronze, Silver, Gold)');

    // ── 3. Discount Tiers (Customer Tier Max Allowed Discount %) ─────────────
    await prisma.discountTier.upsert({
        where: { tierName: 'Bronze' },
        update: { maxDiscountPct: 5 },
        create: { tierName: 'Bronze', maxDiscountPct: 5 },
    });

    await prisma.discountTier.upsert({
        where: { tierName: 'Silver' },
        update: { maxDiscountPct: 10 },
        create: { tierName: 'Silver', maxDiscountPct: 10 },
    });

    await prisma.discountTier.upsert({
        where: { tierName: 'Gold' },
        update: { maxDiscountPct: 15 },
        create: { tierName: 'Gold', maxDiscountPct: 15 },
    });

    console.log('  ✔ Seeded discount tiers');

    // ── 4. Category Discount Limits (ICD §3.1 & Phase 3 Checklist) ───────────
    await prisma.categoryDiscountLimit.upsert({
        where: { category: ProductCategory.HARDWARE },
        update: { maxDiscountPct: 15 },
        create: { category: ProductCategory.HARDWARE, maxDiscountPct: 15 },
    });

    await prisma.categoryDiscountLimit.upsert({
        where: { category: ProductCategory.SERVICES },
        update: { maxDiscountPct: 10 },
        create: { category: ProductCategory.SERVICES, maxDiscountPct: 10 },
    });

    await prisma.categoryDiscountLimit.upsert({
        where: { category: ProductCategory.SUBSCRIPTIONS },
        update: { maxDiscountPct: 12 },
        create: { category: ProductCategory.SUBSCRIPTIONS, maxDiscountPct: 12 },
    });

    console.log('  ✔ Seeded category discount limits');

    // ── 5. Approval Chain Rules ─────────────────────────────────────────────
    // 0-5%: Auto-approved (no manager, no finance)
    // 6-15%: Manager required
    // 16-100%: Manager followed by Finance required
    await prisma.approvalChainRule.deleteMany();
    await prisma.approvalChainRule.createMany({
        data: [
            { discountRangeMin: 0, discountRangeMax: 5, requiresManager: false, requiresFinance: false },
            { discountRangeMin: 6, discountRangeMax: 15, requiresManager: true, requiresFinance: false },
            { discountRangeMin: 16, discountRangeMax: 100, requiresManager: true, requiresFinance: true },
        ],
    });

    console.log('  ✔ Seeded approval chain rules (Auto, Manager, Manager + Finance)');

    // ── 6. Price Lists ───────────────────────────────────────────────────────
    await prisma.priceList.deleteMany();
    await prisma.priceList.createMany({
        data: [
            { customerTier: CustomerTier.BRONZE, currency: 'USD', priceRule: 'Standard Base Price' },
            { customerTier: CustomerTier.SILVER, currency: 'USD', priceRule: '5% Tier Base Discount' },
            { customerTier: CustomerTier.GOLD, currency: 'USD', priceRule: '10% Tier Base Discount' },
        ],
    });

    console.log('  ✔ Seeded price lists for tiers');

    // ── 7. Warehouse Pair (Phase 3: 1 Warehouse Pair) ─────────────────────────
    const mainWarehouse = await prisma.warehouse.upsert({
        where: { id: 'w-main-warehouse' },
        update: {},
        create: {
            id: 'w-main-warehouse',
            name: 'Main Warehouse',
            location: 'Mumbai Central Hub',
        },
    });

    const eastDepot = await prisma.warehouse.upsert({
        where: { id: 'w-east-depot' },
        update: {},
        create: {
            id: 'w-east-depot',
            name: 'East Depot',
            location: 'Kolkata Regional Hub',
        },
    });

    console.log('  ✔ Seeded warehouse pair (Main Warehouse, East Depot)');

    // ── 8. Products (Hardware, Services, Subscriptions) ──────────────────────
    const serverRack = await prisma.product.upsert({
        where: { id: 'p-hardware-server-rack' },
        update: {},
        create: {
            id: 'p-hardware-server-rack',
            name: 'Enterprise Server Rack 42U',
            category: ProductCategory.HARDWARE,
            price: 2500.00,
            unit: 'unit',
            taxPct: 18,
            description: 'High density datacenter server rack with built-in PDU and thermal venting.',
        },
    });

    const backupAppliance = await prisma.product.upsert({
        where: { id: 'p-hardware-backup' },
        update: {},
        create: {
            id: 'p-hardware-backup',
            name: 'Cloud Backup Appliance 2TB',
            category: ProductCategory.HARDWARE,
            price: 800.00,
            unit: 'unit',
            taxPct: 18,
            description: 'On-premise fast NVMe recovery gateway with cloud sync.',
        },
    });

    const setupService = await prisma.product.upsert({
        where: { id: 'p-service-setup' },
        update: {},
        create: {
            id: 'p-service-setup',
            name: 'Setup & Implementation Service',
            category: ProductCategory.SERVICES,
            price: 1200.00,
            unit: 'service',
            taxPct: 18,
            description: 'Full white-glove hardware rack mounting, configuration, and network routing setup.',
        },
    });

    const saasMonitoring = await prisma.product.upsert({
        where: { id: 'p-sub-monitoring' },
        update: {},
        create: {
            id: 'p-sub-monitoring',
            name: 'Premium SaaS Cloud Monitoring',
            category: ProductCategory.SUBSCRIPTIONS,
            price: 150.00,
            unit: 'license/month',
            taxPct: 18,
            description: '24/7 automated telemetry, anomaly alerting, and predictive cluster health monitoring.',
        },
    });

    console.log('  ✔ Seeded products (Hardware, Services, Subscriptions)');

    // ── 9. Stock Levels (Split Stock across Warehouses for Split Demo) ───────
    // If order requests 20 server racks: 15 from Main, 5 from East Depot!
    await prisma.stock.upsert({
        where: {
            warehouseId_productId: {
                warehouseId: mainWarehouse.id,
                productId: serverRack.id,
            },
        },
        update: { qtyAvailable: 15, qtyReserved: 0 },
        create: {
            warehouseId: mainWarehouse.id,
            productId: serverRack.id,
            qtyAvailable: 15,
            qtyReserved: 0,
        },
    });

    await prisma.stock.upsert({
        where: {
            warehouseId_productId: {
                warehouseId: eastDepot.id,
                productId: serverRack.id,
            },
        },
        update: { qtyAvailable: 10, qtyReserved: 0 },
        create: {
            warehouseId: eastDepot.id,
            productId: serverRack.id,
            qtyAvailable: 10,
            qtyReserved: 0,
        },
    });

    await prisma.stock.upsert({
        where: {
            warehouseId_productId: {
                warehouseId: mainWarehouse.id,
                productId: backupAppliance.id,
            },
        },
        update: { qtyAvailable: 25, qtyReserved: 0 },
        create: {
            warehouseId: mainWarehouse.id,
            productId: backupAppliance.id,
            qtyAvailable: 25,
            qtyReserved: 0,
        },
    });

    await prisma.stock.upsert({
        where: {
            warehouseId_productId: {
                warehouseId: eastDepot.id,
                productId: backupAppliance.id,
            },
        },
        update: { qtyAvailable: 15, qtyReserved: 0 },
        create: {
            warehouseId: eastDepot.id,
            productId: backupAppliance.id,
            qtyAvailable: 15,
            qtyReserved: 0,
        },
    });

    console.log('  ✔ Seeded stock levels split across Main Warehouse and East Depot');

    // ── 10. Subscription Plans (Phase 3: 1+ Subscription Plans) ─────────────
    await prisma.subscriptionPlan.upsert({
        where: { id: 'plan-monthly-std' },
        update: {},
        create: {
            id: 'plan-monthly-std',
            name: 'Enterprise Cloud Monthly',
            cycle: SubscriptionCycle.MONTHLY,
            prorationRule: 'calendar_days',
        },
    });

    await prisma.subscriptionPlan.upsert({
        where: { id: 'plan-yearly-std' },
        update: {},
        create: {
            id: 'plan-yearly-std',
            name: 'Enterprise Cloud Yearly',
            cycle: SubscriptionCycle.YEARLY,
            prorationRule: 'calendar_days',
        },
    });

    console.log('  ✔ Seeded subscription plans (Monthly, Yearly with calendar-day proration)');

    // ── 11. Upsell Rules (Config data for Team B Upsell Engine) ───────────────
    await prisma.upsellRule.upsert({
        where: {
            baseProductId_suggestedProductId: {
                baseProductId: serverRack.id,
                suggestedProductId: backupAppliance.id,
            },
        },
        update: { minMarginPct: 20, promoActive: true },
        create: {
            baseProductId: serverRack.id,
            suggestedProductId: backupAppliance.id,
            minMarginPct: 20,
            promoActive: true,
        },
    });

    await prisma.upsellRule.upsert({
        where: {
            baseProductId_suggestedProductId: {
                baseProductId: serverRack.id,
                suggestedProductId: setupService.id,
            },
        },
        update: { minMarginPct: 25, promoActive: false },
        create: {
            baseProductId: serverRack.id,
            suggestedProductId: setupService.id,
            minMarginPct: 25,
            promoActive: false,
        },
    });

    await prisma.upsellRule.upsert({
        where: {
            baseProductId_suggestedProductId: {
                baseProductId: backupAppliance.id,
                suggestedProductId: saasMonitoring.id,
            },
        },
        update: { minMarginPct: 30, promoActive: true },
        create: {
            baseProductId: backupAppliance.id,
            suggestedProductId: saasMonitoring.id,
            minMarginPct: 30,
            promoActive: true,
        },
    });

    console.log('  ✔ Seeded upsell rules for recommendations engine');

    // ── 12. Quotations & Quotation Lines ──────────────────────────────────────
    const q1042 = await prisma.quotation.upsert({
        where: { id: 'Q-1042' },
        update: {},
        create: {
            id: 'Q-1042',
            customerId: acmeBronze.id,
            salesRepId: salesRep.id,
            status: QuotationStatus.DRAFT,
            blendedRiskScore: 18,
        },
    });

    await prisma.quotationLine.deleteMany({ where: { quotationId: q1042.id } });
    await prisma.quotationLine.createMany({
        data: [
            {
                quotationId: q1042.id,
                productId: serverRack.id,
                qty: 4,
                unitPrice: 2500.00,
                discountPct: 5,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
            {
                quotationId: q1042.id,
                productId: backupAppliance.id,
                qty: 4,
                unitPrice: 800.00,
                discountPct: 9,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
        ],
    });

    const q1039 = await prisma.quotation.upsert({
        where: { id: 'Q-1039' },
        update: {},
        create: {
            id: 'Q-1039',
            customerId: betaSilver.id,
            salesRepId: salesRep.id,
            status: QuotationStatus.PENDING_APPROVAL,
            blendedRiskScore: 68,
        },
    });

    await prisma.quotationLine.deleteMany({ where: { quotationId: q1039.id } });
    await prisma.quotationLine.createMany({
        data: [
            {
                quotationId: q1039.id,
                productId: backupAppliance.id,
                qty: 5,
                unitPrice: 800.00,
                discountPct: 20,
                lineLimitPct: 10,
                status: QuotationLineStatus.FLAGGED,
            },
        ],
    });

    const q1035 = await prisma.quotation.upsert({
        where: { id: 'Q-1035' },
        update: {},
        create: {
            id: 'Q-1035',
            customerId: apexGold.id,
            salesRepId: salesRep.id,
            status: QuotationStatus.APPROVED,
            blendedRiskScore: 12,
        },
    });

    await prisma.quotationLine.deleteMany({ where: { quotationId: q1035.id } });
    await prisma.quotationLine.createMany({
        data: [
            {
                quotationId: q1035.id,
                productId: serverRack.id,
                qty: 3,
                unitPrice: 2500.00,
                discountPct: 0,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
        ],
    });

    const q1031 = await prisma.quotation.upsert({
        where: { id: 'Q-1031' },
        update: {},
        create: {
            id: 'Q-1031',
            customerId: acmeBronze.id,
            salesRepId: salesRep.id,
            status: QuotationStatus.FULFILLED,
            blendedRiskScore: 10,
        },
    });

    await prisma.quotationLine.deleteMany({ where: { quotationId: q1031.id } });
    await prisma.quotationLine.createMany({
        data: [
            {
                quotationId: q1031.id,
                productId: serverRack.id,
                qty: 3,
                unitPrice: 2500.00,
                discountPct: 5,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
            {
                quotationId: q1031.id,
                productId: backupAppliance.id,
                qty: 3,
                unitPrice: 800.00,
                discountPct: 0,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
        ],
    });

    console.log('  ✔ Seeded quotations (Q-1042 Draft, Q-1039 Pending Approval, Q-1035 Approved, Q-1031 Fulfilled)');

    // ── 13. Fulfillment Splits ────────────────────────────────────────────────
    await prisma.fulfillmentSplit.deleteMany({ where: { quotationId: q1031.id } });
    await prisma.fulfillmentSplit.createMany({
        data: [
            {
                quotationId: q1031.id,
                warehouseId: mainWarehouse.id,
                qtyFulfilled: 4,
                shipmentCost: 42.00,
                generatedBy: 'core-rule',
            },
            {
                quotationId: q1031.id,
                warehouseId: eastDepot.id,
                qtyFulfilled: 2,
                shipmentCost: 29.00,
                generatedBy: 'core-rule',
            },
        ],
    });

    console.log('  ✔ Seeded fulfillment warehouse splits');

    // ── 14. Subscriptions ─────────────────────────────────────────────────────
    await prisma.subscription.upsert({
        where: { quotationId: q1035.id },
        update: {},
        create: {
            id: 'SUB-201',
            quotationId: q1035.id,
            planId: 'plan-monthly-std',
            status: SubscriptionStatus.ACTIVE,
            nextBillDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    console.log('  ✔ Seeded active subscriptions');

    // ── 15. Invoices ──────────────────────────────────────────────────────────
    await prisma.invoice.upsert({
        where: { id: 'INV-1042' },
        update: {},
        create: {
            id: 'INV-1042',
            quotationId: q1042.id,
            type: InvoiceType.ONE_TIME,
            status: InvoiceStatus.PENDING,
            amount: 12400.00,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
    });

    await prisma.invoice.upsert({
        where: { id: 'INV-1031' },
        update: {},
        create: {
            id: 'INV-1031',
            quotationId: q1031.id,
            type: InvoiceType.ONE_TIME,
            status: InvoiceStatus.PAID,
            amount: 9750.00,
            dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
    });

    console.log('  ✔ Seeded invoices (INV-1042 Unpaid, INV-1031 Paid)');

    // ── 16. Deal Health Flags ────────────────────────────────────────────────
    await prisma.dealHealthFlag.deleteMany();
    await prisma.dealHealthFlag.createMany({
        data: [
            {
                quotationId: q1039.id,
                flagType: DealHealthFlagType.DISCOUNT_ANOMALY,
                severity: DealHealthSeverity.HIGH,
                detail: 'Line discount of 20% exceeds Silver tier allowance (10%)',
                resolved: false,
            },
            {
                quotationId: q1042.id,
                flagType: DealHealthFlagType.STALLED,
                severity: DealHealthSeverity.MEDIUM,
                detail: 'Draft deal inactive for 5 days without customer engagement',
                resolved: false,
            },
        ],
    });

    console.log('  ✔ Seeded deal health flags');

    // ── 17. Audit Logs ───────────────────────────────────────────────────────
    await prisma.auditLog.deleteMany();
    await prisma.auditLog.createMany({
        data: [
            {
                entityType: 'Quotation',
                entityId: 'Q-1042',
                userId: salesRep.id,
                action: 'QUOTATION_CREATED',
                reason: 'Draft quotation opened for Acme Corp',
            },
            {
                entityType: 'Quotation',
                entityId: 'Q-1039',
                userId: salesRep.id,
                action: 'APPROVAL_REQUIRED',
                reason: 'Discount ceiling breached (20% > 10%)',
            },
            {
                entityType: 'Quotation',
                entityId: 'Q-1035',
                userId: salesManager.id,
                action: 'QUOTATION_APPROVED',
                reason: 'Approved by Sales Manager within tier rules',
            },
            {
                entityType: 'Fulfillment',
                entityId: 'Q-1031',
                userId: admin.id,
                action: 'SPLIT_ACCEPTED',
                reason: 'Warehouse split accepted (Main Warehouse + East Depot)',
            },
        ],
    });

    console.log('  ✔ Seeded audit log events');
    console.log('🎉 Seed completed successfully!');
}

seed()
    .catch((err) => {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
