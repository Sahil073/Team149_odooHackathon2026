"""
db.py — Persistence layer for Deal Health Engine.

Supports dual-mode execution:
1. PostgreSQL / Supabase if DATABASE_URL or SUPABASE_DB_URL is configured.
2. Local SQLite (deal_health.db) fallback for standalone testing or offline mode.
"""

import os
import sqlite3
import os
import threading
from typing import List, Optional
from typing import List, Optional, Union
from models import QuoteState, DealHealthFlagEvent, DealHealthFlagRecord

DB_PATH = os.path.join(os.path.dirname(__file__), "deal_health.db")
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")
SQLITE_PATH = os.path.join(os.path.dirname(__file__), "deal_health.db")
_lock = threading.Lock()

_use_postgres = False
if DATABASE_URL:
    try:
        import psycopg2
        import psycopg2.extras
        _use_postgres = True
    except ImportError:
        print("[deal-health.db] psycopg2 not installed; falling back to SQLite.")
        _use_postgres = False

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)

def _get_pg_connection():
    import psycopg2
    import psycopg2.extras
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def _get_sqlite_connection():
    conn = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    global _use_postgres
    with _lock:
        conn = get_connection()
        if _use_postgres and DATABASE_URL:
            try:
                conn = _get_pg_connection()
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS quote_state (
                            quotation_id VARCHAR(100) PRIMARY KEY,
                            sales_rep_id VARCHAR(100) NOT NULL,
                            customer_id VARCHAR(100) NOT NULL,
                            avg_discount_pct NUMERIC(6,2) NOT NULL,
                            last_updated_at TIMESTAMPTZ NOT NULL,
                            status VARCHAR(50),
                            promised_delivery_date TIMESTAMPTZ,
                            actual_ship_date TIMESTAMPTZ
                        );
                        CREATE TABLE IF NOT EXISTS deal_health_flags (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            quotation_id VARCHAR(100) NOT NULL,
                            flag_type VARCHAR(50) NOT NULL,
                            severity VARCHAR(20) NOT NULL,
                            detail TEXT NOT NULL,
                            detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            resolved BOOLEAN NOT NULL DEFAULT FALSE
                        );
                        """
                    )
                conn.commit()
                conn.close()
                print("[deal-health.db] Connected to PostgreSQL / Supabase.")
                return
            except Exception as exc:
                print(f"[deal-health.db] PostgreSQL connection failed ({exc}); falling back to SQLite.")
                _use_postgres = False

        conn = _get_sqlite_connection()
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
        print(f"[deal-health.db] Using local SQLite database: {SQLITE_PATH}")


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
        if _use_postgres:
            conn = _get_pg_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO quote_state (
                        quotation_id, sales_rep_id, customer_id, avg_discount_pct,
                        last_updated_at, status, promised_delivery_date, actual_ship_date
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT(quotation_id) DO UPDATE SET
                        sales_rep_id=EXCLUDED.sales_rep_id,
                        customer_id=EXCLUDED.customer_id,
                        avg_discount_pct=EXCLUDED.avg_discount_pct,
                        last_updated_at=EXCLUDED.last_updated_at,
                        status=EXCLUDED.status,
                        promised_delivery_date=EXCLUDED.promised_delivery_date,
                        actual_ship_date=EXCLUDED.actual_ship_date
                    """,
                    (
                        str(event.quotationId),
                        str(event.salesRepId),
                        str(event.customerId),
                        avg_discount,
                        event.timestamp,
                        event.status,
                        event.promisedDeliveryDate,
                        event.actualShipDate,
                    ),
                )
            conn.commit()
            conn.close()
        else:
            conn = _get_sqlite_connection()
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
                    str(event.quotationId),
                    str(event.salesRepId),
                    str(event.customerId),
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
        quotationId=str(event.quotationId),
        salesRepId=str(event.salesRepId),
        customerId=str(event.customerId),
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
    if _use_postgres:
        import psycopg2.extras
        conn = _get_pg_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM quote_state")
            rows = cur.fetchall()
        conn.close()
    else:
        conn = _get_sqlite_connection()
        rows = conn.execute("SELECT * FROM quote_state").fetchall()
        conn.close()

    return [
        QuoteState(
            quotationId=row["quotation_id"],
            salesRepId=row["sales_rep_id"],
            customerId=row["customer_id"],
            avgDiscountPct=row["avg_discount_pct"],
            lastUpdatedAt=row["last_updated_at"],
            quotationId=str(row["quotation_id"]),
            salesRepId=str(row["sales_rep_id"]),
            customerId=str(row["customer_id"]),
            avgDiscountPct=float(row["avg_discount_pct"]),
            lastUpdatedAt=str(row["last_updated_at"]),
            status=row["status"],
            promisedDeliveryDate=row["promised_delivery_date"],
            actualShipDate=row["actual_ship_date"],
            promisedDeliveryDate=str(row["promised_delivery_date"]) if row["promised_delivery_date"] else None,
            actualShipDate=str(row["actual_ship_date"]) if row["actual_ship_date"] else None,
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
    if _use_postgres:
        conn = _get_pg_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT AVG(avg_discount_pct) AS baseline, COUNT(*) AS n
                FROM quote_state
                WHERE sales_rep_id = %s AND quotation_id != %s
                """,
                (sales_rep_id, exclude_quotation_id),
            )
            row = cur.fetchone()
        conn.close()
        if row is None or row[1] < 2 or row[0] is None:
            return None
        return float(row[0])
    else:
        conn = _get_sqlite_connection()
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
        return float(row["baseline"])

    if row is None or row["n"] < 2 or row["baseline"] is None:
        return None

    return row["baseline"]
def insert_flag(flag: DealHealthFlagEvent) -> Union[str, int]:
    with _lock:
        if _use_postgres:
            conn = _get_pg_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO deal_health_flags (quotation_id, flag_type, severity, detail, detected_at, resolved)
                    VALUES (%s, %s, %s, %s, %s, FALSE)
                    RETURNING id
                    """,
                    (flag.quotationId, flag.flagType, flag.severity, flag.detail, flag.detectedAt),
                )
                flag_id = str(cur.fetchone()[0])
            conn.commit()
            conn.close()
            return flag_id
        else:
            conn = _get_sqlite_connection()
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


def insert_flag(flag: DealHealthFlagEvent) -> int:
    with _lock:
        conn = get_connection()
        cursor = conn.execute(
def has_open_flag(quotation_id: str, flag_type: str) -> bool:
    if _use_postgres:
        conn = _get_pg_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM deal_health_flags
                WHERE quotation_id = %s AND flag_type = %s AND resolved = FALSE
                LIMIT 1
                """,
                (quotation_id, flag_type),
            )
            row = cur.fetchone()
        conn.close()
        return row is not None
    else:
        conn = _get_sqlite_connection()
        row = conn.execute(
            """
            INSERT INTO deal_health_flags (quotation_id, flag_type, severity, detail, detected_at, resolved)
            VALUES (?, ?, ?, ?, ?, 0)
            SELECT 1 FROM deal_health_flags
            WHERE quotation_id = ? AND flag_type = ? AND resolved = 0
            LIMIT 1
            """,
            (flag.quotationId, flag.flagType, flag.severity, flag.detail, flag.detectedAt),
        )
        conn.commit()
        flag_id = cursor.lastrowid
            (quotation_id, flag_type),
        ).fetchone()
        conn.close()
        return row is not None

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
    if _use_postgres:
        import psycopg2.extras
        conn = _get_pg_connection()
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if severity:
                cur.execute(
                    "SELECT * FROM deal_health_flags WHERE resolved = FALSE AND severity = %s ORDER BY detected_at DESC",
                    (severity,),
                )
            else:
                cur.execute(
                    "SELECT * FROM deal_health_flags WHERE resolved = FALSE ORDER BY detected_at DESC"
                )
            rows = cur.fetchall()
        conn.close()
    else:
        rows = conn.execute(
            "SELECT * FROM deal_health_flags WHERE resolved = 0 ORDER BY detected_at DESC"
        ).fetchall()
        conn = _get_sqlite_connection()
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

    conn.close()

    return [
        DealHealthFlagRecord(
            id=row["id"],
            quotationId=row["quotation_id"],
            id=str(row["id"]) if _use_postgres else row["id"],
            quotationId=str(row["quotation_id"]),
            flagType=row["flag_type"],
            severity=row["severity"],
            detail=row["detail"],
            detectedAt=row["detected_at"],
            detectedAt=str(row["detected_at"]),
            resolved=bool(row["resolved"]),
        )
        for row in rows
    ]


def resolve_flag(flag_id: int) -> None:
def resolve_flag(flag_id: Union[str, int]) -> None:
    with _lock:
        conn = get_connection()
        conn.execute("UPDATE deal_health_flags SET resolved = 1 WHERE id = ?", (flag_id,))
        conn.commit()
        conn.close()
        if _use_postgres:
            conn = _get_pg_connection()
            with conn.cursor() as cur:
                cur.execute("UPDATE deal_health_flags SET resolved = TRUE WHERE id = %s", (str(flag_id),))
            conn.commit()
            conn.close()
        else:
            conn = _get_sqlite_connection()
            conn.execute("UPDATE deal_health_flags SET resolved = 1 WHERE id = ?", (flag_id,))
            conn.commit()
            conn.close()
