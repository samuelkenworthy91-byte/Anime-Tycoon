#!/usr/bin/env python3
"""Pixel 9a portrait smoke test for the Slate V3 player flow.

Runs against a locally served production build. This is deliberately UI-level:
Quick Start -> Work/Projects -> Slate -> quarter navigation -> plan -> edit.
It fails on horizontal overflow, undersized core touch targets, or inaccessible
calendar controls.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import ElementClickInterceptedException, StaleElementReferenceException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

URL = os.environ.get("ANIME_RUNNER_URL", "http://127.0.0.1:4173")
OUT = Path(os.environ.get("SMOKE_ARTIFACT_DIR", "artifacts/pixel9a-slate"))
OUT.mkdir(parents=True, exist_ok=True)
VIEWPORT = {"width": 412, "height": 915, "deviceScaleFactor": 2.625, "mobile": True}


def visible_buttons(driver, phrase: str):
    needle = phrase.upper()
    return [
        el for el in driver.find_elements(By.TAG_NAME, "button")
        if el.is_displayed() and needle in (el.text or "").upper()
    ]


def click_text(driver, wait, phrase: str):
    def found(_):
        matches = visible_buttons(driver, phrase)
        return matches[0] if matches else False
    for _ in range(4):
        element = wait.until(found)
        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", element)
        try:
            element.click()
            return element
        except ElementClickInterceptedException:
            dismiss_tutorials(driver, settle=0.35)
    raise AssertionError(f"Could not click {phrase}: a blocking overlay remained")


def dismiss_tutorials(driver, settle=0.0):
    # A fresh browser can surface several first-use explainers. Some mount one
    # React tick after the screen beneath them. Give those overlays a short
    # chance to appear, then close them exactly as a player can.
    if settle:
        time.sleep(settle)
    for _ in range(12):
        closers = [
            el for el in driver.find_elements(By.CSS_SELECTOR, "button[aria-label='Close tutorial']")
            if el.is_displayed()
        ]
        if not closers:
            break
        try:
            closers[0].click()
            time.sleep(0.12)
        except StaleElementReferenceException:
            continue


def assert_no_horizontal_overflow(driver, label: str):
    metrics = driver.execute_script(
        """
        const d = document.documentElement;
        const b = document.body;
        return {
          innerWidth: window.innerWidth,
          documentWidth: d.scrollWidth,
          bodyWidth: b ? b.scrollWidth : 0
        };
        """
    )
    overflow = max(metrics["documentWidth"], metrics["bodyWidth"]) - metrics["innerWidth"]
    if overflow > 2:
        raise AssertionError(f"{label}: horizontal overflow is {overflow}px ({metrics})")
    return metrics


def assert_touch_target(driver, element, label: str, minimum=40):
    rect = driver.execute_script(
        """
        const r = arguments[0].getBoundingClientRect();
        return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
        """,
        element,
    )
    if rect["height"] < minimum:
        raise AssertionError(f"{label}: touch target only {rect['height']:.1f}px tall")
    if rect["left"] < -1 or rect["right"] > VIEWPORT["width"] + 1:
        raise AssertionError(f"{label}: control falls outside 412px viewport: {rect}")
    return rect


def save_shot(driver, name: str):
    path = OUT / f"{name}.png"
    driver.save_screenshot(str(path))
    return str(path)


def main():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--hide-scrollbars")
    options.add_argument("--force-device-scale-factor=1")
    options.add_argument("--window-size=412,915")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Linux; Android 17; Pixel 9a) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36"
    )

    driver = webdriver.Chrome(options=options)
    driver.execute_cdp_cmd("Emulation.setDeviceMetricsOverride", VIEWPORT)
    wait = WebDriverWait(driver, 15)
    report = {"viewport": VIEWPORT.copy(), "checks": [], "screenshots": []}

    try:
        driver.get(URL)
        wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
        wait.until(lambda d: visible_buttons(d, "QUICK START"))
        report["checks"].append({"title": assert_no_horizontal_overflow(driver, "title")})
        report["screenshots"].append(save_shot(driver, "01-title"))

        click_text(driver, wait, "QUICK START")
        wait.until(lambda d: d.find_elements(By.TAG_NAME, "button"))
        dismiss_tutorials(driver)

        # Work/Projects is the compact Pixel-width dock label.
        work_button = wait.until(
            lambda d: next(
                (
                    el for el in d.find_elements(By.TAG_NAME, "button")
                    if el.is_displayed() and (
                        "WORK" in (el.text or "").upper()
                        or "PROJECTS" in (el.text or "").upper()
                    )
                ),
                False,
            )
        )
        assert_touch_target(driver, work_button, "Work/Projects dock button", 36)
        work_button.click()
        wait.until(lambda d: "STUDIO SLATE" in (d.find_element(By.TAG_NAME, "body").text or ""))
        dismiss_tutorials(driver, settle=0.5)
        report["checks"].append({"projects": assert_no_horizontal_overflow(driver, "projects")})
        report["screenshots"].append(save_shot(driver, "02-projects-slate-card"))

        open_button = click_text(driver, wait, "OPEN PRODUCTION CALENDAR")
        assert_touch_target(driver, open_button, "Open Production Calendar", 40)
        wait.until(lambda d: "PRODUCTION CALENDAR" in (d.find_element(By.TAG_NAME, "body").text or ""))
        report["checks"].append({"calendar": assert_no_horizontal_overflow(driver, "calendar")})
        report["screenshots"].append(save_shot(driver, "03-calendar"))

        quarter_rects = {}
        for q in ("Q1", "Q2", "Q3", "Q4"):
            matches = [el for el in visible_buttons(driver, q) if (el.text or "").strip().upper() == q]
            if not matches:
                raise AssertionError(f"Calendar missing direct {q} navigation button")
            quarter_rects[q] = assert_touch_target(driver, matches[0], q, 39)
        report["checks"].append({"quarterButtons": quarter_rects})

        # Prove quarter switching works without lateral navigation.
        q2 = [el for el in visible_buttons(driver, "Q2") if (el.text or "").strip().upper() == "Q2"][0]
        q2.click()
        wait.until(lambda d: "Q2 ·" in (d.find_element(By.TAG_NAME, "body").text or ""))
        q1 = [el for el in visible_buttons(driver, "Q1") if (el.text or "").strip().upper() == "Q1"][0]
        q1.click()
        wait.until(lambda d: "Q1 ·" in (d.find_element(By.TAG_NAME, "body").text or ""))

        plan_button = click_text(driver, wait, "PLAN A SHOW")
        assert_touch_target(driver, plan_button, "Plan A Show", 44)
        wait.until(lambda d: visible_buttons(d, "ADD TO CALENDAR"))
        report["checks"].append({"planner": assert_no_horizontal_overflow(driver, "planner")})
        report["screenshots"].append(save_shot(driver, "04-plan-a-show"))

        for label in ("ORIGINAL", "STANDARD", "EARLY", "MID", "LATE", "END"):
            matches = [el for el in visible_buttons(driver, label) if label in (el.text or "").upper()]
            if not matches:
                raise AssertionError(f"Planner missing {label} choice")
            assert_touch_target(driver, matches[0], f"Planner {label}", 40)

        add_button = click_text(driver, wait, "ADD TO CALENDAR")
        assert_touch_target(driver, add_button, "Add to Calendar", 44)
        wait.until(lambda d: visible_buttons(d, "EDIT PLAN") and visible_buttons(d, "GREENLIGHT / SET UP"))
        report["checks"].append({"plannedCard": assert_no_horizontal_overflow(driver, "planned card")})

        action_rects = {}
        for label in ("GREENLIGHT / SET UP", "EDIT PLAN", "1 WEEK"):
            matches = visible_buttons(driver, label)
            if not matches:
                raise AssertionError(f"Planned show missing {label} action")
            for index, element in enumerate(matches):
                action_rects[f"{label}-{index+1}"] = assert_touch_target(
                    driver, element, f"{label} {index+1}", 40
                )
        report["checks"].append({"plannedActions": action_rects})

        strips = [el for el in driver.find_elements(By.CSS_SELECTOR, "[aria-label='Twelve week production strip']") if el.is_displayed()]
        if not strips:
            raise AssertionError("Planned show did not render its production-stage strip")
        for index, strip in enumerate(strips):
            strip_box = driver.execute_script(
                "const r=arguments[0].getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width,height:r.height};",
                strip,
            )
            if strip_box["right"] > VIEWPORT["width"] + 1 or strip_box["left"] < -1:
                raise AssertionError(f"Production strip {index+1} exceeds Pixel width: {strip_box}")
        report["checks"].append({"productionStrips": len(strips)})
        report["screenshots"].append(save_shot(driver, "05-planned-show"))

        edit_button = visible_buttons(driver, "EDIT PLAN")[0]
        edit_button.click()
        wait.until(lambda d: visible_buttons(d, "SAVE CHANGES"))
        save_button = visible_buttons(driver, "SAVE CHANGES")[0]
        assert_touch_target(driver, save_button, "Save Changes", 44)
        report["checks"].append({"editPlan": assert_no_horizontal_overflow(driver, "edit plan")})
        report["screenshots"].append(save_shot(driver, "06-edit-plan"))

        # The compact timeline should expose four grouped week headers, not
        # twelve tiny week cells.
        body_text = driver.find_element(By.TAG_NAME, "body").text
        for heading in ("W1–3", "W4–6", "W7–9", "W10–12"):
            if heading not in body_text:
                raise AssertionError(f"Missing grouped week header {heading}")
        report["checks"].append({"groupedWeekHeaders": True})

        print(json.dumps(report, indent=2))
    except (AssertionError, TimeoutException) as exc:
        save_shot(driver, "FAIL")
        print(f"PIXEL9A_SLATE_SMOKE_FAILED: {exc}", file=sys.stderr)
        raise
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
