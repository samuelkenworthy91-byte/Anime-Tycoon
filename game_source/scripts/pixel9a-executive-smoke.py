#!/usr/bin/env python3
"""Pixel 9a executive-workflow smoke.

Quick Start -> More -> Management Policy -> Studio DNA -> direct Overseas ->
Pause -> manual save. This guards the mature-studio three-click paths added by
the polish pass and checks that the 412px portrait target remains usable.
"""
from __future__ import annotations
import json, os, sys, time
from pathlib import Path
from selenium import webdriver
from selenium.common.exceptions import ElementClickInterceptedException, StaleElementReferenceException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

URL=os.environ.get("ANIME_RUNNER_URL","http://127.0.0.1:4173")
OUT=Path(os.environ.get("SMOKE_ARTIFACT_DIR","artifacts/pixel9a-executive"))
OUT.mkdir(parents=True,exist_ok=True)
VIEWPORT={"width":412,"height":915,"deviceScaleFactor":2.625,"mobile":True}

def visible_buttons(driver,phrase):
    needle=phrase.upper()
    out=[]
    for el in driver.find_elements(By.TAG_NAME,"button"):
        try:
            if el.is_displayed() and needle in (el.text or "").upper():
                out.append(el)
        except StaleElementReferenceException:
            # React may replace buttons while a modal/save picker is mounting.
            # Retry on the next poll rather than treating a healthy rerender as failure.
            continue
    return out

def dismiss_tutorials(driver):
    for _ in range(16):
        closers=[el for el in driver.find_elements(By.CSS_SELECTOR,"button[aria-label='Close tutorial']") if el.is_displayed()]
        if not closers: break
        try: closers[0].click(); time.sleep(.12)
        except Exception: pass

def click_text(driver,wait,phrase):
    for _ in range(5):
        matches=visible_buttons(driver,phrase)
        if not matches:
            time.sleep(.25); dismiss_tutorials(driver); continue
        el=matches[0]
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});",el)
        try: el.click(); return el
        except ElementClickInterceptedException:
            dismiss_tutorials(driver); time.sleep(.2)
    raise AssertionError(f"Could not click {phrase}")

def no_overflow(driver,label):
    m=driver.execute_script("return {w:innerWidth,d:document.documentElement.scrollWidth,b:document.body.scrollWidth}")
    overflow=max(m["d"],m["b"])-m["w"]
    if overflow>2: raise AssertionError(f"{label}: horizontal overflow {overflow}px {m}")
    return m

def touch(driver,el,label,minimum=40):
    r=driver.execute_script("const r=arguments[0].getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height}",el)
    if r["height"]<minimum: raise AssertionError(f"{label}: {r['height']:.1f}px touch height")
    if r["left"]<-1 or r["right"]>VIEWPORT["width"]+1: raise AssertionError(f"{label}: outside viewport {r}")
    return r

def close_modal(driver,wait):
    # First-seen tutorials deliberately sit above their underlying panel.
    # Treat that as valid onboarding, dismiss it, then close the panel itself.
    dismiss_tutorials(driver)
    btn=wait.until(lambda d: next((e for e in d.find_elements(By.CSS_SELECTOR,"button[aria-label='Close']") if e.is_displayed()),False))
    touch(driver,btn,"Modal close",40)
    try:
        btn.click()
    except ElementClickInterceptedException:
        dismiss_tutorials(driver)
        btn.click()

def shot(driver,name):
    path=OUT/f"{name}.png"; driver.save_screenshot(str(path)); return str(path)

def main():
    options=Options()
    for arg in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu","--hide-scrollbars","--force-device-scale-factor=1","--window-size=412,915"): options.add_argument(arg)
    options.add_argument("--user-agent=Mozilla/5.0 (Linux; Android 17; Pixel 9a) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36")
    driver=webdriver.Chrome(options=options)
    driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride",VIEWPORT)
    wait=WebDriverWait(driver,15)
    report={"viewport":VIEWPORT.copy(),"checks":[],"screenshots":[]}
    try:
        driver.get(URL)
        wait.until(lambda d: visible_buttons(d,"QUICK START"))
        click_text(driver,wait,"QUICK START")
        time.sleep(.4); dismiss_tutorials(driver)
        report["checks"].append({"office":no_overflow(driver,"office")})

        more=wait.until(lambda d: visible_buttons(d,"MORE")[0] if visible_buttons(d,"MORE") else False)
        touch(driver,more,"More dock",36); more.click()
        time.sleep(.2); dismiss_tutorials(driver)
        for label in ("CREATOR AMBITIONS","OVERSEAS MARKETS","MANAGEMENT POLICY","STUDIO DNA"):
            matches=visible_buttons(driver,label)
            if not matches: raise AssertionError(f"Studio Menu missing direct {label}")
            touch(driver,matches[0],label,40)
        report["checks"].append({"studioMenu":no_overflow(driver,"studio menu")})
        report["screenshots"].append(shot(driver,"01-studio-menu"))

        click_text(driver,wait,"MANAGEMENT POLICY")
        for label in ("HANDS-ON","ROUTINE AUTO","PROTECT FLAGSHIPS","MINIMUM STAFF","FASTEST FINISH","EXCEPTIONS ONLY"):
            matches=visible_buttons(driver,label)
            if not matches: raise AssertionError(f"Management Policy missing {label}")
            touch(driver,matches[0],label,40)
        click_text(driver,wait,"PROTECT FLAGSHIPS")
        report["checks"].append({"management":no_overflow(driver,"management")})
        report["screenshots"].append(shot(driver,"02-management"))
        close_modal(driver,wait)

        click_text(driver,wait,"MORE"); click_text(driver,wait,"STUDIO DNA")
        wait.until(lambda d: "CREATIVE LANGUAGE" in (d.find_element(By.TAG_NAME,"body").text or ""))
        report["checks"].append({"dna":no_overflow(driver,"studio dna")})
        report["screenshots"].append(shot(driver,"03-studio-dna"))
        close_modal(driver,wait)

        click_text(driver,wait,"MORE"); click_text(driver,wait,"OVERSEAS MARKETS")
        wait.until(lambda d: "OVERSEAS" in (d.find_element(By.TAG_NAME,"body").text or "").upper())
        report["checks"].append({"overseasDirect":no_overflow(driver,"overseas direct")})
        report["screenshots"].append(shot(driver,"04-overseas"))
        close_modal(driver,wait)

        controls=wait.until(lambda d: next((e for e in d.find_elements(By.CSS_SELECTOR,"button[aria-label='Open sound and speed controls']") if e.is_displayed()),False))
        touch(driver,controls,"Open sound and speed controls",36); controls.click()
        pause=wait.until(lambda d: next((e for e in d.find_elements(By.CSS_SELECTOR,"button[aria-label='Pause']") if e.is_displayed()),False))
        touch(driver,pause,"Pause",36); pause.click()
        click_text(driver,wait,"SAVE GAME")
        slot=wait.until(lambda d: visible_buttons(d,"SLOT 1")[0] if visible_buttons(d,"SLOT 1") else False)
        touch(driver,slot,"Save Slot 1",40); slot.click()
        wait.until(lambda d: "SAVED TO SLOT 1" in (d.find_element(By.TAG_NAME,"body").text or "").upper())
        exports=[e for e in driver.find_elements(By.CSS_SELECTOR,"button[aria-label='Export SLOT 1']") if e.is_displayed()]
        if not exports: raise AssertionError("Saved manual slot does not expose export control")
        touch(driver,exports[0],"Export Slot 1",36)
        report["checks"].append({"save":no_overflow(driver,"save picker")})
        report["screenshots"].append(shot(driver,"05-save-recovery"))

        print(json.dumps(report,indent=2))
    except (AssertionError,TimeoutException) as exc:
        shot(driver,"FAIL")
        print(f"PIXEL9A_EXECUTIVE_SMOKE_FAILED: {exc}",file=sys.stderr)
        raise
    finally:
        driver.quit()

if __name__=="__main__":
    main()
