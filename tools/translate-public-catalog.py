#!/usr/bin/env python3
"""Translate ONLY public, static, anonymous KIMSE UI phrases into an offline English catalog.
Never transmit private data, submitted answers, patient records or live user input.
"""
import concurrent.futures
import json
import re
import sys
import time
import urllib.parse
import urllib.request

src, dest = sys.argv[1:3]
with open(src, encoding="utf-8") as f:
    texts = json.load(f)
hangul = re.compile(r"[\uac00-\ud7a3]")


def translated(source):
    query = urllib.parse.urlencode({
        "client": "gtx", "sl": "ko", "tl": "en", "dt": "t", "q": source
    })
    url = "https://translate.googleapis.com/translate_a/single?" + query
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=13) as response:
                if response.status != 200:
                    raise RuntimeError(f"Translation HTTP {response.status}")
                body = json.load(response)
            value = "".join(
                str(row[0] or "")
                for row in (body[0] or [])
                if isinstance(row, list) and len(row) > 0
            ).strip()
            if not value or hangul.search(value) or len(value) > max(750, len(source)*5):
                raise RuntimeError("Empty, Korean, or malformed translation")
            return (source, value)
        except Exception:
            if attempt == 2:
                return (source, None)
            time.sleep(.25*(attempt+1))


def main():
    results = {}
    fails = []
    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(translated, s): s for s in texts}
        for n, future in enumerate(concurrent.futures.as_completed(futures), start=1):
            source, value = future.result()
            if value is not None:
                results[source] = value
            else:
                fails.append(source)
            if n % 200 == 0:
                print("OFFLINE_TRANSLATION_PROGRESS",json.dumps({
                    "processed":n, "total":len(texts), "success":len(results),
                    "failed":len(fails), "seconds":round(time.monotonic()-started,1)
                }), flush=True)
    with open(dest,"w",encoding="utf-8") as f:
        json.dump({"translations":results,"failures":fails},f,ensure_ascii=False)
    print("OFFLINE_TRANSLATION_COMPLETE",json.dumps({
        "total":len(texts), "success":len(results),
        "failed":len(fails), "seconds":round(time.monotonic()-started,1),
        "failureSamples":fails[:12]
    },ensure_ascii=False),flush=True)

if __name__ == "__main__":
    main()
