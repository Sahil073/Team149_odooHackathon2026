import sqlite3
import os
import threading
from typing import List, Optional
from models import QuoteState, DealHealthFlagEvent, DealHealthFlagRecord

DB_PATH = os.path.join(os.path.dirname(__file__), "deal_health.db")
_lock = threading.Lock()


def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _lock:
        conn = get_connection()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS quote_state (
                quotation_id TEXT PRIMARY KEY,
                sales_rep_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                avg_discount_pct REAL NOT NULL,
                last_updated_at TEXT NOT NULL,
                status TEXT,
                promised_delivery_date TEXT,
                actual_ship_date TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS deal_health_flags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quotation_id TEXT NOT NULL,
                flag_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                detail TEXT NOT NULL,
                detected_at TEXT NOT NULL,
                resolved INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.commit()
        conn.close()


def upsert_quote_state(event) -> QuoteState:
    lines = event.lines
    avg_discount = sum(l.discountPct for l in lines) / len(lines) if lines else 0.0

    with _lock:
        conn = get_connection()
        conn.execute(
            """
            INSERT INTO quote_state (
                quotation_id, sales_rep_id, customer_id, avg_discount_pct,
                last_updated_at, status, promised_delivery_date, actual_ship_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(quotation_id) DO UPDATE SET
                sales_rep_id=excluded.sales_rep_id,
                customer_id=excluded.customer_id,
                avg_discount_pct=excluded.avg_discount_pct,
                last_updated_at=excluded.last_updated_at,
                status=excluded.status,
                promised_delivery_date=excluded.promised_delivery_date,
                actual_ship_date=excluded.actual_ship_date
            """,
            (
                event.quotationId,
                event.salesRepId,
                event.customerId,
                avg_discount,
                event.timestamp,
                event.status,
                event.promisedDeliveryDate,
                event.actualShipDate,
            ),
        )
        conn.commit()
        conn.close()

    return QuoteState(
        quotationId=event.quotationId,
        salesRepId=event.salesRepId,
        customerId=event.customerId,
        avgDiscountPct=avg_discount,
        lastUpdatedAt=event.timestamp,
        status=event.status,
        promisedDeliveryDate=event.promisedDeliveryDate,
        actualShipDate=event.actualShipDate,
    )


def get_all_quote_states() -> List[QuoteState]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM quote_state").fetchall()
    conn.close()

    return [
        QuoteState(
            quotationId=row["quotation_id"],
            salesRepId=row["sales_rep_id"],
            customerId=row["customer_id"],
            avgDiscountPct=row["avg_discount_pct"],
            lastUpdatedAt=row["last_updated_at"],
            status=row["status"],
            promisedDeliveryDate=row["promised_delivery_date"],
            actualShipDate=row["actual_ship_date"],
        )
        for row in rows
    ]


def get_rep_baseline_avg_discount(sales_rep_id: str, exclude_quotation_id: str) -> Optional[float]:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT AVG(avg_discount_pct) AS baseline, COUNT(*) AS n
        FROM quote_state
        WHERE sales_rep_id = ? AND quotation_id != ?
        """,
        (sales_rep_id, exclude_quotation_id),
    ).fetchone()
    conn.close()

    if row is None or row["n"] < 2 or row["baseline"] is None:
        return None

    return row["baseline"]


def insert_flag(flag: DealHealthFlagEvent) -> int:
    with _lock:
        conn = get_connection()
        cursor = conn.execute(
            """
            INSERT INTO deal_health_flags (quotation_id, flag_type, severity, detail, detected_at, resolved)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            (flag.quotationId, flag.flagType, flag.severity, flag.detail, flag.detectedAt),
        )
        conn.commit()
        flag_id = cursor.lastrowid
        conn.close()

    return flag_id


def has_open_flag(quotation_id: str, flag_type: str) -> bool:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT 1 FROM deal_health_flags
        WHERE quotation_id = ? AND flag_type = ? AND resolved = 0
        LIMIT 1
        """,
        (quotation_id, flag_type),
    ).fetchone()
    conn.close()
    return row is not None


def get_open_flags(severity: Optional[str] = None) -> List[DealHealthFlagRecord]:
    conn = get_connection()

    if severity:
        rows = conn.execute(
            "SELECT * FROM deal_health_flags WHERE resolved = 0 AND severity = ? ORDER BY detected_at DESC",
            (severity,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM deal_health_flags WHERE resolved = 0 ORDER BY detected_at DESC"
        ).fetchall()

    conn.close()

    return [
        DealHealthFlagRecord(
            id=row["id"],
            quotationId=row["quotation_id"],
            flagType=row["flag_type"],
            severity=row["severity"],
            detail=row["detail"],
            detectedAt=row["detected_at"],
            resolved=bool(row["resolved"]),
        )
        for row in rows
    ]


def resolve_flag(flag_id: int) -> None:
    with _lock:
        conn = get_connection()
        conn.execute("UPDATE deal_health_flags SET resolved = 1 WHERE id = ?", (flag_id,))
        conn.commit()
        conn.close()
