# Crystal Descent verification

Run from the extracted project root:

```sh
python tests/build_release.py
python tests/run_v0174.py
```

Python with Pillow/Playwright, Chromium on PATH, and Node are needed. Run the live probe separately:

```sh
python tests/v0174_live_pwa_probe.py
```

Current results are written to verification/v0.17.4. The artwork/UI harness uses production HTML, CSS, JS and approved image bytes, but isolated browser documents and synthetic storage. Some regression helpers use archived baseline ZIPs or retained fixtures; no personal save is required. The branding source-comparison assertion requires the v0.17.3 complete ZIP beside the project directory. Historical test files may assert their historical release version and are not part of this runner.

To regenerate the technical icon sizes from the retained approved source:

```sh
python tests/build_branding.py
python tests/build_release.py
```

The native Android launcher and OS-generated splash must be checked on a real installed PWA. Browser screenshots are not installed launcher evidence. Package the completed patch with tests/package_v0174.py only after all current targeted suites pass.
