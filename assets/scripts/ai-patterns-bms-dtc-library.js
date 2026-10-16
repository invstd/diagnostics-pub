// ai-patterns/ copy of bms-dtc-library.js (AI Patterns experiment, see src/ai-patterns/PLAN.md).
// Differences from the original: C1A5's `aiAssist` is restructured into the "Layered AI Assist"
// shape (PLAN.md §5) — overview / technical / fixSteps / sources / media, plus confidence and a
// manufacturer-scope note. Everything else (vehicles, metrics, other fault codes, lookup) is
// identical to the original.
//
// Content provenance, per field:
//   - Text carried over from Vedran's 2026-08-26 research (the original aiAssist) is kept verbatim
//     or near-verbatim — mechanism, fault, danger, symptoms, both action plans, recall campaign ID.
//   - Anything added for the new tabs that isn't confirmed by a real source is marked `draft: true`
//     and renders with a visible "Draft — to verify" marker (a prototype-content state, not part of
//     the product UX), so it can't be mistaken for checked fact in a test session. Replace or
//     confirm these once the web research + Vedran's comparison pass is done (PLAN.md §10).
//
// Original header, still applicable:
// Battery State of Health (BMS) reference content — curated from two real report samples Vedran
// supplied (an Autocom ICON CARS Demo screen recording + PDF for a Renault Megane E-Tech, and a
// WOW! LOOQIT-branded PDF for a BMW i4). Keyed by lowercase "brand model". Only these two vehicles
// have real curated fault codes; every other EV/hybrid vehicle falls back to EV_DEFAULT.
window.BmsDtcLibrary = {
  vehicles: {
    "renault megane e-tech": {
      batteryHealthPercent: 91,
      capacity: { initialKwh: 60.0, currentKwh: 54.6, lossPercent: 9.0 },
      cellVoltage: { minV: 3.94, maxV: 3.99 },
      temperature: { minC: 19, maxC: 31 },
      faultCodes: [
        {
          ecu: "HEVC - Electric vehicle electronic control unit - AT", code: "C1A5", status: null, description: "Unknown fault code",
          aiAssist: {
            // What the AI thinks the code actually is — shown next to the scanner's own
            // "Unknown fault code", so the mechanic sees the translation, not just the result.
            title: "Parking brake actuator alignment",

            // Confidence is deliberately Medium, not High: the recall match is strong, but no
            // published Renault source ties this exact code to the actuator yet. The reason is
            // shown to the mechanic — a bare percentage would be exactly the overclaiming the
            // generic-AI research result (Toyota/Land Rover C1A5) demonstrated.
            confidence: {
              level: "medium",
              label: "Medium confidence",
              reason: "The open recall for this model matches the reporting ECU and symptoms. No published Renault document links code C1A5 to the actuator directly yet."
            },

            // Manufacturer-scope note: C-codes mean different things per make, so the answer says
            // which make it's for.
            scope: "C-codes are manufacturer-specific. This is the Renault meaning for this vehicle. The same code is used for unrelated faults on other makes.",

            safety: "Rollaway risk: this fault can stop the park lock (P) from engaging. Chock the wheels and don't rely on P while working on the vehicle.",

            overview: {
              whatItIs: "On the Renault CMF-EV platform, C1A-prefixed chassis codes relate to the automated parking mechanism. C1A5 points to the parking pawl actuator, or its alignment with the traction reducer.",
              severity: { label: "High", tone: "error", note: "Drivable, but P may not hold the vehicle." },
              // The "why" behind the answer, each point tagged with where it comes from.
              why: [
                { text: "Reported by the HEVC, which controls the park lock.", source: "vehicle" },
                { text: "C1A prefix = chassis / parking mechanism on CMF-EV.", source: "ai" },
                { text: "This model and year fall within an open Renault recall for the park lock.", source: "recall" }
              ],
              likelyFix: [
                "Try a hard sleep-cycle reset (about 15 min).",
                "If the code returns, check the recall with Renault."
              ]
            },

            technical: {
              causeIntro: "Renault issued an advisory for 2024–2025 Megane E-Tech models targeting the parking system:",
              causePoints: [
                { label: "The mechanism", text: "The position sensor inside the parking brake actuator (built into the electric traction reducer) can sit at an incorrect factory angle." },
                { label: "The fault", text: "Because of this misalignment, the internal stopping pin is placed incorrectly. The HEVC detects a discrepancy between where the parking pawl actuator should be and where the sensor reports it is, triggering C1A5." }
              ],
              relatedSystems: ["HEVC (EV control unit)", "Park lock actuator in the traction reducer", "Electric parking brake", "Gear selector (P request)"],
              symptoms: [
                "“Check Electric System” warning (orange wrench icon)",
                "“Check Braking System” warning",
                "P may not engage solidly via the stalk switch"
              ],
              // General diagnostic guidance (not Renault data) — what to look at, not values.
              checks: {
                draft: true,
                items: [
                  { label: "Vehicle speed at fault", text: "Should be 0. A non-zero speed means the fault was logged while moving." },
                  { label: "P request vs. P confirmed", text: "If the selector requested P but the actuator never confirmed it, the park lock didn't engage." },
                  { label: "12V supply at fault", text: "A low reading points to a supply dip rather than a mechanical fault." }
                ]
              }
            },

            fixSteps: {
              steps: [
                {
                  title: "Hard sleep-cycle reset",
                  time: "~15 min",
                  intro: "If this is a transient sensor desynchronization, forcing the HEVC network to reboot can clear it:",
                  type: "ordered",
                  items: [
                    "Park the vehicle on a completely flat surface.",
                    "Turn off the ignition, step out, and lock the vehicle.",
                    "Move the key fob far enough away that the car ends its proximity link.",
                    "Wait 10 to 15 minutes for the CAN bus and HEVC to enter deep sleep.",
                    "Re-enter and re-scan to check whether the code clears."
                  ]
                },
                {
                  title: "Check the recall with Renault",
                  time: "Dealer repair",
                  intro: "2024–2025 Megane E-Tech vehicles have a P-Lock parking pawl rollaway recall (campaign 0EWQ). The repair is typically covered under manufacturer warranty.",
                  type: "unordered",
                  items: [
                    "Contact an authorized Renault dealer with the vehicle's 17-digit VIN.",
                    "Ask whether the vehicle is included in the parking actuator campaign. The dealer fix re-indexes or replaces the actuator in the electric drive unit."
                  ]
                }
              ],
              parts: { draft: true, items: ["Parking actuator assembly (dealer / recall part)"] }
            },

            // Trust label per source: "manufacturer" | "recall" | "verified" | "community".
            sources: [
              { title: "Renault recall: P-Lock parking pawl (campaign 0EWQ)", trust: "recall", draft: true, note: "Campaign ID and affected years from earlier research. Check against an official recall database." },
              { title: "Hard sleep-cycle reset for HEVC faults", trust: "community", draft: true, note: "Owner and technician advice, not a Renault procedure." },
              // `relation` = related to a symptom but doesn't support the C1A5 answer itself: listed,
              // labelled, and left out of the header's "Based on N sources" count.
              {
                title: "Renault Braking System Fault [Meaning & Practical Fix]",
                publisher: "The Honest Mechanic Colorado",
                url: "https://thehonestmechaniccolorado.com/braking-system-fault-renault/",
                trust: "community",
                relation: "Related symptom",
                note: "General causes of the “Check Braking System” warning (pad sensor, ABS sensor, low battery, brake fluid, pads, discs). Doesn't mention the park lock or EVs."
              }
            ],

            // Placeholder entries (all draft) so the Media tab can be seen and judged — swap for real
            // videos/diagrams once found (they needn't be Megane-specific). An empty array hides
            // the tab (PLAN.md §5: empty tabs are hidden, not shown empty). Video chapters are the
            // "jump to the relevant timestamp" part of the pattern.
            media: [
              // Real video (chosen by Vedran 2026-09-28). It covers the general Renault "Braking
              // System Fault" warning — one of C1A5's symptoms — not the park lock itself, so it
              // carries a `relation` note instead of being presented as the C1A5 video. Chapters are
              // YouTube's own auto-generated ones.
              {
                type: "video",
                youtubeId: "-LtsiSI4u_Y",
                title: "Renault Braking System Fault: 5 Leading Causes & Fix",
                channel: "Honest Mechanic Colorado",
                length: "3:14",
                trust: "community",
                relation: "Related symptom",
                relevance: "Covers the “Check Braking System” warning in general (brake fluid, pads, ABS sensor, battery). Doesn't cover the park lock actuator. Useful for ruling out other causes.",
                chapters: [
                  { time: "0:00", label: "Understanding the warning" },
                  { time: "0:44", label: "Common causes of faults" },
                  { time: "2:27", label: "Troubleshooting and repair" }
                ]
              },
              // Our own simplified schematic (ai-patterns-diagrams.js), drawn for this case: what the
              // park lock is and where C1A5's fault sits. Labelled "Simplified illustration", not
              // Manufacturer — it isn't Renault's drawing. The viewer opens zoomed on the focus area.
              {
                type: "diagram",
                diagramId: "park-lock",
                title: "Park lock: where the C1A5 fault sits",
                caption: "Generic EV park lock, not Renault's exact layout. In P the pawl drops into a gap in the parking gear. The actuator moves it, and its position sensor reports where it is. C1A5 points to a sensor angle offset, so the reported position doesn't match the real one.",
                focusLabel: "Fault area",
                trust: "illustration"
              }
            ]
          }
        },
        { ecu: "HEVC - Electric vehicle electronic control unit - AT", code: "U2165", status: "INTERMITTENT", description: "CAN communication error (sonar)" },
        { ecu: "BMS - HV Battery 1 - AT", code: "P1B01", status: "INTERMITTENT", description: "Cell voltage circuit" },
        { ecu: "BMS - HV Battery 1 - AT", code: "P1B20", status: "INTERMITTENT", description: "Relay 4 control circuit" },
        { ecu: "Regenerative Braking System - Diagnose - AT", code: "C18EA", status: "PERMANENT", description: "VDC (vehicle dynamic control)" },
        { ecu: "Regenerative Braking System - Diagnose - AT", code: "C18F9", status: "PERMANENT", description: "VDC (vehicle dynamic control)" }
      ]
    },
    "bmw i4": {
      batteryHealthPercent: 87.3,
      // lossPercent stated explicitly (12.7%) rather than derived from the two capacity figures
      // below — the real PDF's own displayed 75.0/65.3 kWh round to 12.9% if recomputed, so its
      // 12.7% must come from more precise underlying values than what it actually prints.
      capacity: { initialKwh: 75.0, currentKwh: 65.3, lossPercent: 12.7 },
      cellVoltage: { minV: 3.92, maxV: 3.98 },
      temperature: { minC: 18, maxC: 34 },
      faultCodes: [
        { ecu: "Software Cluster Embedded 1", code: "U14FF00", status: "PERMANENT", description: "Secure Onboard Communication" },
        { ecu: "Electrical motor", code: "U044300", status: "INTERMITTENT", description: "Invalid Data Received From Body Control Module B" }
      ]
    }
  },

  // No real reference for any other EV/hybrid — healthy pack, no faults, same ballpark numbers
  // the original (pre-reference) implementation used for its EV variant.
  EV_DEFAULT: {
    batteryHealthPercent: 92,
    capacity: { initialKwh: 77.0, currentKwh: 71.0, lossPercent: 7.8 },
    cellVoltage: { minV: 3.82, maxV: 3.84 },
    temperature: { minC: 22, maxC: 24 },
    faultCodes: []
  },

  lookup: function (brand, model) {
    var key = (brand || "").trim().toLowerCase() + " " + (model || "").trim().toLowerCase();
    return this.vehicles[key] || this.EV_DEFAULT;
  }
};
