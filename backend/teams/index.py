"""
Управление командами.
GET  /teams?event_id=X — список команд по мероприятию
POST /teams — создать команду (авторизован + оплачено)
GET  /teams/my — мои команды
PATCH /teams/{id} — обновить состав (только свои)
"""
import json, os, secrets
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p78076459_mobile_event_registr")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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
        SELECT u.id, u.display_name, u.tg_username
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.id = %s AND s.expires_at > NOW()
    """, (session_id,))
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "display_name": row[1], "tg_username": row[2]}

def build_team(cur, team_row):
    team_id = team_row[0]
    cur.execute(f"""
        SELECT s.id, s.slot_number, s.is_reserve,
               array_agg(p.name ORDER BY p.position) as participants
        FROM {SCHEMA}.slots s
        LEFT JOIN {SCHEMA}.participants p ON p.slot_id = s.id
        WHERE s.team_id = %s
        GROUP BY s.id, s.slot_number, s.is_reserve
        ORDER BY s.is_reserve, s.slot_number
    """, (team_id,))
    slot_rows = cur.fetchall()
    slots = []
    for sr in slot_rows:
        parts = [{"name": n} for n in (sr[3] or []) if n]
        slots.append({"id": sr[0], "slot_number": sr[1], "is_reserve": sr[2], "participants": parts})
    return {
        "id": team_row[0], "event_id": team_row[1], "user_id": team_row[2],
        "team_name": team_row[3], "tg_contact": team_row[4],
        "payment_status": team_row[5], "slots_count": team_row[6],
        "registered_at": str(team_row[7]), "slots": slots
    }

def gen_id():
    return secrets.token_urlsafe(8)

def insert_slots(cur, team_id, slots_data):
    for slot in slots_data:
        cur.execute(f"""
            INSERT INTO {SCHEMA}.slots (team_id, slot_number, is_reserve)
            VALUES (%s, %s, %s) RETURNING id
        """, (team_id, slot["slotNumber"], slot.get("isReserve", False)))
        slot_id = cur.fetchone()[0]
        for i, p in enumerate(slot.get("participants", [])):
            name = (p.get("name") or "").strip()
            if name:
                cur.execute(f"INSERT INTO {SCHEMA}.participants (slot_id, name, position) VALUES (%s, %s, %s)",
                            (slot_id, name, i))

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    session_id = event.get("headers", {}).get("X-Session-Id", "")

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET /teams/my
        if method == "GET" and path.endswith("/my"):
            user = get_session_user(conn, session_id)
            if not user:
                return err("Не авторизован", 401)
            cur.execute(f"""
                SELECT id, event_id, user_id, team_name, tg_contact, payment_status, slots_count, registered_at
                FROM {SCHEMA}.teams WHERE user_id = %s ORDER BY registered_at DESC
            """, (user["id"],))
            rows = cur.fetchall()
            teams = [build_team(cur, r) for r in rows]
            return ok({"teams": teams})

        # GET /teams?event_id=X
        if method == "GET":
            params = event.get("queryStringParameters") or {}
            event_id = params.get("event_id")
            if not event_id:
                return err("event_id обязателен")
            cur.execute(f"""
                SELECT id, event_id, user_id, team_name, tg_contact, payment_status, slots_count, registered_at
                FROM {SCHEMA}.teams WHERE event_id = %s ORDER BY registered_at ASC
            """, (event_id,))
            rows = cur.fetchall()
            teams = [build_team(cur, r) for r in rows]
            return ok({"teams": teams})

        # POST /teams — создать (requires paid payment)
        if method == "POST":
            user = get_session_user(conn, session_id)
            if not user:
                return err("Не авторизован", 401)
            body = json.loads(event.get("body") or "{}")
            event_id = body.get("event_id") or ""
            team_name = (body.get("team_name") or "").strip()
            tg_contact = (body.get("tg_contact") or "").strip()
            slots_data = body.get("slots") or []
            payment_id = body.get("payment_id") or ""
            if not all([event_id, team_name, tg_contact, slots_data]):
                return err("Все поля обязательны")
            # Проверяем оплату
            cur.execute(f"SELECT slot_price FROM {SCHEMA}.events WHERE id = %s", (event_id,))
            ev = cur.fetchone()
            if not ev:
                return err("Мероприятие не найдено", 404)
            slot_price = ev[0]
            main_slots = [s for s in slots_data if not s.get("isReserve")]
            slots_count = len(main_slots)
            if slot_price > 0:
                if not payment_id:
                    return err("Требуется оплата")
                # Проверяем что платёж не использован
                cur.execute(f"SELECT id FROM {SCHEMA}.teams WHERE payment_id = %s", (payment_id,))
                if cur.fetchone():
                    return err("Платёж уже использован")
            team_id = gen_id()
            payment_status = "paid" if slot_price == 0 else "paid"
            cur.execute(f"""
                INSERT INTO {SCHEMA}.teams (id, event_id, user_id, team_name, tg_contact, payment_status, payment_id, slots_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (team_id, event_id, user["id"], team_name, tg_contact, payment_status, payment_id or None, slots_count))
            insert_slots(cur, team_id, slots_data)
            conn.commit()
            return ok({"id": team_id, "team_name": team_name, "payment_status": payment_status})

        # PATCH /teams/{id}
        if method == "PATCH":
            user = get_session_user(conn, session_id)
            if not user:
                return err("Не авторизован", 401)
            parts = path.strip("/").split("/")
            team_id = parts[-1]
            cur.execute(f"SELECT user_id FROM {SCHEMA}.teams WHERE id = %s", (team_id,))
            row = cur.fetchone()
            if not row:
                return err("Команда не найдена", 404)
            if row[0] != user["id"]:
                return err("Нет доступа", 403)
            body = json.loads(event.get("body") or "{}")
            slots_data = body.get("slots") or []
            if not slots_data:
                return err("Нужны слоты")
            # Получаем старые слоты
            cur.execute(f"SELECT id FROM {SCHEMA}.slots WHERE team_id = %s", (team_id,))
            slot_ids = [r[0] for r in cur.fetchall()]
            for sid in slot_ids:
                cur.execute(f"UPDATE {SCHEMA}.participants SET name = '' WHERE slot_id = %s", (sid,))
            # Пересохраняем участников (простая стратегия: update by position)
            for i, slot in enumerate(slots_data):
                if i < len(slot_ids):
                    sid = slot_ids[i]
                    cur.execute(f"SELECT id, position FROM {SCHEMA}.participants WHERE slot_id = %s ORDER BY position", (sid,))
                    existing = cur.fetchall()
                    parts_list = slot.get("participants") or []
                    for j, p in enumerate(parts_list):
                        name = (p.get("name") or "").strip()
                        if j < len(existing):
                            cur.execute(f"UPDATE {SCHEMA}.participants SET name = %s WHERE id = %s", (name, existing[j][0]))
                        elif name:
                            cur.execute(f"INSERT INTO {SCHEMA}.participants (slot_id, name, position) VALUES (%s, %s, %s)", (sid, name, j))
            conn.commit()
            return ok({"ok": True})

        return err("Не найдено", 404)
    finally:
        conn.close()
