#!/usr/bin/env python3
"""Sinkronisasi portofolio multi-channel -> portfolio.json -> push GitHub Pages.

Dipakai cron harian (digabung ke yt-studio-stats-sync). Untuk tiap channel
di portfolio.json yang bertanda oauth:true, tarik statistik via YouTube Data
API (subs, views, jumlah video). Watch hours 365 hari diambil dari YouTube
Analytics API bila scope yt-analytics.readonly sudah diotorisasi; kalau belum,
nilai manual (watch_hours_manual) dipertahankan.

Jalankan: python3 monitor_sync.py
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta

import auth

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
PORTFOLIO = os.path.join(BASE, "portfolio.json")
ANALYTICS = "https://youtubeanalytics.googleapis.com/v2"


def analytics_report(channel_id, metrics, start, end):
    """Query YouTube Analytics API. Return None bila scope belum diotorisasi."""
    try:
        r = __import__("requests").get(
            ANALYTICS + "/reports",
            params={
                "ids": "channel==%s" % channel_id,
                "startDate": start,
                "endDate": end,
                "metrics": metrics,
            },
            headers={"Authorization": "Bearer " + auth.get_access_token()},
            timeout=20,
        )
        if r.status_code == 403:
            return None
        r.raise_for_status()
        rows = r.json().get("rows", [])
        return rows[0] if rows else [0] * len(metrics.split(","))
    except Exception as e:
        print("analytics skip %s: %s" % (channel_id, str(e)[:100]))
        return None


def main():
    with open(PORTFOLIO) as f:
        pf = json.load(f)

    today = datetime.now(timezone.utc).date()
    def ago(n):
        return (today - timedelta(days=n)).isoformat()

    for ch in pf["channels"]:
        if not ch.get("oauth"):
            continue
        cid = ch["id"]
        try:
            d = auth.api_get(
                "/channels",
                {"part": "snippet,statistics", "id": cid},
            )
            items = d.get("items", [])
            if not items:
                print("channel tidak ditemukan:", cid)
                continue
            st = items[0]["statistics"]
            ch["subs"] = int(st.get("subscriberCount", ch.get("subs", 0)))
            ch["views"] = int(st.get("viewCount", ch.get("views", 0)))
            ch["videos"] = int(st.get("videoCount", ch.get("videos", 0)))
            if not ch.get("handle"):
                sn = items[0]["snippet"]
                ch["handle"] = sn.get("customUrl", "")
            # video terbaru
            try:
                s = auth.api_get("/search", {
                    "part": "id", "channelId": cid, "order": "date",
                    "type": "video", "maxResults": 5,
                })
                vids = [it["id"]["videoId"] for it in s.get("items", [])]
                if vids:
                    det = auth.api_get("/videos", {
                        "part": "snippet,statistics,status",
                        "id": ",".join(vids),
                    })
                    vd = []
                    for v in det.get("items", []):
                        vst = v.get("statistics", {})
                        vd.append({
                            "id": v["id"],
                            "title": v["snippet"]["title"],
                            "published": v["snippet"]["publishedAt"][:10],
                            "views": int(vst.get("viewCount", 0)),
                            "comments": int(vst.get("commentCount", 0)),
                            "visibility": {"public": "Publik", "private": "Pribadi",
                                           "unlisted": "Tidak publik"}.get(
                                v.get("status", {}).get("privacyStatus", ""), "—"),
                            "notices": "Tidak ada",
                        })
                    ch["videos_detail"] = vd
                    ch["last_publish"] = vd[0]["published"]
            except Exception as e:
                print("videos skip:", str(e)[:100])
        except Exception as e:
            print("sync gagal %s: %s" % (ch.get("name"), str(e)[:150]))
            continue

        # Analytics per rentang (butuh scope yt-analytics.readonly)
        ranges = ch.setdefault("ranges", {})
        for key, days in (("7", 7), ("28", 28), ("90", 90), ("365", 365)):
            row = analytics_report(
                cid, "views,estimatedMinutesWatched,subscribersGained",
                ago(days), ago(1),
            )
            if row:
                ranges[key] = {
                    "views": int(row[0] or 0),
                    "watch_hours": round((row[1] or 0) / 60, 1),
                    "subs_gained": int(row[2] or 0),
                }
        row365 = (ranges.get("365") or {})
        if row365.get("watch_hours"):
            ch["watch_hours_365"] = row365["watch_hours"]
            ch["watch_hours_manual"] = False

    wib = timezone(timedelta(hours=7))
    pf["updated_at"] = datetime.now(wib).strftime("%d %b %Y %H:%M WIB")
    with open(PORTFOLIO, "w") as f:
        json.dump(pf, f, ensure_ascii=False, indent=1)

    # salin ke root agar dibaca dashboard statis, lalu push
    subprocess.run(["cp", PORTFOLIO, os.path.join(ROOT, "portfolio.json")],
                   check=True)
    subprocess.run(["git", "add", "portfolio.json"], cwd=ROOT, check=True)
    st = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                        capture_output=True, text=True)
    if st.stdout.strip():
        subprocess.run(["git", "commit", "-qm", "sync: portfolio monitor"],
                       cwd=ROOT, check=True)
        subprocess.run(["git", "push"], cwd=ROOT, check=True)
        print("pushed portfolio.json")
    else:
        print("no changes")


if __name__ == "__main__":
    main()
