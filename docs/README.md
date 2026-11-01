# Current system documentation

- [Gameplay](gameplay.md): setup, controls, combat, pause and saves.
- [Development](development.md): local setup, builds, tests and offline installation.
- [High-level architecture](architecture.md): state ownership, simulation, rendering, AI and persistence.
- [Generated matches](generated-maps.md): setup, generation, preferences and layout constraints.
- [City conversion and air transport](city-conversion/IMPLEMENTATION.md): roles, aircraft and combat lifecycle.
- [Defender borders](defender-borders/IMPLEMENTATION.md): hostile ground transit and queue rules.
- [Upgrade and field effects](upgrades/EFFECTS.md): implemented effects and shared mechanics.
- [Relay](relay/IMPLEMENTATION.md): objective scoring, AI and persistence.
- [Enemy AI](ai-production.md): logistics, forecasts, assembly and decision budgets.
- [Enemy dashboard](enemy-dashboard/IMPLEMENTATION.md): diagnostics and worker lifecycle display.
- [Visual enemy editor](bot-editor/IMPLEMENTATION.md): authoring, storage and disabled custom activation.
- [Development-only MDSL prototype](ai-mdsl/IMPLEMENTATION.md): experimental tree contracts and limitations.


## Documentation policy

- Put temporary requirements, designs, proposed features and historical slice reports in [plans](../plans/README.md).
- Update affected current-system documentation alongside code. Verify claims against implementation and tests; historical plans are not evidence of current behavior.
- Preserve approved [mockups](../mockups/) as design references. Moving plans does not authorize deleting contracts, mockups or tests.
- Device performance and human balance remain separate from automated correctness checks. Old verification totals are checkpoint reports, not current test results.
