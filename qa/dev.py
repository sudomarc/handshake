#!/usr/bin/env python3
"""Handshake QA device toolkit (qa/dev.py). Non-interactive, terminates on its own."""
import argparse, os, re, subprocess, sys, time
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "qa", "out")
os.makedirs(OUT, exist_ok=True)

def adb(args, timeout=30):
    return subprocess.run(["adb"] + args, capture_output=True, timeout=timeout)

def shell(cmd, timeout=30):
    return adb(["shell", cmd], timeout=timeout)

def text(p):
    return p.stdout.decode("utf-8", "replace")

def die(msg, code=1):
    print(f"ERROR: {msg}")
    sys.exit(code)

def cmd_info(a):
    def g(k):
        return text(shell(f"getprop {k}")).strip()
    print(f"manufacturer: {g('ro.product.manufacturer')}")
    print(f"model: {g('ro.product.model')}")
    print(f"android: {g('ro.build.version.release')}")
    print(f"api: {g('ro.build.version.sdk')}")

def cmd_shot(a):
    name = a.name or ("shot_" + time.strftime("%H%M%S"))
    p = os.path.join(OUT, f"{name}.png")
    with open(p, "wb") as f:
        p0 = subprocess.run(["adb", "exec-out", "screencap", "-p"], stdout=f, timeout=30)
    if p0.returncode != 0 or os.path.getsize(p) < 1000:
        die(f"screenshot failed or empty: {p} ({os.path.getsize(p) if os.path.exists(p) else 0} bytes)")
    print(p)

def dump_ui():
    r = shell("uiautomator dump /sdcard/qa_ui.xml")
    if r.returncode != 0:
        die("uiautomator dump failed: " + text(r))
    r2 = subprocess.run(["adb", "exec-out", "cat", "/sdcard/qa_ui.xml"], capture_output=True, timeout=30)
    return text(r2)

def iter_nodes():
    try:
        root = ET.fromstring(dump_ui())
    except ET.ParseError as e:
        die(f"UI XML parse failed: {e}")
    for n in root.iter("node"):
        yield n

def cmd_ui(a):
    n_lines = 0
    for n in iter_nodes():
        t = n.attrib.get("text", "")
        d = n.attrib.get("content-desc", "")
        clickable = n.attrib.get("clickable") == "true"
        if not t and not d:
            continue
        label = t if t else f"[desc] {d}"
        if t and d:
            label = f"{t} | desc:{d}"
        mark = "*" if clickable else " "
        print(f"{mark} {label!r} bounds={n.attrib.get('bounds','?')} pkg={n.attrib.get('package','?')}")
        n_lines += 1
        if n_lines >= 80:
            print("... (truncated at 80)")
            break

def bounds_center(b):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", b)
    if not m:
        return None
    x1, y1, x2, y2 = map(int, m.groups())
    return (x1 + x2) // 2, (y1 + y2) // 2

def cmd_tap(a):
    shell(f"input tap {a.x} {a.y}")
    print(f"tapped {a.x},{a.y}")

def cmd_taptext(a):
    needle = a.text.lower()
    match = None
    for n in iter_nodes():
        for field in (n.attrib.get("text", ""), n.attrib.get("content-desc", "")):
            if needle in field.lower() and field:
                match = n
                break
        if match is not None:
            break
    if match is None:
        die(f"text not found on screen: {a.text!r}")
    c = bounds_center(match.attrib.get("bounds", ""))
    if c is None:
        die("bad bounds on matched node")
    shell(f"input tap {c[0]} {c[1]}")
    print(f"tapped {match.attrib.get('text') or match.attrib.get('content-desc')!r} at {c}")

def cmd_swipe(a):
    ms = a.ms if a.ms else 300
    shell(f"input swipe {a.x1} {a.y1} {a.x2} {a.y2} {ms}")
    print(f"swiped ({a.x1},{a.y1})->({a.x2},{a.y2}) {ms}ms")

def cmd_type(a):
    s = a.text.replace(" ", "%s")
    for c in ('\\', '"', '$', '`'):
        s = s.replace(c, "\\" + c)
    shell(f'input text "{s}"')
    print(f"typed: {a.text!r}")

def key(name):
    codes = {"back": "4", "home": "3", "lock": "223", "wake": "224"}
    shell(f"input keyevent {codes[name]}")
    print(f"{name} ({codes[name]})")

def cmd_back(a): key("back")
def cmd_home(a): key("home")
def cmd_lock(a): key("lock")
def cmd_wake(a): key("wake")

def cmd_launch(a):
    r = shell(f"monkey -p {a.pkg} -c android.intent.category.LAUNCHER 1")
    out = text(r)
    if "No activities found" in out or "Error" in out:
        die(out.strip())
    print(f"launched {a.pkg}")

def cmd_kill(a):
    shell(f"am force-stop {a.pkg}")
    print(f"killed {a.pkg}")

def cmd_logclear(a):
    adb(["logcat", "-c"])
    print("logcat cleared")

KEYWORDS = ["FATAL EXCEPTION", "AndroidRuntime", "ReactNativeJS", "WebRTC", "Telecom", "ForegroundService", "SecurityException"]

def cmd_log(a):
    n = a.n or 50
    r = adb(["logcat", "-d", "-v", "time"], timeout=60)
    p = os.path.join(OUT, "log.txt")
    with open(p, "w", encoding="utf-8", errors="replace") as f:
        f.write(text(r))
    lines = [l for l in text(r).splitlines() if any(k in l for k in KEYWORDS)]
    print(p)
    for l in lines[-n:]:
        print(l)

def cmd_focus(a):
    out = text(shell("dumpsys window"))
    for l in out.splitlines():
        if "mCurrentFocus" in l or "mFocusedApp" in l or "mFocusedWindow" in l:
            print(l.strip())

def cmd_call(a):
    out = text(shell("dumpsys telephony.registry"))
    for l in out.splitlines():
        if "mCallState" in l:
            print(l.strip())
            break
    for l in out.splitlines():
        if "mRingState" in l:
            print(l.strip())
            break

def cmd_audio(a):
    out = text(shell("dumpsys audio"))
    keys = ["Mode:", "mode_NORMAL_CALL", "AudioFocus", "focus", "mic", "MIC", "is_mic", "record"]
    seen = 0
    for l in out.splitlines():
        if any(k in l for k in ("Mode:", "Focus stack:", "focus request", "Mic", "mic", "Record", "record", "MODE_IN_CALL", "mode_")):
            print(l.strip()[:150])
            seen += 1
            if seen > 40:
                break

def cmd_perms(a):
    out = text(shell(f"dumpsys package {a.pkg}"))
    in_runtime = False
    count = 0
    for l in out.splitlines():
        if "runtime permissions" in l.lower() or "runtime Permissions" in l:
            in_runtime = True
            continue
        if in_runtime:
            if l.strip().startswith("Package") or (l and not l.startswith(" ") and ":" not in l):
                in_runtime = False
            m = re.match(r"\s+(\S+): granted=(true|false)", l)
            if m:
                print(f"{'GRANTED' if m.group(2)=='true' else 'denied'}: {m.group(1)}")
                count += 1
    if count == 0:
        # fallback: grep granted= lines anywhere
        for l in out.splitlines():
            m = re.search(r"(\S+): granted=(true|false)", l)
            if m:
                print(f"{'GRANTED' if m.group(2)=='true' else 'denied'}: {m.group(1)}")
                count += 1
                if count > 60: break

def cmd_pkgs(a):
    out = text(shell("pm list packages"))
    f = (a.filter or "").lower()
    for l in out.splitlines():
        if l.startswith("package:") and f in l.lower():
            print(l.replace("package:", ""))

def main():
    p = argparse.ArgumentParser(prog="dev.py")
    sub = p.add_subparsers(dest="sub", required=True)
    sub.add_parser("info").set_defaults(fn=cmd_info)
    s = sub.add_parser("shot"); s.add_argument("name", nargs="?"); s.set_defaults(fn=cmd_shot)
    sub.add_parser("ui").set_defaults(fn=cmd_ui)
    s = sub.add_parser("tap"); s.add_argument("x", type=int); s.add_argument("y", type=int); s.set_defaults(fn=cmd_tap)
    s = sub.add_parser("taptext"); s.add_argument("text"); s.set_defaults(fn=cmd_taptext)
    s = sub.add_parser("swipe"); s.add_argument("x1", type=int); s.add_argument("y1", type=int); s.add_argument("x2", type=int); s.add_argument("y2", type=int); s.add_argument("ms", nargs="?", type=int); s.set_defaults(fn=cmd_swipe)
    s = sub.add_parser("type"); s.add_argument("text"); s.set_defaults(fn=cmd_type)
    sub.add_parser("back").set_defaults(fn=cmd_back)
    sub.add_parser("home").set_defaults(fn=cmd_home)
    sub.add_parser("lock").set_defaults(fn=cmd_lock)
    sub.add_parser("wake").set_defaults(fn=cmd_wake)
    s = sub.add_parser("launch"); s.add_argument("pkg"); s.set_defaults(fn=cmd_launch)
    s = sub.add_parser("kill"); s.add_argument("pkg"); s.set_defaults(fn=cmd_kill)
    sub.add_parser("logclear").set_defaults(fn=cmd_logclear)
    s = sub.add_parser("log"); s.add_argument("n", nargs="?", type=int); s.set_defaults(fn=cmd_log)
    sub.add_parser("focus").set_defaults(fn=cmd_focus)
    sub.add_parser("call").set_defaults(fn=cmd_call)
    sub.add_parser("audio").set_defaults(fn=cmd_audio)
    s = sub.add_parser("perms"); s.add_argument("pkg"); s.set_defaults(fn=cmd_perms)
    s = sub.add_parser("pkgs"); s.add_argument("filter", nargs="?"); s.set_defaults(fn=cmd_pkgs)
    a = p.parse_args()
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        a.fn(a)
    except subprocess.TimeoutExpired:
        die(f"timeout running subcommand {a.sub}")

if __name__ == "__main__":
    main()
