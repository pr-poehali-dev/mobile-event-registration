"""
Управление мероприятиями.
GET  /events — список открытых мероприятий
GET  /events?admin=1 — все мероприятия (для админа)
POST /events — создать (только админ)
PATCH /events/{id}/toggle — открыть/закрыть регистрацию (только админ)
"""
import json, os, secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p78076459_mobile_event_registr")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id, X-Admin-Pass",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}

def gen_id():
    return secrets.token_urlsafe(6)

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    headers = event.get("headers", {})
    admin_pass = headers.get("X-Admin-Pass", "")
    is_admin = admin_pass == ADMIN_PASSWORD

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET /events
        if method == "GET":
            params = event.get("queryStringParameters") or {}
            if params.get("admin") == "1":
                if not is_admin:
                    return err("Нет доступа", 403)
                cur.execute(f"""
                    SELECT e.id, e.title, e.date, e.time, e.map, e.password, e.slot_price, e.is_open, e.created_at,
                           COUNT(DISTINCT t.id) as teams_count
                    FROM {SCHEMA}.events e
                    LEFT JOIN {SCHEMA}.teams t ON t.event_id = e.id
                    GROUP BY e.id ORDER BY e.created_at DESC
                """)
            else:
                cur.execute(f"""
                    SELECT e.id, e.title, e.date, e.time, e.map, '' as password, e.slot_price, e.is_open, e.created_at,
                           COUNT(DISTINCT t.id) as teams_count
                    FROM {SCHEMA}.events e
                    LEFT JOIN {SCHEMA}.teams t ON t.event_id = e.id
                    WHERE e.is_open = TRUE
                    GROUP BY e.id ORDER BY e.date ASC
                """)
            rows = cur.fetchall()
            events = [{"id": r[0], "title": r[1], "date": str(r[2]), "time": r[3], "map": r[4],
                       "password": r[5], "slot_price": r[6], "is_open": r[7],
                       "created_at": str(r[8]), "teams_count": r[9]} for r in rows]
            return ok({"events": events})

        # POST /events — создать
        if method == "POST":
            if not is_admin:
                return err("Нет доступа", 403)
            body = json.loads(event.get("body") or "{}")
            title = (body.get("title") or "").strip()
            date = body.get("date") or ""
            time = body.get("time") or ""
            map_ = (body.get("map") or "").strip()
            password = (body.get("password") or "").strip()
            slot_price = int(body.get("slot_price") or 0)
            if not all([title, date, time, map_, password]):
                return err("Все поля обязательны")
            eid = gen_id()
            cur.execute(f"""
                INSERT INTO {SCHEMA}.events (id, title, date, time, map, password, slot_price, is_open)
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
            """, (eid, title, date, time, map_, password, slot_price))
            conn.commit()
            return ok({"id": eid, "title": title, "date": date, "time": time, "map": map_,
                       "slot_price": slot_price, "is_open": True})

        # PATCH /events/{id}/toggle
        if method == "PATCH" and "/toggle" in path:
            if not is_admin:
                return err("Нет доступа", 403)
            parts = path.strip("/").split("/")
            eid = parts[-2] if len(parts) >= 2 else None
            if not eid:
                return err("Нет ID")
            cur.execute(f"UPDATE {SCHEMA}.events SET is_open = NOT is_open WHERE id = %s RETURNING is_open", (eid,))
            row = cur.fetchone()
            if not row:
                return err("Не найдено", 404)
            conn.commit()
            return ok({"is_open": row[0]})

        return err("Не найдено", 404)
    finally:
        conn.close()
