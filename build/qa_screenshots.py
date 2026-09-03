import os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8765"
OUT = "/tmp/ecs_screens"
os.makedirs(OUT, exist_ok=True)

def shoot(page, route, name, wait_selector=None, full_page=True):
    page.goto(f"{BASE}/index.html#/{route}", wait_until="networkidle")
    if wait_selector:
        page.wait_for_selector(wait_selector, timeout=5000)
    page.wait_for_timeout(250)
    page.screenshot(path=f"{OUT}/{name}.png", full_page=full_page)
    print("saved", name)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Desktop 1440x900
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        shoot(page, "home", "01_hoje_desktop")
        shoot(page, "calendar", "02_calendario_month_desktop")
        shoot(page, "posts", "03_posts_desktop")

        # open a post drawer
        page.goto(f"{BASE}/index.html#/posts", wait_until="networkidle")
        page.wait_for_timeout(300)
        page.click(".card")
        page.wait_for_selector(".drawer.open")
        page.wait_for_timeout(300)
        page.screenshot(path=f"{OUT}/03b_posts_drawer_desktop.png")

        shoot(page, "articles", "04_artigos_desktop")
        shoot(page, "campaigns", "05_campanhas_desktop")

        # campaign detail
        page.goto(f"{BASE}/index.html#/campaigns", wait_until="networkidle")
        page.wait_for_timeout(300)
        page.click("[data-open-campaign]")
        page.wait_for_timeout(400)
        page.screenshot(path=f"{OUT}/05b_campanha_detail_desktop.png", full_page=True)

        shoot(page, "live", "06_live_desktop")
        shoot(page, "production", "07_producao_desktop")
        shoot(page, "news", "08_noticias_desktop")
        shoot(page, "comment-tool", "09_sugestoes_desktop")
        shoot(page, "governance", "10_governanca_desktop")

        # calendar list mode
        page.goto(f"{BASE}/index.html#/calendar", wait_until="networkidle")
        page.wait_for_timeout(300)
        page.click('[data-mode="list"]')
        page.wait_for_timeout(300)
        page.screenshot(path=f"{OUT}/11_calendario_list_desktop.png", full_page=True)

        page.close()

        # 1366x768 check
        page2 = browser.new_page(viewport={"width": 1366, "height": 768})
        shoot(page2, "home", "12_hoje_1366")
        page2.close()

        # 1920x1080 check
        page3 = browser.new_page(viewport={"width": 1920, "height": 1080})
        shoot(page3, "home", "13_hoje_1920")
        page3.close()

        # Mobile
        page4 = browser.new_page(viewport={"width": 390, "height": 844})
        shoot(page4, "home", "14_hoje_mobile")
        shoot(page4, "calendar", "15_calendario_mobile")
        # open sidebar on mobile
        page4.goto(f"{BASE}/index.html#/home", wait_until="networkidle")
        page4.wait_for_timeout(300)
        page4.click("#menuToggle")
        page4.wait_for_timeout(300)
        page4.screenshot(path=f"{OUT}/16_sidebar_mobile.png")
        page4.close()

        browser.close()

if __name__ == "__main__":
    main()
