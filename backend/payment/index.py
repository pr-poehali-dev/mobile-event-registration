"""
Оплата слотов через YooKassa.
POST /payment/create  — создать платёж (авторизован)
POST /payment/webhook — webhook от YooKassa
GET  /payment/status?payment_id=X — статус платежа
"""
import json, os, uuid
import psycopg2
import urllib.request
import urllib.parse
import base64

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p78076459_mobile_event_registr")
YOOKASSA_SHOP_ID = os.environ.get("YOOKASSA_SHOP_ID", "")
YOOKASSA_SECRET_KEY = os.environ.get("YOOKASSA_SECRET_KEY", "")
APP_URL = os.environ.get("APP_URL", "https://poehali.dev")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def ok(data):
    return {"statusCode": 200, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False, default=str)}

def err(msg, code=400):
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps({"error": msg})}

def get_session_user(conn, session_id):
    if not session_id:
        return None
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.display_name, u.email
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.id = %s AND s.expires_at > NOW()
    """, (session_id,))
    row = cur.fetchone()
    return {"id": row[0], "display_name": row[1], "email": row[2]} if row else None

def yookassa_request(method, path, body=None):
    url = f"https://api.yookassa.ru/v3{path}"
    credentials = base64.b64encode(f"{YOOKASSA_SHOP_ID}:{YOOKASSA_SECRET_KEY}".encode()).decode()
    headers = {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
        "Idempotence-Key": str(uuid.uuid4()),
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    session_id = event.get("headers", {}).get("X-Session-Id", "")

    conn = get_conn()
    try:
        # POST /payment/create
        if method == "POST" and path.endswith("/create"):
            user = get_session_user(conn, session_id)
            if not user:
                return err("Не авторизован", 401)
            if not YOOKASSA_SHOP_ID or not YOOKASSA_SECRET_KEY:
                return err("Оплата не настроена — обратитесь к администратору")
            body = json.loads(event.get("body") or "{}")
            event_id = body.get("event_id") or ""
            slots_count = int(body.get("slots_count") or 1)
            cur = conn.cursor()
            cur.execute(f"SELECT title, slot_price FROM {SCHEMA}.events WHERE id = %s AND is_open = TRUE", (event_id,))
            ev = cur.fetchone()
            if not ev:
                return err("Мероприятие не найдено", 404)
            event_title, slot_price = ev
            if slot_price == 0:
                return ok({"free": True, "payment_id": "free"})
            total = slot_price * slots_count
            return_url = f"{APP_URL}/register?event={event_id}&paid=1"
            payment_data = {
                "amount": {"value": f"{total}.00", "currency": "RUB"},
                "confirmation": {"type": "redirect", "return_url": return_url},
                "capture": True,
                "description": f"{event_title} — {slots_count} слот(ов)",
                "metadata": {
                    "event_id": event_id,
                    "user_id": str(user["id"]),
                    "slots_count": slots_count,
                }
            }
            result = yookassa_request("POST", "/payments", payment_data)
            confirmation_url = result.get("confirmation", {}).get("confirmation_url", "")
            payment_id = result.get("id", "")
            return ok({
                "payment_id": payment_id,
                "confirmation_url": confirmation_url,
                "amount": total,
            })

        # GET /payment/status?payment_id=X
        if method == "GET" and "/status" in path:
            params = event.get("queryStringParameters") or {}
            payment_id = params.get("payment_id")
            if not payment_id or payment_id == "free":
                return ok({"status": "succeeded", "free": True})
            if not YOOKASSA_SHOP_ID or not YOOKASSA_SECRET_KEY:
                return err("Оплата не настроена")
            result = yookassa_request("GET", f"/payments/{payment_id}")
            return ok({"status": result.get("status"), "payment_id": payment_id})

        # POST /payment/webhook — от YooKassa
        if method == "POST" and path.endswith("/webhook"):
            body = json.loads(event.get("body") or "{}")
            event_type = body.get("type")
            obj = body.get("object") or {}
            if event_type == "payment.succeeded":
                payment_id = obj.get("id")
                if payment_id:
                    cur = conn.cursor()
                    cur.execute(f"UPDATE {SCHEMA}.teams SET payment_status = 'paid' WHERE payment_id = %s", (payment_id,))
                    conn.commit()
            return ok({"ok": True})

        return err("Не найдено", 404)
    finally:
        conn.close()
