"""
Авторизация пользователей: email (код), Telegram (бот), VK OAuth.
POST /auth/email/send — отправить код на email
POST /auth/email/verify — проверить код, вернуть сессию
POST /auth/tg — авторизация через Telegram Login Widget
POST /auth/vk — авторизация через VK OAuth
GET  /auth/me — получить текущего пользователя
POST /auth/logout — выйти
"""
import json, os, secrets, string, random
import psycopg2
from datetime import datetime

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p78076459_mobile_event_registr")

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

def gen_session():
    return secrets.token_urlsafe(32)

def gen_code():
    return "".join(random.choices(string.digits, k=6))

def get_user_by_session(conn, session_id):
    cur = conn.cursor()
    cur.execute(f"""
        SELECT u.id, u.email, u.tg_id, u.vk_id, u.display_name, u.tg_username, u.avatar_url
        FROM {SCHEMA}.sessions s
        JOIN {SCHEMA}.users u ON u.id = s.user_id
        WHERE s.id = %s AND s.expires_at > NOW()
    """, (session_id,))
    row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "email": row[1], "tg_id": row[2], "vk_id": row[3],
            "display_name": row[4], "tg_username": row[5], "avatar_url": row[6]}

def upsert_user_and_session(conn, where_col, where_val, display_name, extra=None):
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE {where_col} = %s", (where_val,))
    row = cur.fetchone()
    if row:
        user_id = row[0]
        if display_name:
            cur.execute(f"UPDATE {SCHEMA}.users SET display_name = %s WHERE id = %s", (display_name, user_id))
        if extra:
            for col, val in extra.items():
                cur.execute(f"UPDATE {SCHEMA}.users SET {col} = %s WHERE id = %s", (val, user_id))
    else:
        cols = [where_col, "display_name"]
        vals = [where_val, display_name]
        if extra:
            for col, val in extra.items():
                cols.append(col)
                vals.append(val)
        placeholders = ", ".join(["%s"] * len(vals))
        col_str = ", ".join(cols)
        cur.execute(f"INSERT INTO {SCHEMA}.users ({col_str}) VALUES ({placeholders}) RETURNING id", vals)
        user_id = cur.fetchone()[0]
    session_id = gen_session()
    cur.execute(f"INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)", (session_id, user_id))
    conn.commit()
    return session_id, user_id

def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    session_id = event.get("headers", {}).get("X-Session-Id", "")

    conn = get_conn()

    try:
        # GET /auth/me
        if method == "GET" and path.endswith("/me"):
            if not session_id:
                return err("Не авторизован", 401)
            user = get_user_by_session(conn, session_id)
            if not user:
                return err("Сессия истекла", 401)
            return ok({"user": user})

        # POST /auth/logout
        if method == "POST" and path.endswith("/logout"):
            if session_id:
                cur = conn.cursor()
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE id = %s", (session_id,))
                conn.commit()
            return ok({"ok": True})

        body = json.loads(event.get("body") or "{}")

        # POST /auth/email/send
        if method == "POST" and path.endswith("/email/send"):
            email = (body.get("email") or "").strip().lower()
            if not email or "@" not in email:
                return err("Некорректный email")
            code = gen_code()
            cur = conn.cursor()
            cur.execute(f"INSERT INTO {SCHEMA}.email_codes (email, code) VALUES (%s, %s)", (email, code))
            conn.commit()
            # В продакшне здесь отправка письма через SMTP/SendGrid
            # Пока возвращаем код в ответе (для разработки)
            return ok({"ok": True, "dev_code": code})

        # POST /auth/email/verify
        if method == "POST" and path.endswith("/email/verify"):
            email = (body.get("email") or "").strip().lower()
            code = (body.get("code") or "").strip()
            if not email or not code:
                return err("Email и код обязательны")
            cur = conn.cursor()
            cur.execute(f"""
                SELECT id FROM {SCHEMA}.email_codes
                WHERE email = %s AND code = %s AND used = FALSE AND expires_at > NOW()
                ORDER BY id DESC LIMIT 1
            """, (email, code))
            row = cur.fetchone()
            if not row:
                return err("Неверный или истёкший код")
            cur.execute(f"UPDATE {SCHEMA}.email_codes SET used = TRUE WHERE id = %s", (row[0],))
            conn.commit()
            display_name = email.split("@")[0]
            session_id, user_id = upsert_user_and_session(conn, "email", email, display_name)
            cur.execute(f"SELECT id, email, display_name FROM {SCHEMA}.users WHERE id = %s", (user_id,))
            u = cur.fetchone()
            return ok({"session_id": session_id, "user": {"id": u[0], "email": u[1], "display_name": u[2]}})

        # POST /auth/tg — Telegram Login Widget data
        if method == "POST" and path.endswith("/tg"):
            tg_id = str(body.get("id") or "")
            if not tg_id:
                return err("Нет данных Telegram")
            first = body.get("first_name") or ""
            last = body.get("last_name") or ""
            username = body.get("username") or ""
            display_name = f"{first} {last}".strip() or username or f"tg_{tg_id}"
            photo = body.get("photo_url") or ""
            session_id, user_id = upsert_user_and_session(
                conn, "tg_id", tg_id, display_name,
                extra={"tg_username": username, "avatar_url": photo}
            )
            cur = conn.cursor()
            cur.execute(f"SELECT id, tg_id, display_name, tg_username, avatar_url FROM {SCHEMA}.users WHERE id = %s", (user_id,))
            u = cur.fetchone()
            return ok({"session_id": session_id, "user": {"id": u[0], "tg_id": u[1], "display_name": u[2], "tg_username": u[3], "avatar_url": u[4]}})

        # POST /auth/vk — VK OAuth code exchange
        if method == "POST" and path.endswith("/vk"):
            vk_id = str(body.get("vk_id") or "")
            if not vk_id:
                return err("Нет данных VK")
            first = body.get("first_name") or ""
            last = body.get("last_name") or ""
            display_name = f"{first} {last}".strip() or f"vk_{vk_id}"
            photo = body.get("photo") or ""
            session_id, user_id = upsert_user_and_session(
                conn, "vk_id", vk_id, display_name,
                extra={"avatar_url": photo}
            )
            cur = conn.cursor()
            cur.execute(f"SELECT id, vk_id, display_name, avatar_url FROM {SCHEMA}.users WHERE id = %s", (user_id,))
            u = cur.fetchone()
            return ok({"session_id": session_id, "user": {"id": u[0], "vk_id": u[1], "display_name": u[2], "avatar_url": u[3]}})

        return err("Не найдено", 404)
    finally:
        conn.close()
