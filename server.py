from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime, timedelta
import json, shutil, urllib.parse

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "listings.json"
BACKUPS = ROOT / "data" / "backups"
BACKUPS.mkdir(parents=True, exist_ok=True)
WEEK = timedelta(days=7)

def now():
    return datetime.now().astimezone()

def iso(dt):
    return dt.isoformat(timespec="seconds")

def load_data():
    try:
        return json.loads(DATA.read_text(encoding="utf-8"))
    except Exception:
        backup_files = sorted(BACKUPS.glob("listings-*.json"), reverse=True)
        if backup_files:
            restored = json.loads(backup_files[0].read_text(encoding="utf-8"))
            DATA.write_text(json.dumps(restored, indent=2, ensure_ascii=False), encoding="utf-8")
            return restored
        raise

def save_data(data):
    # Refresh one dated backup every day. This is intentionally done before writing
    # the updated main file, so a previous good version remains recoverable.
    today = now().date().isoformat()
    backup = BACKUPS / f"listings-{today}.json"
    if not backup.exists() and DATA.exists():
        shutil.copy2(DATA, backup)
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

def cleanup_expired(data):
    current = now()
    kept=[]
    changed=False
    for item in data.get("listings", []):
        try:
            expiry=datetime.fromisoformat(item["expiresAt"])
            if expiry > current:
                kept.append(item)
            else:
                changed=True
        except Exception:
            # Preserve malformed entries rather than silently deleting data.
            kept.append(item)
    if changed:
        data["listings"]=kept
    return data, changed

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control","no-store, no-cache, must-revalidate")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/api/health":
            return self.json_response({"ok": True})
        super().do_GET()

    def do_POST(self):
        path=urllib.parse.urlparse(self.path).path
        if path != "/api/add-listing":
            self.send_error(404); return
        try:
            length=int(self.headers.get("Content-Length","0"))
            payload=json.loads(self.rfile.read(length).decode("utf-8"))
            required=["type","owner","city","brand","casting","details","contact"]
            if any(not payload.get(k) for k in required):
                return self.json_response({"error":"Missing required fields"},400)
            if payload["type"] not in {"ISO","TRADE","SELL"}:
                return self.json_response({"error":"Invalid listing type"},400)
            data=load_data()
            data,_=cleanup_expired(data)
            number=int(data.get("nextNumber",1))
            listing_id=f"MCD{number:03d}"
            posted=now()
            listing={
                "id":listing_id,"type":payload["type"],"postedAt":iso(posted),
                "expiresAt":iso(posted+WEEK),"owner":str(payload["owner"]).strip(),
                "city":str(payload["city"]).strip(),"locality":str(payload.get("locality","")).strip(),
                "contact":payload["contact"],"brand":str(payload["brand"]).strip(),
                "casting":str(payload["casting"]).strip(),"details":str(payload["details"]).strip(),
                "have":str(payload.get("have","")).strip(),"want":str(payload.get("want","")).strip(),
                "price":str(payload.get("price","")).strip(),"image":""
            }
            data.setdefault("listings",[]).append(listing)
            data["nextNumber"]=number+1
            save_data(data)
            self.json_response({"ok":True,"id":listing_id})
        except Exception as e:
            self.json_response({"error":str(e)},500)

    def json_response(self,obj,status=200):
        raw=json.dumps(obj,ensure_ascii=False).encode("utf-8")
        self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(raw))); self.end_headers(); self.wfile.write(raw)

if __name__=="__main__":
    print("Middleclass Diecast BST")
    print("Open: http://localhost:8000")
    print("Press Ctrl+C to stop.")
    ThreadingHTTPServer(("0.0.0.0",8000),Handler).serve_forever()
