import subprocess,json,time,urllib.request,base64,os
PORT=4484
base=f"http://127.0.0.1:{PORT}"
proc=subprocess.Popen(["/snap/bin/geckodriver","--port",str(PORT)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
def req(method,path,data=None):
    body=None if data is None else json.dumps(data).encode()
    q=urllib.request.Request(base+path,data=body,method=method,headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(q,timeout=60) as r:
        return json.loads(r.read().decode() or "{}")
def js(sid,script):
    return req("POST",f"/session/{sid}/execute/sync",{"script":script,"args":[]})["value"]
def key(sid,k):
    return js(sid, f"window.dispatchEvent(new KeyboardEvent('keydown',{{key:{json.dumps(k)},bubbles:true,cancelable:true}}));return true;")
def click(sid,selector):
    return js(sid, "const e=document.querySelector("+json.dumps(selector)+");if(!e)throw new Error('missing '+ "+json.dumps(selector)+");e.click();return true;")
def dbg(sid):
    raw=js(sid,"return document.getElementById('debug')?.textContent||'{}';")
    try:return json.loads(raw)
    except:return {"raw":raw}
try:
    for _ in range(100):
        try:urllib.request.urlopen(base+"/status",timeout=1).read();break
        except:time.sleep(.08)
    ses=req("POST","/session",{"capabilities":{"alwaysMatch":{"browserName":"firefox","moz:firefoxOptions":{"args":["-headless"],"prefs":{"media.autoplay.default":0,"media.autoplay.blocking_policy":0}}}}})
    sid=ses["value"]["sessionId"]
    req("POST",f"/session/{sid}/window/rect",{"width":900,"height":900})
    req("POST",f"/session/{sid}/url",{"url":"http://127.0.0.1:18082/?openingSpeed=50"})
    for _ in range(220):
        ready=js(sid,"return document.getElementById('web-controller')?.dataset.ready==='1' && !document.getElementById('run-button').disabled && !!window.__uw2MusicState;")
        if ready: break
        time.sleep(.1)

    music0=js(sid,"return window.__uw2MusicState?.()||null;")
    js(sid,"document.querySelectorAll('#save-slots button:not(:disabled)')[1].click();return true;")
    click(sid,'[data-action="start"]')
    time.sleep(.35)
    start_state=dbg(sid)
    music1=js(sid,"return window.__uw2MusicState?.()||null;")

    # João/Danzig starts one tile below Harbor door. Enter Harbor then confirm sail.
    key(sid,"ArrowUp"); time.sleep(.12)
    key(sid,"Enter"); time.sleep(.12)
    if dbg(sid).get("mode")!="sea":
        key(sid,"Enter"); time.sleep(.2)
    sea0=dbg(sid)
    if sea0.get("mode")!="sea":
        raise RuntimeError("failed to enter sea: "+json.dumps(sea0,ensure_ascii=False))

    key(sid,"ArrowRight"); key(sid,"ArrowRight"); time.sleep(.1)
    voyage0=js(sid,"return window.__uw2VoyageState?.()||null;")
    click(sid,'[data-action="auto-sail"]')
    time.sleep(.75)
    voyage_auto=js(sid,"return window.__uw2VoyageState?.()||null;")
    auto_pressed=js(sid,"return document.querySelector('[data-action=auto-sail]').getAttribute('aria-pressed');")
    click(sid,'[data-action="auto-sail"]')
    time.sleep(.1)
    voyage_stop=js(sid,"return window.__uw2VoyageState?.()||null;")

    # Force one full in-game day worth of 20-minute ticks to verify daily provision consumption.
    before_daily=js(sid,"return window.__uw2VoyageState?.()||null;")
    for _ in range(72):
        key(sid,"ArrowUp")
    time.sleep(.25)
    after_daily=js(sid,"return window.__uw2VoyageState?.()||null;")

    # Firefox test profile allows AudioContext playback in headless validation.
    click(sid,'[data-action="sound"]')
    time.sleep(.25)
    music2=js(sid,"return window.__uw2MusicState?.()||null;")
    click(sid,'[data-action="track-next"]')
    time.sleep(.15)
    music3=js(sid,"return window.__uw2MusicState?.()||null;")

    req("POST",f"/session/{sid}/window/rect",{"width":500,"height":820})
    time.sleep(.15)
    geom=js(sid,"return {vw:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,controller:document.getElementById('web-controller').getBoundingClientRect().toJSON(),mode:document.getElementById('controller-mode').textContent,music:document.getElementById('controller-music').textContent};")
    png=req("GET",f"/session/{sid}/screenshot")["value"]
    shot="/home/chatgpt-runner/uw2-web/tests/controller-music-auto-sail.png"
    open(shot,"wb").write(base64.b64decode(png))
    req("DELETE",f"/session/{sid}")

    def prov(v):
        ships=((v or {}).get("fleet") or {}).get("ships") or []
        return [(x.get("water"),x.get("food")) for x in ships]

    print(json.dumps({
      "music0":music0,"start":start_state,"music1":music1,
      "sea0":sea0,
      "auto":{"beforeTicks":voyage0["sea"]["ticks"],"afterTicks":voyage_auto["sea"]["ticks"],"pressed":auto_pressed,"stoppedTicks":voyage_stop["sea"]["ticks"]},
      "daily":{"beforeDate":before_daily["dateTime"],"afterDate":after_daily["dateTime"],"beforeProv":prov(before_daily),"afterProv":prov(after_daily),"marker":after_daily.get("lastSeaProvisionDate")},
      "music2":music2,"music3":music3,
      "geom":geom,"shot":shot,"size":os.path.getsize(shot)
    },ensure_ascii=False,indent=2))
finally:
    proc.terminate()
    try:proc.wait(timeout=5)
    except:proc.kill()