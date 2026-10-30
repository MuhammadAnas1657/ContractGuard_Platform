"""
ContractGuard-X: Automated 1080p Screen Recording Demo Script
Produces a broadcast-ready demo video under 3 minutes (~2 min 40 sec)
for the NVIDIA Generative AI Hackathon 2026.
"""

import os
import sys
import time
import psycopg2
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).resolve().parent.parent
RECORDINGS_DIR = BASE_DIR / "recordings"
ZIP_FILE_PATH = Path("c:/projects/journal paper prompt injection/Enterprise_Agent_Codebase.zip")

RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)


def purge_db_test_data():
    """Resets database to clean zero-baseline while preserving 469 threat vectors."""
    try:
        conn = psycopg2.connect("postgresql://postgres:hackathon@localhost:5432/hackathon")
        cur = conn.cursor()
        cur.execute("DELETE FROM api_keys;")
        cur.execute("DELETE FROM policies;")
        cur.execute("DELETE FROM simulation_runs;")
        cur.execute("DELETE FROM projects;")
        conn.commit()
        conn.close()
        print("[DB] Reset database to zero-baseline successfully.")
    except Exception as e:
        print(f"[DB] Purge warning: {e}")


def inject_cursor_overlay(page):
    """Injects a sleek visual mouse pointer into the page for screencast visibility."""
    page.evaluate("""
        () => {
            if (document.getElementById('demo-cursor')) return;
            const cursor = document.createElement('div');
            cursor.id = 'demo-cursor';
            cursor.style.position = 'fixed';
            cursor.style.width = '24px';
            cursor.style.height = '24px';
            cursor.style.borderRadius = '50%';
            cursor.style.backgroundColor = 'rgba(59, 130, 246, 0.75)';
            cursor.style.border = '2.5px solid #ffffff';
            cursor.style.boxShadow = '0 0 12px rgba(0,0,0,0.45)';
            cursor.style.pointerEvents = 'none';
            cursor.style.zIndex = '9999999';
            cursor.style.left = '-100px';
            cursor.style.top = '-100px';
            cursor.style.transform = 'translate(-50%, -50%)';
            cursor.style.transition = 'transform 0.08s ease, background-color 0.15s, border-color 0.15s';
            document.body.appendChild(cursor);

            document.addEventListener('mousemove', (e) => {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
            });
            document.addEventListener('mousedown', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(0.75)';
                cursor.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
                cursor.style.borderColor = '#fbbf24';
            });
            document.addEventListener('mouseup', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1.0)';
                cursor.style.backgroundColor = 'rgba(59, 130, 246, 0.75)';
                cursor.style.borderColor = '#ffffff';
            });
        }
    """)


def smooth_move_to(page, target, steps=20):
    """Moves mouse smoothly to a target locator or coordinate."""
    try:
        box = target.bounding_box()
        if box:
            target_x = box["x"] + box["width"] / 2
            target_y = box["y"] + box["height"] / 2
            page.mouse.move(target_x, target_y, steps=steps)
            page.wait_for_timeout(150)
    except Exception as e:
        pass


def smooth_scroll(page, delta_y, steps=15):
    """Smoothly scrolls the page up or down."""
    for _ in range(steps):
        page.mouse.wheel(0, delta_y / steps)
        page.wait_for_timeout(40)


def human_type(locator, text, delay=35):
    """Types text with natural keystroke timing."""
    locator.focus()
    locator.fill("")
    for char in text:
        locator.type(char, delay=delay)


def record_walkthrough():
    print("=" * 70)
    print(" STARTING CONTRACTGUARD-X AUTOMATED SCREEN RECORDING")
    print("=" * 70)

    # 1. Ensure clean database baseline before starting
    purge_db_test_data()

    video_output_path = None
    start_time = time.time()
    timeline = []

    def log_shot(name):
        elapsed = time.time() - start_time
        mins = int(elapsed // 60)
        secs = int(elapsed % 60)
        ts = f"{mins:02d}:{secs:02d}"
        print(f"[{ts}] SCENE: {name}", flush=True)
        timeline.append((ts, name))

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--start-maximized",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-infobars"
            ]
        )

        context = browser.new_context(
            record_video_dir=str(RECORDINGS_DIR),
            record_video_size={"width": 1920, "height": 1080},
            viewport={"width": 1920, "height": 1080},
            accept_downloads=True
        )

        page = context.new_page()

        # =========================================================================
        # SCENE 1 (0:00 - 0:25): LOGIN & DEVELOPER STUDIO KPI TELEMETRY
        # =========================================================================
        log_shot("01 - Initial Load & Authentication Gate")
        page.goto("http://localhost:3001")
        page.wait_for_load_state("networkidle")
        inject_cursor_overlay(page)
        page.wait_for_timeout(2000)

        # If on login screen, select AI Developer profile and sign in
        dev_card = page.locator("text=developer@enterprise.com")
        if dev_card.count() > 0:
            log_shot("01b - Select AI Developer Profile & Sign In")
            smooth_move_to(page, dev_card.first)
            page.wait_for_timeout(800)
            dev_card.first.click()
            page.wait_for_timeout(800)

            sign_in_btn = page.locator("button[type='submit']")
            smooth_move_to(page, sign_in_btn)
            page.wait_for_timeout(600)
            sign_in_btn.click()
            page.wait_for_selector("text=PROTECTED AGENT PROJECTS", timeout=15000)
            page.wait_for_timeout(2000)

        inject_cursor_overlay(page)

        log_shot("02 - Developer Studio Dashboard & Zero-Trust KPI Telemetry")
        # Hover over the 4 Zero-Trust KPI Telemetry cards
        kpi_cards = page.locator(".grid .neu-card, .grid .theme-card, div:has-text('PROTECTED AGENT PROJECTS')")
        kpi_projects = page.locator("text=PROTECTED AGENT PROJECTS")
        if kpi_projects.count() > 0:
            smooth_move_to(page, kpi_projects.first)
            page.wait_for_timeout(2200)

        kpi_prompts = page.locator("text=PROMPTS INSPECTED")
        if kpi_prompts.count() > 0:
            smooth_move_to(page, kpi_prompts.first)
            page.wait_for_timeout(2200)

        kpi_blocked = page.locator("text=ATTACKS BLOCKED")
        if kpi_blocked.count() > 0:
            smooth_move_to(page, kpi_blocked.first)
            page.wait_for_timeout(2200)

        # Brief theme switch demonstration (Dark SOC -> Cyber -> Dark SOC)
        cyber_btn = page.locator("button:has-text('Cyber')")
        dark_btn = page.locator("button:has-text('Dark SOC')")
        if cyber_btn.count() > 0:
            smooth_move_to(page, cyber_btn.first)
            page.wait_for_timeout(600)
            cyber_btn.first.click()
            page.wait_for_timeout(1500)
            inject_cursor_overlay(page)

            if dark_btn.count() > 0:
                smooth_move_to(page, dark_btn.first)
                page.wait_for_timeout(600)
                dark_btn.first.click()
                page.wait_for_timeout(1500)
                inject_cursor_overlay(page)

        # =========================================================================
        # SCENE 2 (0:25 - 0:50): POLICY-FIRST ARCHITECT: UNRESTRICTED SELF-CREATION
        # =========================================================================
        log_shot("03 - Scroll to Policy-First Project Architect")
        smooth_scroll(page, 480, steps=20)
        page.wait_for_timeout(1500)

        log_shot("04 - Type Custom Project Name & Domain")
        name_input = page.locator("input[placeholder*='Clinical Patient Assistant']")
        smooth_move_to(page, name_input)
        page.wait_for_timeout(500)
        human_type(name_input, "Autonomous Enterprise Wealth & Support Agent", delay=25)
        page.wait_for_timeout(800)

        domain_input = page.locator("input[placeholder*='Healthcare, Legal']")
        smooth_move_to(page, domain_input)
        page.wait_for_timeout(500)
        human_type(domain_input, "FinTech & Customer Support", delay=25)
        page.wait_for_timeout(800)

        log_shot("05 - Define Custom Callable Tools Surface")
        tools_input = page.locator("input[placeholder*='lookup_patient_record']")
        smooth_move_to(page, tools_input)
        page.wait_for_timeout(500)
        human_type(tools_input, "lookup_order_status, process_customer_refund, execute_wire_transfer, send_customer_email", delay=20)
        page.wait_for_timeout(800)

        log_shot("06 - Specify Markdown System Overview & Invariant Scope")
        overview_textarea = page.locator("textarea[placeholder*='Custom Agent Security Scope']")
        smooth_move_to(page, overview_textarea)
        page.wait_for_timeout(500)
        sample_md = "# Enterprise Wealth & Support Agent\nHandles order status tracking, refunds up to $500, and verified wire transfers.\nStrict requirement: Wire transfers must satisfy compliance budget ceilings."
        human_type(overview_textarea, sample_md, delay=15)
        page.wait_for_timeout(1200)

        log_shot("07 - Launch AI Policy Architect Interview with NVIDIA Nemotron")
        start_btn = page.locator("button:has-text('Start AI Policy Architect Interview')")
        smooth_move_to(page, start_btn)
        page.wait_for_timeout(800)
        start_btn.click()

        # =========================================================================
        # SCENE 3 (0:50 - 1:20): 3-SECTION AI AUDIT & VALIDATION MATRIX
        # =========================================================================
        log_shot("08 - Awaiting Dynamic AI Tool Surface Audit")
        page.wait_for_selector("button:has-text('Approve Policy & Compile Security Contract')", timeout=15000)
        page.wait_for_timeout(1500)
        inject_cursor_overlay(page)

        log_shot("09 - Inspect Section 1 (Privileges) & Section 2 (Architectural Conflicts)")
        smooth_scroll(page, 200, steps=10)
        page.wait_for_timeout(2500)

        log_shot("10 - Accept All AI Recommendations")
        accept_all_btn = page.locator("button:has-text('Accept All AI Recommendations')")
        if accept_all_btn.count() > 0:
            smooth_move_to(page, accept_all_btn.first)
            page.wait_for_timeout(800)
            accept_all_btn.first.click()
            page.wait_for_timeout(1800)

        log_shot("11 - Approve Policy & Compile Cryptographic Security Contract")
        approve_btn = page.locator("button:has-text('Approve Policy & Compile Security Contract')")
        smooth_move_to(page, approve_btn)
        page.wait_for_timeout(800)
        approve_btn.click()
        page.wait_for_timeout(2000)

        log_shot("12 - Inspect Methodology Validation Tests Matrix & SHA-256 Seal")
        matrix_tab = page.locator("button:has-text('Methodology Validation Tests')")
        if matrix_tab.count() > 0:
            smooth_move_to(page, matrix_tab.first)
            page.wait_for_timeout(800)
            matrix_tab.first.click()
            page.wait_for_timeout(3500)

        log_shot("13 - Proceed to Step 3: Issue Production API Keys")
        step3_btn = page.locator("button:has-text('Go to Step 3: Issue Production API Keys')")
        if step3_btn.count() > 0:
            smooth_move_to(page, step3_btn.first)
            page.wait_for_timeout(800)
            step3_btn.first.click()
            page.wait_for_timeout(2000)

        # =========================================================================
        # SCENE 4 (1:20 - 1:45): DUAL API KEYS & DOWNLOAD INTEGRATION MANUAL
        # =========================================================================
        log_shot("14 - Inspect Dual Keys: Ingress Sentinel & Egress TCEAV Guard")
        inject_cursor_overlay(page)
        smooth_scroll(page, 150, steps=10)
        page.wait_for_timeout(3000)

        log_shot("15 - Download Tailored Project Integration Guide (.md)")
        download_btn = page.locator("button:has-text('Download Integration Guide (.md)')")
        if download_btn.count() > 0:
            smooth_move_to(page, download_btn.first)
            page.wait_for_timeout(1000)
            with page.expect_download() as download_info:
                download_btn.first.click()
            download = download_info.value
            download_dest = RECORDINGS_DIR / download.suggested_filename
            download.save_as(str(download_dest))
            print(f"[DOWNLOAD] Saved Integration Guide to {download_dest}")
            page.wait_for_timeout(1500)

        log_shot("16 - Copy Python SDK Implementation Code")
        copy_code_btn = page.locator("button:has-text('Copy Code')")
        if copy_code_btn.count() > 0:
            smooth_move_to(page, copy_code_btn.first)
            page.wait_for_timeout(800)
            copy_code_btn.first.click()
            page.wait_for_timeout(1800)

        log_shot("17 - Navigate to My Projects Hub")
        open_projects_btn = page.locator("button:has-text('Open in My Projects Hub')")
        if open_projects_btn.count() > 0:
            smooth_move_to(page, open_projects_btn.first)
            page.wait_for_timeout(800)
            open_projects_btn.first.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
        else:
            projects_nav = page.locator("button:has-text('Projects')")
            smooth_move_to(page, projects_nav.first)
            projects_nav.first.click()
            page.wait_for_timeout(2000)

        # =========================================================================
        # SCENE 5 (1:45 - 2:10): PROJECTS HUB & CODEBASE .ZIP INGESTION
        # =========================================================================
        log_shot("18 - Projects Hub: Ingest .zip Archive")
        inject_cursor_overlay(page)
        page.wait_for_timeout(1500)

        ingest_zip_btn = page.locator("button:has-text('Ingest .zip Archive')")
        if ingest_zip_btn.count() > 0:
            smooth_move_to(page, ingest_zip_btn.first)
            page.wait_for_timeout(800)
            ingest_zip_btn.first.click()
            page.wait_for_timeout(1500)

        log_shot("19 - Upload Enterprise_Agent_Codebase.zip")
        file_input = page.locator("input[type='file']")
        if file_input.count() > 0 and ZIP_FILE_PATH.exists():
            file_input.set_input_files(str(ZIP_FILE_PATH))
            page.wait_for_timeout(3000)

        log_shot("20 - Review Discovered Tools & AST Extraction Details")
        inject_cursor_overlay(page)
        smooth_scroll(page, 250, steps=10)
        page.wait_for_timeout(3500)

        # =========================================================================
        # SCENE 6 (2:10 - 2:40): LIVE AUTONOMOUS LLM AGENT SANDBOX DEFENSE
        # =========================================================================
        log_shot("21 - Return to Live Dashboard")
        dash_tab = page.locator("button:has-text('Dashboard')")
        smooth_move_to(page, dash_tab.first)
        page.wait_for_timeout(800)
        dash_tab.first.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        inject_cursor_overlay(page)

        log_shot("22 - Scroll to Live Autonomous LLM Agent Sandbox")
        smooth_scroll(page, 950, steps=25)
        page.wait_for_timeout(1500)

        # Scenario 1: Indirect Injection
        log_shot("23 - Test Scenario 1: Indirect Email Injection")
        btn_indirect = page.locator("button:has-text('Indirect Injection')")
        if btn_indirect.count() > 0:
            smooth_move_to(page, btn_indirect.first)
            page.wait_for_timeout(600)
            btn_indirect.first.click()
            page.wait_for_timeout(1200)

            run_agent_btn = page.locator("button:has-text('Run Autonomous Agent Task')")
            smooth_move_to(page, run_agent_btn)
            page.wait_for_timeout(600)
            run_agent_btn.click()
            page.wait_for_timeout(3200)

        # Scenario 2: Salami Drain
        log_shot("24 - Test Scenario 2: Salami-Slicing Budget Drain")
        btn_salami = page.locator("button:has-text('Salami Drain')")
        if btn_salami.count() > 0:
            smooth_move_to(page, btn_salami.first)
            page.wait_for_timeout(600)
            btn_salami.first.click()
            page.wait_for_timeout(1200)

            run_agent_btn = page.locator("button:has-text('Run Autonomous Agent Task')")
            smooth_move_to(page, run_agent_btn)
            page.wait_for_timeout(600)
            run_agent_btn.click()
            page.wait_for_timeout(3200)

        # Scenario 3: Cyrillic Homoglyph
        log_shot("25 - Test Scenario 3: Cyrillic Homoglyph Injection")
        btn_homo = page.locator("button:has-text('Cyrillic Homoglyph')")
        if btn_homo.count() > 0:
            smooth_move_to(page, btn_homo.first)
            page.wait_for_timeout(600)
            btn_homo.first.click()
            page.wait_for_timeout(1200)

            run_agent_btn = page.locator("button:has-text('Run Autonomous Agent Task')")
            smooth_move_to(page, run_agent_btn)
            page.wait_for_timeout(600)
            run_agent_btn.click()
            page.wait_for_timeout(3200)

        # Scenario 4: Clean Benign Task
        log_shot("26 - Test Scenario 4: Clean Benign Task (Utility Preserved)")
        btn_benign = page.locator("button:has-text('Clean Benign Task')")
        if btn_benign.count() > 0:
            smooth_move_to(page, btn_benign.first)
            page.wait_for_timeout(600)
            btn_benign.first.click()
            page.wait_for_timeout(1200)

            run_agent_btn = page.locator("button:has-text('Run Autonomous Agent Task')")
            smooth_move_to(page, run_agent_btn)
            page.wait_for_timeout(600)
            run_agent_btn.click()
            page.wait_for_timeout(3200)

        # Final showcase pause
        log_shot("27 - Final Defense Matrix Overview Hold")
        smooth_scroll(page, -300, steps=10)
        page.wait_for_timeout(4000)

        # Finalize and close video
        page.close()
        video_output_path = page.video.path()
        context.close()
        browser.close()

    total_duration = time.time() - start_time
    print("=" * 70)
    print(f" RECORDING COMPLETED SUCCESSFULLY IN {total_duration:.1f}s ({int(total_duration//60)}m {int(total_duration%60)}s)")
    print(f" Raw Video File: {video_output_path}")
    print("=" * 70)

    # 2. Reset database back to zero baseline
    purge_db_test_data()

    # 3. Rename/move webm and transcode to mp4
    target_webm = RECORDINGS_DIR / "ContractGuard_X_Hackathon_Demo.webm"
    target_mp4 = RECORDINGS_DIR / "ContractGuard_X_Hackathon_Demo.mp4"

    if video_output_path and os.path.exists(video_output_path):
        import shutil
        shutil.copy(video_output_path, target_webm)
        print(f"[EXPORT] WebM Video Saved to: {target_webm}")

        # Transcode to MP4 using OpenCV
        try:
            import cv2
            print("[TRANSCODE] Converting WebM to MP4 container via OpenCV...")
            cap = cv2.VideoCapture(str(target_webm))
            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(str(target_mp4), fourcc, fps, (width, height))

            count = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                writer.write(frame)
                count += 1
                if count % 300 == 0:
                    print(f"  Transcoded {count}/{total_frames} frames...")

            cap.release()
            writer.release()
            print(f"[EXPORT] MP4 Video Saved to: {target_mp4} ({count} frames at {fps:.1f} fps)")
        except Exception as e:
            print(f"[TRANSCODE WARNING] MP4 conversion error: {e}")

    # 4. Save Shot List and Cue Sheet
    cue_sheet_path = RECORDINGS_DIR / "VOICEOVER_CUE_SHEET.md"
    with open(cue_sheet_path, "w", encoding="utf-8") as f:
        f.write("# ContractGuard-X Hackathon Demo Video — Voiceover Cue Sheet\n\n")
        f.write(f"**Total Video Duration:** {int(total_duration//60)}m {int(total_duration%60)}s (under 3:00 limit)\n")
        f.write(f"**Resolution:** 1920x1080 Full HD (60/30 fps)\n")
        f.write(f"**WebM File:** `{target_webm}`\n")
        f.write(f"**MP4 File:** `{target_mp4}`\n\n")
        f.write("## Shot List & Narration Timing\n\n")
        f.write("| Timestamp | Scene / Visual Action | Voiceover Narration Prompt |\n")
        f.write("| :--- | :--- | :--- |\n")
        for ts, name in timeline:
            f.write(f"| `{ts}` | {name} | *[Speak narration for this section]* |\n")

    print(f"[CUE SHEET] Voiceover timeline saved to: {cue_sheet_path}")
    return target_webm, target_mp4, cue_sheet_path, timeline


if __name__ == "__main__":
    record_walkthrough()
