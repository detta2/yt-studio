#!/usr/bin/env python3
"""YouTube OAuth + API helper untuk yt-studio (Fase 2).

Alur (Desktop app, tanpa server publik):
  1. python3 auth.py url            -> cetak URL otorisasi
  2. User buka URL, login Google, setujui
  3. Browser redirect ke http://127.0.0.1:8080/?code=XXX (gagal load, wajar)
  4. User copy nilai `code` dari address bar, kirim ke Dante via chat
  5. python3 auth.py exchange CODE   -> tukar jadi token, simpan .tokens.json
  6. python3 auth.py verify          -> cek info channel (bukti konek)

Kredensial tersimpan di .config.json (chmod 600, TIDAK di-commit).
"""
import json
import os
import sys
import time
import urllib.parse

import requests

BASE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE, ".config.json")
TOKENS_PATH = os.path.join(BASE, ".tokens.json")

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
API = "https://www.googleapis.com/youtube/v3"

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]
REDIRECT_URI = "http://127.0.0.1:8080"


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


def get_auth_url():
    cfg = load_config()
    q = urllib.parse.urlencode(
        {
            "client_id": cfg["client_id"],
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
        }
    )
    return AUTH_URL + "?" + q


def exchange_code(code):
    cfg = load_config()
    r = requests.post(
        TOKEN_URL,
        data={
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "code": code.strip(),
            "redirect_uri": REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=30,
    )
    if r.status_code != 200:
        raise RuntimeError("exchange gagal: %s %s" % (r.status_code, r.text[:300]))
    data = r.json()
    data["obtained_at"] = int(time.time())
    with open(TOKENS_PATH, "w") as f:
        json.dump(data, f)
    os.chmod(TOKENS_PATH, 0o600)
    return data


def _refresh(refresh_token):
    cfg = load_config()
    r = requests.post(
        TOKEN_URL,
        data={
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    if r.status_code != 200:
        raise RuntimeError("refresh gagal: %s %s" % (r.status_code, r.text[:300]))
    return r.json()


def get_access_token():
    with open(TOKENS_PATH) as f:
        tok = json.load(f)
    # refresh kalau kurang dari 5 menit menuju expired
    if tok["obtained_at"] + tok.get("expires_in", 3600) - 300 < time.time():
        new = _refresh(tok["refresh_token"])
        tok["access_token"] = new["access_token"]
        tok["expires_in"] = new.get("expires_in", 3600)
        tok["obtained_at"] = int(time.time())
        with open(TOKENS_PATH, "w") as f:
            json.dump(tok, f)
    return tok["access_token"]


def api_get(path, params=None):
    r = requests.get(
        API + path,
        params=params or {},
        headers={"Authorization": "Bearer " + get_access_token()},
        timeout=30,
    )
    if r.status_code != 200:
        raise RuntimeError("API %s: %s %s" % (path, r.status_code, r.text[:300]))
    return r.json()


def channel_info():
    d = api_get("/channels", {"part": "snippet,statistics", "mine": "true"})
    items = d.get("items", [])
    if not items:
        raise RuntimeError("tidak ada channel pada akun ini")
    c = items[0]
    return {
        "id": c["id"],
        "title": c["snippet"]["title"],
        "subs": int(c["statistics"].get("subscriberCount", 0)),
        "views": int(c["statistics"].get("viewCount", 0)),
        "videos": int(c["statistics"].get("videoCount", 0)),
    }


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "url"
    if cmd == "url":
        print(get_auth_url())
    elif cmd == "exchange":
        code = sys.argv[2]
        d = exchange_code(code)
        print("OK tersimpan. scope:", d.get("scope", "")[:60])
    elif cmd == "verify":
        info = channel_info()
        print(json.dumps(info, indent=2, ensure_ascii=False))
    else:
        print("pakai: url | exchange CODE | verify")
