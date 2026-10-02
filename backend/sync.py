#!/usr/bin/env python3
"""Sinkronisasi statistik YouTube -> live.json -> push ke GitHub Pages.

Dijalankan via cron harian. Dashboard membaca live.json untuk status
koneksi + angka live.
"""
import json
import os
import subprocess
from datetime import datetime, timezone, timedelta

import auth

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    info = auth.channel_info()

    # 10 video terbaru + statistiknya
    search = auth.api_get(
        "/search",
        {
            "part": "id",
            "channelId": info["id"],
            "order": "date",
            "type": "video",
            "maxResults": 10,
        },
    )
    vids = [it["id"]["videoId"] for it in search.get("items", [])]
    videos = []
    if vids:
        det = auth.api_get(
            "/videos",
            {"part": "snippet,statistics", "id": ",".join(vids)},
        )
        for v in det.get("items", []):
            st = v.get("statistics", {})
            videos.append(
                {
                    "id": v["id"],
                    "title": v["snippet"]["title"],
                    "published": v["snippet"]["publishedAt"][:10],
                    "views": int(st.get("viewCount", 0)),
                    "likes": int(st.get("likeCount", 0)),
                    "comments": int(st.get("commentCount", 0)),
                }
            )

    wib = timezone(timedelta(hours=7))
    # komentar terbaru di video-video channel
    comments = []
    try:
        ct = auth.api_get(
            "/commentThreads",
            {
                "part": "snippet",
                "allThreadsRelatedToChannelId": info["id"],
                "order": "time",
                "maxResults": 20,
                "textFormat": "plainText",
            },
        )
        vmap = {v["id"]: v["title"] for v in videos}
        for it in ct.get("items", []):
            s = it["snippet"]["topLevelComment"]["snippet"]
            comments.append(
                {
                    "name": s["authorDisplayName"],
                    "text": s["textDisplay"][:300],
                    "video": vmap.get(s["videoId"], "Video"),
                    "videoId": s["videoId"],
                    "time": s["publishedAt"][:10],
                    "likes": s.get("likeCount", 0),
                }
            )
    except Exception as e:
        print("comments skip:", str(e)[:120])

    live = {
        "channel": info,
        "videos": videos,
        "comments": comments,
        "synced_at": datetime.now(wib).strftime("%d %b %H:%M WIB"),
    }
    with open(os.path.join(ROOT, "live.json"), "w") as f:
        json.dump(live, f, ensure_ascii=False, indent=1)

    # push ke repo (Pages)
    subprocess.run(["git", "add", "live.json"], cwd=ROOT, check=True)
    st = subprocess.run(
        ["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True
    )
    if st.stdout.strip():
        subprocess.run(
            ["git", "commit", "-qm", "sync: live YouTube stats"], cwd=ROOT, check=True
        )
        subprocess.run(["git", "push"], cwd=ROOT, check=True)
        print("pushed live.json")
    else:
        print("no changes")
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    main()
