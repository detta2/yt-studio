#!/usr/bin/env python3
"""Upload video ke YouTube (resumable upload).

Pakai: python3 upload.py VIDEO.mp4 --title "Judul" [--desc "..."] [--public|--unlisted] [--tags a,b,c]

Default: unlisted (aman untuk tes). Untuk Shorts: video vertikal <= 3 menit + #shorts.
"""
import argparse
import json
import os
import sys

import requests

import auth

UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3/videos"


def upload(path, title, desc="", tags=None, privacy="unlisted", category="24"):
    size = os.path.getsize(path)
    token = auth.get_access_token()
    meta = {
        "snippet": {
            "title": title[:100],
            "description": desc,
            "tags": tags or [],
            "categoryId": category,
        },
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    }
    # 1. init resumable session
    r = requests.post(
        UPLOAD_API,
        params={"uploadType": "resumable", "part": "snippet,status"},
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": str(size),
        },
        data=json.dumps(meta),
        timeout=30,
    )
    if r.status_code != 200:
        raise RuntimeError("init upload gagal: %s %s" % (r.status_code, r.text[:400]))
    session_url = r.headers["Location"]
    # 2. upload bytes
    with open(path, "rb") as f:
        r2 = requests.put(
            session_url,
            headers={"Content-Type": "video/mp4", "Content-Length": str(size)},
            data=f,
            timeout=300,
        )
    if r2.status_code not in (200, 201):
        raise RuntimeError("upload gagal: %s %s" % (r2.status_code, r2.text[:400]))
    v = r2.json()
    return v.get("id")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--title", required=True)
    ap.add_argument("--desc", default="")
    ap.add_argument("--tags", default="shorts,cctv")
    ap.add_argument("--public", action="store_true")
    args = ap.parse_args()
    privacy = "public" if args.public else "unlisted"
    vid = upload(
        args.video,
        args.title,
        args.desc,
        [t.strip() for t in args.tags.split(",") if t.strip()],
        privacy,
    )
    print(json.dumps({"video_id": vid, "privacy": privacy,
                      "url": "https://youtube.com/shorts/" + vid}))


if __name__ == "__main__":
    main()
