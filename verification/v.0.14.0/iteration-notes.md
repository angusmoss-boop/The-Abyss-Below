# Development iteration notes

Small-landscape HUD overlap was fixed by allowing a single instrument row at narrower landscape widths. A global footer rule was narrowed so the map instructions remain visible. Audio preview now checks actual context availability before reporting playback. Backgrounding with an exploration dialog open now keeps the dive paused on return.

Old test assumptions about a fresh unpaused expedition after reload were updated to the deliberate paused-restore behaviour. The resume fixture now places its mine in protected clear water, avoiding an unrelated randomly generated predator detonating it before the snapshot assertion. Survey/current queries and repeated achievement actions were batched to reduce automation round trips without removing assertions.

Large parallel test orchestration exceeded environment limits. Only successful individual/grouped reruns are indexed as passes in results.json. The live HTTP/worker test remained blocked and is not counted as passed.
