"""Depth lighting regressions, including actual pixels rather than just state.

Run: python tests/v050_depth_lighting_test.py
Requires Playwright and Chromium. No HTTP server or external assets needed.
"""
from pathlib import Path
import json
import math
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'screenshots' / 'v0.5.0'
OUT.mkdir(parents=True, exist_ok=True)


def launch(browser, width=1440, height=900, mobile=False, dpr=1):
    context = browser.new_context(
        viewport={'width': width, 'height': height}, is_mobile=mobile,
        has_touch=mobile, device_scale_factor=dpr, service_workers='block')
    page = context.new_page()
    page.set_default_timeout(5000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content((ROOT / 'index.html').read_text())
    page.add_style_tag(content=(ROOT / 'styles.css').read_text())
    seed = json.dumps({'credits': 650, 'secured': [0, 1], 'upgrades': {'hull': 7}})
    page.evaluate('''seed => {
        const store = {'the-abyss-below-v01': seed};
        Object.defineProperty(window, 'localStorage', {configurable: true, value: {
            getItem: k => store[k] ?? null,
            setItem: (k, v) => store[k] = v,
            removeItem: k => delete store[k]}});
        window.ABYSS_TEST_MODE = true;
    }''', seed)
    page.add_script_tag(content=(ROOT / 'game.js').read_text())
    page.locator('#startBtn').click()
    page.wait_for_timeout(100)
    return context, page, errors


# The fixture and pixel read happen in the SAME JS evaluation, so requestAnimationFrame
# cannot render an instrument pointer in between. All simulation is frozen for this read.
PIXELS = '''config => {
    const info = AbyssDiagnostics.lightingFixture({...config, hud:false});
    const c = document.getElementById('gameCanvas');
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let total=0, max=0, lit=0, leaks=0, nonOpaque=0;
    const cos=Math.cos(config.facing||0), sin=Math.sin(config.facing||0);
    const beam=info.lighting;
    for(let py=0;py<c.height;py++)for(let px=0;px<c.width;px++){
        const i=(py*c.width+px)*4;
        const bright=Math.max(data[i],data[i+1],data[i+2]);
        total+=data[i]+data[i+1]+data[i+2];max=Math.max(max,bright);
        if(data[i+3]!==255)nonOpaque++;
        if(!bright)continue;
        lit++;
        const dx=(px+.5)/info.viewport.dpr+info.camera.x-info.x;
        const dy=(py+.5)/info.viewport.dpr+info.camera.y-info.y;
        const along=dx*cos+dy*sin-beam.bowOffset;
        const side=-dx*sin+dy*cos;
        // Two CSS pixels account for bilinear filtering at the rotated texture boundary.
        if(along < -2 || along > beam.beamLength+2 ||
           Math.abs(side) > beam.nearHalfWidth+Math.max(0,along)*Math.tan(beam.beamHalfAngle)+2)leaks++;
    }
    return {mean:total/(c.width*c.height*3),max,lit,leaks,nonOpaque,info};
}'''


def run():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=shutil.which('chromium'))
        context, page, errors = launch(browser)
        values = page.evaluate('Array.from({length:1001},(_,d)=>AbyssDiagnostics.ambientAtDepth(d))')
        assert values[0] == 1 and values[-1] == 0
        assert all(a > b for a, b in zip(values, values[1:])), 'Fade must be strictly monotonic'
        assert page.evaluate('AbyssDiagnostics.ambientAtDepth(-100)') == 1
        assert page.evaluate('AbyssDiagnostics.ambientAtDepth(1800)') == 0
        assert 0 < page.evaluate('AbyssDiagnostics.ambientAtDepth(999.99)') < 0.000001
        assert page.evaluate('AbyssDiagnostics.ambientAtDepth(500.1) < AbyssDiagnostics.ambientAtDepth(500)')
        brightness = []
        for depth in (0, 250, 500, 750, 950, 1000, 1500, 1800):
            stats = page.evaluate(PIXELS, {'depth': depth, 'lights': False, 'quietScene': True})
            brightness.append((depth, stats['mean']))
            if depth >= 1000:
                assert stats['max'] == 0, (depth, stats)
                assert stats['nonOpaque'] == 0, (depth, stats['nonOpaque'])
        assert all(a[1] > b[1] for a, b in zip(brightness[:5], brightness[1:6])), brightness
        print('PASS: smooth fractional-depth fade; lamps-off world is opaque RGB(0,0,0) at 1,000-1,800 m')
        print('Rendered mean brightness:', [(d, round(b, 3)) for d, b in brightness])

        for angle in (0, math.pi/2, math.pi, -math.pi/2, .73, -2.21):
            stats = page.evaluate(PIXELS, {'depth': 1000, 'facing': angle, 'lights': True, 'quietScene': True})
            assert stats['lit'] > 1000 and stats['max'] > 20, stats
            assert stats['leaks'] == 0, (angle, stats)
        print('PASS: forward cone rotates in every direction; no pixels leak outside its footprint')

        stats = page.evaluate(PIXELS, {'depth': 1100, 'lights': True, 'battery': 0, 'quietScene': True})
        assert stats['max'] == 0
        assert not page.evaluate('AbyssDiagnostics.state().headlightsActive')
        assert page.locator('#lightsLabel').inner_text() == 'EMPTY'
        print('PASS: depleted battery extinguishes the flashlight and updates its label')

        # Rebuild a real scene, with salvage inside the long beam and an alerted predator behind.
        info = page.evaluate('AbyssDiagnostics.lightingFixture({depth:1000,quietScene:true})')
        x, y = info['x'], info['y']
        page.evaluate('fixture=>AbyssDiagnostics.fixture(fixture)', {
            'x': x, 'y': y,
            'rocks': [{'x': x+145, 'y': y+26, 'radius': 27, 'rot': .3, 'seed': .2, 'spikes': 8}],
            'items': [{'x': x+220, 'y': y, 'type': 'crystal'}, {'x': x-70, 'y': y, 'type': 'recorder'}],
            'predators': [{'x': x-90, 'y': y-60, 'tier': 'apex', 'alertUntil': 999}]})
        stats = page.evaluate(PIXELS, {'depth': 1000, 'lights': True})
        assert stats['leaks'] == 0, stats
        # Crystal is beyond the old 155-unit draw cutoff, but now visible in the beam.
        patch = page.evaluate('''() => {
            AbyssDiagnostics.renderWorld();
            const c=document.getElementById('gameCanvas'), info=AbyssDiagnostics.state();
            const rect=c.getBoundingClientRect(), dpr=c.width/rect.width;
            const x=Math.round((rect.width/2+220)*dpr),y=Math.round(rect.height*.52*dpr);
            const p=c.getContext('2d').getImageData(x-3,y-3,6,6).data;
            let max=0;for(let i=0;i<p.length;i+=4)max=Math.max(max,p[i],p[i+1],p[i+2]);
            return max;
        }''')
        assert patch > 35, patch
        # v0.6: sonar echoes are an intentional temporary instrument overlay above darkness.
        page.evaluate('AbyssDiagnostics.lightingFixture({depth:1000,freeze:false,lights:false})')
        page.keyboard.press('q')
        page.wait_for_timeout(180)
        page.keyboard.press('Escape')
        detail = page.evaluate('AbyssDiagnostics.debug()')
        assert detail['sonarWaves'] and detail['clock'] > detail['sonarWaves'][0]['birth']
        assert any(i['revealUntil'] > detail['clock'] for i in detail['items'])
        dark = page.evaluate('''() => {
            AbyssDiagnostics.renderWorld();
            const c=document.getElementById('gameCanvas');
            const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
            let max=0;for(let i=0;i<p.length;i+=4)max=Math.max(max,p[i],p[i+1],p[i+2]);
            return max;
        }''')
        assert dark > 0, "v0.6 sonar echoes must now be visible through blackout"
        assert page.evaluate('AbyssDiagnostics.state().secured') == 2
        assert not errors, errors
        context.close()
        print('PASS: distant illuminated salvage renders; predator/recorder glow stays masked; intentional sonar echoes render; save retained')

        for width, height, dpr in ((390,844,2),(844,390,2),(360,780,1),(413,823,1.25)):
            context, page, errors = launch(browser, width, height, True, dpr)
            stats = page.evaluate(PIXELS, {'depth': 1000, 'lights': True, 'quietScene': True, 'facing': math.pi/2})
            assert stats['leaks'] == 0 and stats['lit'] > 500, (width, height, stats)
            stats = page.evaluate(PIXELS, {'depth': 1000, 'lights': False, 'quietScene': True})
            assert stats['max'] == 0, (width, height, stats)
            assert page.locator('#mobileLights').is_visible()
            assert page.locator('#mobileJoystick').is_visible()
            assert page.locator('#depthStat').inner_text() == '1000'
            page.evaluate('AbyssDiagnostics.lightingFixture({depth:1000,freeze:false,lights:true,facing:Math.PI/2})')
            page.locator('#mobileLights').click()
            assert not page.evaluate('AbyssDiagnostics.state().headlightsActive')
            page.locator('#mobileLights').click()
            assert page.evaluate('AbyssDiagnostics.state().headlightsActive')
            page.locator('#focusPauseBtn').click()
            assert page.locator('#resumeBtn').is_visible()
            page.locator('#resumeBtn').click()
            assert not page.evaluate('AbyssDiagnostics.state().paused')
            page.set_viewport_size({'width': height, 'height': width})
            page.wait_for_timeout(120)
            stats = page.evaluate(PIXELS, {'depth': 1000, 'lights': True, 'quietScene': True, 'facing': .73})
            assert stats['leaks'] == 0 and stats['lit'] > 300, stats
            assert not errors, errors
            context.close()
            print(f'PASS: {width}x{height} DPR {dpr}, lamp toggle, pause/resume and rotation resize')
        browser.close()


if __name__ == '__main__':
    run()
