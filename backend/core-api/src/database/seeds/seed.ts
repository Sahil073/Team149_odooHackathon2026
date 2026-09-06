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
        update: { name: 'Vikram Malhotra (Admin)' },
        create: {
            name: 'Vikram Malhotra (Admin)',
            email: 'admin@dealflow360.com',
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: Role.ADMIN,
        },
    });

    const salesRep = await prisma.user.upsert({
        where: { email: 'rep@dealflow360.com' },
        update: { name: 'Nikhil Sharma (Sales Rep)' },
        create: {
            name: 'Nikhil Sharma (Sales Rep)',
            email: 'rep@dealflow360.com',
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: Role.SALES_REP,
        },
    });

    const salesManager = await prisma.user.upsert({
        where: { email: 'manager@dealflow360.com' },
        update: { name: 'Priya Patel (Sales Manager)' },
        create: {
            name: 'Priya Patel (Sales Manager)',
            email: 'manager@dealflow360.com',
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: Role.SALES_MANAGER,
        },
    });

    const finance = await prisma.user.upsert({
        where: { email: 'finance@dealflow360.com' },
        update: { name: 'David D\'souza (Finance Lead)' },
        create: {
            name: 'David D\'souza (Finance Lead)',
            email: 'finance@dealflow360.com',
            passwordHash: DEFAULT_PASSWORD_HASH,
            role: Role.FINANCE,
        },
    });

    console.log('  ✔ Seeded internal staff users (Vikram, Nikhil, Priya, David)');

    // ── 2. Customers (Indian Enterprises across Tiers) ───────────────────────
    const acmeBronze = await prisma.customer.upsert({
        where: { email: 'contact@acmecorp.com' },
        update: { name: 'Tata Consultancy Services Ltd' },
        create: {
            name: 'Tata Consultancy Services Ltd',
            email: 'contact@acmecorp.com',
            tier: CustomerTier.BRONZE,
            portalPasswordHash: DEFAULT_PASSWORD_HASH,
        },
    });

    const betaSilver = await prisma.customer.upsert({
        where: { email: 'procurement@betaindustries.com' },
        update: { name: 'Infosys Technologies Ltd' },
        create: {
            name: 'Infosys Technologies Ltd',
            email: 'procurement@betaindustries.com',
            tier: CustomerTier.SILVER,
            portalPasswordHash: DEFAULT_PASSWORD_HASH,
        },
    });

    const apexGold = await prisma.customer.upsert({
        where: { email: 'deals@apexglobal.com' },
        update: { name: 'Reliance Industries Global' },
        create: {
            name: 'Reliance Industries Global',
            email: 'deals@apexglobal.com',
            tier: CustomerTier.GOLD,
            portalPasswordHash: DEFAULT_PASSWORD_HASH,
        },
    });

    console.log('  ✔ Seeded Indian customers (TCS, Infosys, Reliance)');

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

    // ── 6. Price Lists in INR ───────────────────────────────────────────────
    await prisma.priceList.deleteMany();
    await prisma.priceList.createMany({
        data: [
            { customerTier: CustomerTier.BRONZE, currency: 'INR', priceRule: 'Standard Base Price (₹)' },
            { customerTier: CustomerTier.SILVER, currency: 'INR', priceRule: '5% Tier Base Discount (₹)' },
            { customerTier: CustomerTier.GOLD, currency: 'INR', priceRule: '10% Tier Base Discount (₹)' },
        ],
    });

    console.log('  ✔ Seeded price lists for tiers in INR');

    // ── 7. Indian Logistics Hubs / Warehouses ───────────────────────────────
    const mainWarehouse = await prisma.warehouse.upsert({
        where: { id: 'w-main-warehouse' },
        update: { name: 'Mumbai Central Hub', location: 'Bhiwandi, Maharashtra' },
        create: {
            id: 'w-main-warehouse',
            name: 'Mumbai Central Hub',
            location: 'Bhiwandi, Maharashtra',
        },
    });

    const eastDepot = await prisma.warehouse.upsert({
        where: { id: 'w-east-depot' },
        update: { name: 'Bengaluru Tech Depot', location: 'Whitefield, Karnataka' },
        create: {
            id: 'w-east-depot',
            name: 'Bengaluru Tech Depot',
            location: 'Whitefield, Karnataka',
        },
    });

    console.log('  ✔ Seeded Indian warehouse hubs (Mumbai Central, Bengaluru Tech Depot)');

    // ── 8. Products in INR (Hardware, Services, Subscriptions) ───────────────
    const serverRack = await prisma.product.upsert({
        where: { id: 'p-hardware-server-rack' },
        update: { name: 'Enterprise Server Rack 42U', price: 210000.00, taxPct: 18 },
        create: {
            id: 'p-hardware-server-rack',
            name: 'Enterprise Server Rack 42U',
            category: ProductCategory.HARDWARE,
            price: 210000.00,
            unit: 'rack',
            taxPct: 18,
            description: 'Datacenter grade 42U rack with intelligent PDU, dual thermal sensors, and cable management.',
        },
    });

    const backupAppliance = await prisma.product.upsert({
        where: { id: 'p-hardware-backup' },
        update: { name: 'Cloud Backup Appliance 4TB NVMe', price: 65000.00, taxPct: 18 },
        create: {
            id: 'p-hardware-backup',
            name: 'Cloud Backup Appliance 4TB NVMe',
            category: ProductCategory.HARDWARE,
            price: 65000.00,
            unit: 'unit',
            taxPct: 18,
            description: 'High-speed local NVMe recovery appliance with automated AES-256 cloud synchronization.',
        },
    });

    const setupService = await prisma.product.upsert({
        where: { id: 'p-service-setup' },
        update: { name: 'Setup & Implementation Service', price: 28000.00, taxPct: 18 },
        create: {
            id: 'p-service-setup',
            name: 'Setup & Implementation Service',
            category: ProductCategory.SERVICES,
            price: 28000.00,
            unit: 'session',
            taxPct: 18,
            description: 'Onsite white-glove hardware installation, OS provisioning, and network routing configuration.',
        },
    });

    const saasMonitoring = await prisma.product.upsert({
        where: { id: 'p-sub-monitoring' },
        update: { name: 'Premium SaaS Cloud Monitoring', price: 4500.00, taxPct: 18 },
        create: {
            id: 'p-sub-monitoring',
            name: 'Premium SaaS Cloud Monitoring',
            category: ProductCategory.SUBSCRIPTIONS,
            price: 4500.00,
            unit: 'license/month',
            taxPct: 18,
            description: '24/7 automated telemetry, cluster anomaly detection, and predictive failover alerts.',
        },
    });

    console.log('  ✔ Seeded Indian master products in INR (Server Rack, Cloud Backup, Setup, SaaS Monitoring)');

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
                unitPrice: 210000.00,
                discountPct: 5,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
            {
                quotationId: q1042.id,
                productId: backupAppliance.id,
                qty: 4,
                unitPrice: 65000.00,
                discountPct: 9,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
        ],
    });

    const q1039 = await prisma.quotation.upsert({
        where: { id: 'Q-1039' },
        update: { customerId: betaSilver.id, salesRepId: salesRep.id, status: QuotationStatus.PENDING_APPROVAL, blendedRiskScore: 68 },
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
                unitPrice: 65000.00,
                discountPct: 20,
                lineLimitPct: 10,
                status: QuotationLineStatus.FLAGGED,
            },
        ],
    });

    const q1035 = await prisma.quotation.upsert({
        where: { id: 'Q-1035' },
        update: { customerId: apexGold.id, salesRepId: salesRep.id, status: QuotationStatus.APPROVED, blendedRiskScore: 12 },
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
                unitPrice: 210000.00,
                discountPct: 0,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
            {
                quotationId: q1035.id,
                productId: saasMonitoring.id,
                qty: 1,
                unitPrice: 4500.00,
                discountPct: 0,
                lineLimitPct: 12,
                status: QuotationLineStatus.OK,
            },
        ],
    });

    const q1031 = await prisma.quotation.upsert({
        where: { id: 'Q-1031' },
        update: { customerId: acmeBronze.id, salesRepId: salesRep.id, status: QuotationStatus.FULFILLED, blendedRiskScore: 10 },
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
                unitPrice: 210000.00,
                discountPct: 5,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
            {
                quotationId: q1031.id,
                productId: backupAppliance.id,
                qty: 3,
                unitPrice: 65000.00,
                discountPct: 0,
                lineLimitPct: 15,
                status: QuotationLineStatus.OK,
            },
        ],
    });

    console.log('  ✔ Seeded Indian quotations (Q-1042 TCS, Q-1039 Infosys, Q-1035 Reliance, Q-1031 Fulfilled)');

    // ── 13. Fulfillment Splits ────────────────────────────────────────────────
    await prisma.fulfillmentSplit.deleteMany({ where: { quotationId: q1031.id } });
    await prisma.fulfillmentSplit.createMany({
        data: [
            {
                quotationId: q1031.id,
                warehouseId: mainWarehouse.id,
                qtyFulfilled: 4,
                shipmentCost: 3500.00,
                generatedBy: 'core-rule',
            },
            {
                quotationId: q1031.id,
                warehouseId: eastDepot.id,
                qtyFulfilled: 2,
                shipmentCost: 2200.00,
                generatedBy: 'core-rule',
            },
        ],
    });

    console.log('  ✔ Seeded fulfillment warehouse splits in INR');

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
        update: { amount: 1240000.00 },
        create: {
            id: 'INV-1042',
            quotationId: q1042.id,
            type: InvoiceType.ONE_TIME,
            status: InvoiceStatus.PENDING,
            amount: 1240000.00,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
    });

    await prisma.invoice.upsert({
        where: { id: 'INV-1031' },
        update: { amount: 825000.00 },
        create: {
            id: 'INV-1031',
            quotationId: q1031.id,
            type: InvoiceType.ONE_TIME,
            status: InvoiceStatus.PAID,
            amount: 825000.00,
            dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
    });

    console.log('  ✔ Seeded invoices in INR (INV-1042 Pending, INV-1031 Paid)');

    // ── 16. Deal Health Flags ────────────────────────────────────────────────
    await prisma.dealHealthFlag.deleteMany();
    await prisma.dealHealthFlag.createMany({
        data: [
            {
                quotationId: q1039.id,
                flagType: DealHealthFlagType.DISCOUNT_ANOMALY,
                severity: DealHealthSeverity.HIGH,
                detail: 'Line discount of 20% on Backup Appliance exceeds Silver tier allowance (10%)',
                resolved: false,
            },
            {
                quotationId: q1042.id,
                flagType: DealHealthFlagType.STALLED,
                severity: DealHealthSeverity.MEDIUM,
                detail: 'Tata Consultancy Services draft deal pending revision for 5 days',
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
                reason: 'Draft quotation opened for Tata Consultancy Services Ltd',
            },
            {
                entityType: 'Quotation',
                entityId: 'Q-1039',
                userId: salesRep.id,
                action: 'APPROVAL_REQUIRED',
                reason: 'Discount ceiling breached (20% > 10% Silver limit)',
            },
            {
                entityType: 'Quotation',
                entityId: 'Q-1035',
                userId: salesManager.id,
                action: 'QUOTATION_APPROVED',
                reason: 'Approved by Priya Patel for Reliance Industries Global within tier rules',
            },
            {
                entityType: 'Fulfillment',
                entityId: 'Q-1031',
                userId: admin.id,
                action: 'SPLIT_ACCEPTED',
                reason: 'Warehouse split accepted (Mumbai Central Hub + Bengaluru Tech Depot)',
            },
        ],
    });

    console.log('  ✔ Seeded Indian market audit logs');
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
