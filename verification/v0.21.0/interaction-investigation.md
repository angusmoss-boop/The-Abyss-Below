# Interaction priority investigation

The first complete regression invocation had 42 passes and an intermittent Warden activation failure. Earlier targeted Warden tests had passed, and five further randomly seeded trials also passed. This was not treated as proof that the failure was harmless.

A deterministic generated-level probe reproduced the issue at Level 4 seed 1. The submarine was exactly on the Warden observation buoy at `(1329.2680760646426, 11550)`. USE collected `loot-159`, a crystal approximately 12.4 world units away at `(1320.0930150869926, 11541.67980015862)`, instead of opening the nearer buoy's explicit activation dialogue.

The previous `nearestInteractable` unconditionally preferred any in-range loose resource over every interaction signal. This was a pre-existing selection-order problem, not a battery-cell placement issue. Battery cells are excluded from the Warden territory.

The fix compares the closest resource with the closest eligible signal and prefers the nearer one. Station docking retains its priority; no resources are moved, regenerated or automatically taken. Warden activation remains an explicit second confirmation. The Warden regression now uses the deterministic seed and verifies that opening its observation prompt leaves all item states unchanged before exercising the existing boss phases, save/restore, damage and reward guards.

The final full 43-suite run uses the corrected production runtime and release manifest. Earlier failure logs are historical investigation evidence, not the final release result.
