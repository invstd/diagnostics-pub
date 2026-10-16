// ai-patterns/ only — vehicle-scoped fault codes for the Layered AI Assist (PLAN.md §5). Loaded
// after the shared dtc-library.js, which stays untouched: ai-patterns-diagnostics-dashboard.js and
// ai-patterns-ecu-detail.js merge the entries below into their lookups, but ONLY when the current
// vehicle matches `vehicle` (brand + model from the URL). Every other car scans exactly as before.
//
// Same shape as AutocomDtcLibrary entries (code/title/status/ecu/functionalGroupId) plus:
//   vehicle     - { brand, model } the code belongs to (the demo vehicle)
//   description - what a generic scanner shows (here: it can't name the code)
//   aiAssist    - Layered AI Assist content (see ai-patterns-ai-assist.js for rendering)
// Entries here always fail on scan for their vehicle (a missing calibration doesn't come and go
// the way the shared library's "every other scan" demo faults do).
//
// C12B354 content (2026-09-28): meaning from two search results Vedran supplied (consistent with
// each other; the "54" failure-type byte is SAE J2012's "missing calibration"), confirmed as a real
// scenario by a real VCDS scan on the Ross-Tech forum (Audi S5 B9, reported there as B2010 00 —
// same fault, other model and code format). The search summaries themselves are not cited as
// sources: they're AI output, not evidence. Unconfirmed tool names from them (e.g. a target board
// "LAM01-02") are left out; VAS 6430 is the one named in the Ross-Tech thread.
//
// P010000 on the Volvo XC60 2014 D5 (2026-09-29, Pattern 2 hand-off, PLAN.md §10 research): replaces
// the shared Figma-based P010000 for this vehicle only. Re-ranked on the research: P0100 is the
// *circuit* code (P0101 would be the range/performance one), the freeze-frame's MAF signal is 0 g/s
// (no signal, not a skewed one), and both real XC60 D5 cases found were "a new MAF didn't fix it"
// (a broken wire; a split intercooler hose). No Volvo bulletin was found. `symptomWhy` lists the
// Symptom Check answers that support this reading (see ai-patterns-ai-assist.js symptomReasons).
window.AiPatternsDtcLibrary = {
  cars: {
    ecm: [
      {
        vehicle: { brand: "Volvo", model: "XC60" },
        code: "P010000",
        title: "Mass Air Flow (MAF) sensor circuit malfunction",
        description: "Mass Air Flow (MAF) sensor circuit malfunction",
        status: "Active",
        ecu: "Engine Control Module (ECM)",
        functionalGroupId: "air-intake",
        aiAssist: {
          title: "No MAF signal: check the wiring and intake hoses first",
          confidence: {
            level: "medium",
            label: "Medium confidence",
            reason: "P0100 is the circuit code and the freeze-frame shows 0 g/s: no signal at all rather than a skewed one. Two real XC60 D5 cases with this pattern were fixed by a wiring repair and a new intercooler hose, not a new sensor. Both are owner reports on a forum; no Volvo bulletin was found."
          },
          scope: "P0100 is a standard code: the meaning is the same on every make. The ranking of causes is for the XC60 D5.",
          safety: "The engine can cut out or drop to reduced power without warning. Road test with care, and tell the customer before they drive it.",

          overview: {
            whatItIs: "The engine control module isn't getting a usable signal from the mass air flow sensor. It falls back to a substitute value, which gives rough running, loss of power and sometimes limp mode.",
            severity: { label: "Medium", tone: "warning", note: "Drivable, but power can drop suddenly." },
            why: [
              { text: "Set by the engine control module. MAF signal 0 g/s in the freeze-frame.", source: "vehicle" },
              { text: "0 g/s means no signal: a circuit fault fits better than a dirty sensor, which reads wrong but not zero.", source: "ai" },
              { text: "2015 XC60 D5, same code: a new MAF didn't fix it, a broken wire did.", source: "community" },
              { text: "2012 XC60 D5, limp mode: a new MAF didn't fix it, a split intercooler hose was found.", source: "community" }
            ],
            likelyFix: [
              "Check the MAF wiring and connector while watching the live signal.",
              "Check the intercooler and intake hoses for splits.",
              "Only then clean or replace the sensor."
            ]
          },

          // Symptom Check answers that support this reading, shown first in "Why AI thinks so" when the
          // check ran for this vehicle.
          symptomWhy: [
            { question: "onset", answers: ["sudden"], text: "It started suddenly: fits a broken wire or a split hose more than a dirty sensor." },
            { question: "noise", answers: ["whoosh"], text: "A whoosh when accelerating: points to a boost leak upstream of the engine." },
            { question: "message", answers: ["limp"], text: "Limp mode reported: the engine is protecting itself from an air mass it can't trust." },
            { question: "load", answers: ["light"], text: "Power loss even at light throttle: the engine is running on a substitute air mass value." }
          ],

          technical: {
            causeIntro: "The engine control module uses the MAF signal to meter fuel and EGR. When the signal is missing or implausible, it stores P0100 and switches to a substitute value, so the engine runs, but not well.",
            causePoints: [
              { label: "The trigger", text: "No signal reaches the engine control module: a broken wire, a loose or corroded connector, or a failed sensor. A large air leak after the sensor can also make the module reject the reading." },
              { label: "The effect", text: "With a substitute air mass, fuelling and EGR are no longer matched to the real airflow: rough idle, sluggish acceleration, and limp mode to protect the engine." }
            ],
            symptoms: [
              "Check engine light",
              "Rough or uneven idle",
              "Loss of power, sometimes limp mode (“Engine system service required”)",
              "Cutting out"
            ],
            relatedSystems: ["Engine control module (ECM)", "Mass air flow sensor", "Intercooler and charge air hoses", "EGR"],
            otherCauses: {
              intro: "Ranked by how well they fit this code and freeze-frame:",
              items: [
                { label: "Broken wire or poor connection", text: "Fits a signal of 0 g/s best. Found as the cause on a 2015 XC60 D5." },
                { label: "Boost or intake leak", text: "Air escaping after the sensor makes the module distrust the reading. Found on a 2012 XC60 D5 (P00BD, limp mode, a whoosh under load)." },
                { label: "Failed sensor", text: "Possible, but in both cases found a new sensor didn't fix it." },
                { label: "Dirty sensor", text: "Ranked lower: contamination makes the reading drift (P0101) rather than drop to zero." }
              ]
            },
            checks: {
              draft: true,
              items: [
                { label: "Live MAF signal", text: "Near zero at idle means no signal; move the harness and watch for drop-outs." },
                { label: "Actual vs requested air mass", text: "A large gap under load with a normal idle reading points to a leak after the sensor." }
              ]
            }
          },

          fixSteps: {
            steps: [
              {
                title: "Check the MAF wiring and connector",
                intro: "The most likely cause for a signal of 0 g/s.",
                type: "unordered",
                items: [
                  "Check the connector for corrosion, loose pins and a broken latch.",
                  "Watch the live MAF signal while moving the harness. A signal that drops out points to a broken wire.",
                  "Check the wires from the sensor to the engine control module for continuity."
                ]
              },
              {
                title: "Check the intercooler and intake hoses",
                intro: "A leak after the sensor can set the same code and limp mode.",
                type: "unordered",
                items: [
                  "Look for splits in the intercooler hoses, especially where they can rub against a bracket.",
                  "Listen for a whoosh under load on a road test.",
                  "A smoke test finds leaks you can't see."
                ]
              },
              {
                title: "If the wiring and hoses are fine",
                type: "ordered",
                items: [
                  "Clean the sensor with MAF cleaner and let it dry fully.",
                  "Clear the code and road test.",
                  "If P0100 returns, replace the MAF sensor (check the part number against the VIN)."
                ]
              }
            ],
            skipped: [
              {
                title: "Replace the MAF sensor first",
                reason: "In both XC60 D5 cases found, a new sensor didn't fix it. The code and the 0 g/s reading point to the circuit or a leak first."
              }
            ],
            parts: {
              draft: true,
              items: ["MAF connector or harness repair", "Intercooler hose", "MAF sensor (only if the checks above pass)"]
            }
          },

          sources: [
            {
              title: "XC60 2.4 D5 with MAF fault",
              publisher: "Volvo Owners Club Forum",
              url: "https://www.volvoforums.org.uk/showthread.php?t=299900",
              trust: "community",
              match: "Same code, same model",
              note: "2015 XC60 2.4 D5: P0100, cutting out and loss of power; requested and actual MAF readings inconsistent. A new MAF didn't fix it. Fixed by an auto electrician: “a break in one of the wires” (Aug 2022)."
            },
            {
              title: "XC60 D5 AWD 2012: P00BD, Engine Service Required and limp mode",
              publisher: "Volvo Owners Club Forum",
              url: "https://www.volvoforums.org.uk/forum/technical-topics/s60-v60-11-18-xc60-09-17-general/298842-xc60-d5-awd-2012-p00bd-engine-service-required-limp-mode",
              trust: "community",
              match: "Related MAF code, same model",
              note: "Limp mode, “Engine Service Required”, a whoosh when accelerating. A new MAF didn't fix it; a split intercooler inlet hose was found. The owner didn't confirm the repair afterwards."
            }
          ]
        }
      },
      // P0562 on the Ford Focus 2017 petrol (29 Sep 2026, Pattern 2 no-start hand-off, PLAN.md §10
      // "path 4"). P0562 is the standard "system voltage low" code; the Focus-specific reading (battery
      // monitor keeps the old battery's settings until reset) is from moundalexis.com. Checks and
      // parts are Draft. The app has no battery registration function yet, so that step is plain text.
      {
        vehicle: { brand: "Ford", model: "Focus" },
        code: "P0562",
        title: "System voltage low",
        description: "System voltage low",
        status: "Active",
        ecu: "Engine Control Module (ECM)",
        aiAssist: {
          title: "Supply voltage dropped: test the battery, then check it was registered",
          confidence: {
            level: "medium",
            label: "Medium confidence",
            reason: "P0562 only says the voltage was too low, not why. On its own it points to the battery and its connections first. The Focus-specific part (battery registration after a replacement) comes from one well-documented owner write-up about Ford's battery monitor, not from a Ford document."
          },
          scope: "P0562 is a standard code: the meaning is the same on every make. The reading below is for a Focus with start-stop.",

          overview: {
            whatItIs: "The engine control module saw its supply voltage drop below the minimum, typically while cranking. The code records that the voltage was low; the cause is usually the battery, its registration or its connections.",
            severity: { label: "Medium", tone: "warning", note: "It may not start again until the cause is fixed." },
            why: [
              { text: "Stored by the engine control module during the start attempt.", source: "vehicle" },
              { text: "A low-voltage code on its own points to the supply (battery and connections) before the parts that use it.", source: "ai" },
              { text: "Ford with start-stop: after a battery change, the battery monitor keeps the old battery's settings until reset.", source: "community" }
            ],
            likelyFix: [
              "Test the battery.",
              "If it was replaced recently, register the new battery with a scan tool.",
              "Check the battery terminals and earth connections."
            ]
          },

          symptomWhy: [
            { question: "ns-crank-q", answers: ["slow"], text: "It cranks slowly: fits a weak battery or a poor connection." },
            { question: "ns-crank-q", answers: ["nothing"], text: "Only a click or nothing: fits the voltage collapsing at the starter." },
            { question: "ns-lights", answers: ["dim"], text: "Dash lights dim when starting: the voltage drops under load." },
            { question: "ns-battery-new", answers: ["yes"], text: "Battery replaced recently: the battery monitor may still hold the old battery's settings." },
            { question: "ns-startstop", answers: ["yes"], text: "Start-stop had stopped working: the battery monitor already saw a weak battery." },
            { question: "ns-standing", answers: ["yes"], text: "It happened after standing: points to the battery being drained while parked." }
          ],

          technical: {
            causeIntro: "Cars with start-stop have a battery monitor on the negative terminal. It measures current, voltage and temperature, and the body electronics use it to manage charging and to switch off start-stop and other loads when the battery looks weak.",
            causePoints: [
              { label: "The trigger", text: "The supply voltage falls below what the engine control module needs, most often while cranking with a weak or drained battery." },
              { label: "After a battery change", text: "If the new battery isn't registered, the monitor keeps the old battery's age and settings, so charging and start-stop are managed for the wrong battery." }
            ],
            symptoms: [
              "Slow crank, or only a click",
              "Dash lights dim when starting",
              "Start-stop stops working beforehand",
              "Low-voltage codes in several modules"
            ],
            relatedSystems: ["Battery and battery monitor", "Engine control module (ECM)", "Central electronics (CEM)", "Alternator", "Starter"],
            otherCauses: {
              intro: "Ranked by how well they fit a low-voltage code on this car:",
              items: [
                { label: "Weak or flat battery", text: "The most common reason for low voltage while cranking." },
                { label: "New battery not registered", text: "Likely if the battery was changed recently and start-stop has stayed off since." },
                { label: "Battery drain while parked", text: "Fits a car that fails after standing but starts after a charge." },
                { label: "Poor terminals or earth straps", text: "A connection that drops the voltage under load looks like a weak battery." },
                { label: "Alternator not charging", text: "Fits a battery light while driving before it happened." }
              ]
            },
            checks: {
              draft: true,
              items: [
                { label: "Battery voltage at rest", text: "Well below about 12.4 V points to a discharged battery." },
                { label: "Voltage while cranking", text: "A deep drop points to the battery or a connection." },
                { label: "Battery monitor data", text: "State of charge and battery age, if the scan tool shows them." }
              ]
            }
          },

          fixSteps: {
            steps: [
              {
                title: "Test the battery",
                type: "unordered",
                items: [
                  "Measure the voltage at rest, then do a load test.",
                  "Check the battery type matches the original (EFB or AGM on cars with start-stop)."
                ]
              },
              {
                title: "If the battery was replaced recently: register it",
                intro: "The battery monitor needs to know the new battery. This app can't do it yet; use a scan tool that supports battery registration for Ford.",
                type: "unordered",
                items: [
                  "Set the battery type and capacity to match the new battery.",
                  "Reset the battery monitor so it starts counting the new battery's age."
                ]
              },
              {
                title: "Check the terminals and earth connections",
                type: "unordered",
                items: [
                  "Look for loose or corroded terminals and earth straps.",
                  "Measure the voltage drop across the earth connection while cranking."
                ]
              },
              {
                title: "If the battery keeps going flat",
                type: "unordered",
                items: [
                  "Measure the current draw once the car has gone to sleep, and pull fuses to find the circuit that stays awake.",
                  "Check the charging voltage with the engine running."
                ]
              }
            ],
            skipped: [
              {
                title: "Replace the starter first",
                reason: "A low-voltage code points to the supply first. A starter fault usually shows as a click with bright dash lights and a healthy battery."
              }
            ],
            parts: {
              draft: true,
              items: ["Battery of the original type (EFB or AGM)", "Battery terminal or earth strap"]
            }
          },

          sources: [
            {
              title: "Ford Battery Management System",
              publisher: "moundalexis.com (A. Moundalexis, 2020–2021)",
              url: "https://moundalexis.com/v2/2020/08/06/ford-bms.html",
              trust: "community",
              match: "Ford battery monitor, other models",
              note: "Explains what the sensor on the negative terminal does, that it keeps the old battery's age and parameters until reset after a battery change, and that dealers and FORScan reset it with a scan tool. Tested on F-150s, not a Focus."
            }
          ]
        }
      },
      // P15A8 on the Peugeot 308 2021 1.2 PureTech (29 Sep 2026, Pattern 2 "warning light and a noise"
      // hand-off, PLAN.md §10 "path 5"). Meaning from a real 308 1.2 case (French Car Forum); belt
      // warranty (April 2014 – June 2022 builds) from passionnement-citroen.com; the 2013–2017 brake
      // vacuum pump recall (car-recalls.eu / KBA) is shown as NOT covering this car. The belt-debris
      // reading is the widely reported pattern, not from one confirmed source: checks and parts Draft.
      {
        vehicle: { brand: "Peugeot", model: "308" },
        code: "P15A8",
        title: "Oil pressure below minimum threshold",
        description: "Oil pressure below minimum threshold",
        status: "Active",
        ecu: "Engine Control Module (ECM)",
        aiAssist: {
          title: "Oil pressure too low: stop the engine, then look for timing belt debris",
          confidence: {
            level: "medium",
            label: "Medium confidence",
            reason: "The code's meaning is confirmed on a real 308 1.2 PureTech. That low oil pressure on this engine usually comes from timing belt debris is widely reported, but the one case found turned out to be a failed sensor, so the sensor is kept on the list."
          },
          scope: "P15A8 is a manufacturer-specific code (the P1 range): this is its meaning on the PSA 1.2 PureTech.",
          safety: "Low oil pressure can wreck the engine within minutes: don't drive it. If the brake pedal is also hard, braking assistance may be failing.",

          overview: {
            whatItIs: "The engine control module measured oil pressure below its minimum. The engine may limit revs (limp mode). On the 1.2 PureTech, whose timing belt runs in the oil, the usual worry is belt material blocking the oil strainer.",
            severity: { label: "High", tone: "error", note: "Stop driving until the cause is found." },
            why: [
              { text: "Stored by the engine control module: oil pressure below its minimum.", source: "vehicle" },
              { text: "Same code on a 308 1.2 PureTech: service light above 3,000 rpm, limp mode above 4,500 rpm.", source: "community" },
              { text: "With a noise and a full oil level, a blocked strainer or a worn belt fits better than a failed pump.", source: "ai" },
              { text: "Built 2021: inside the extended belt warranty (engines built April 2014 – June 2022).", source: "community" }
            ],
            likelyFix: [
              "Stop the engine and check the oil level.",
              "Check the timing belt and the oil for belt debris.",
              "Check warranty eligibility before quoting the repair."
            ]
          },

          symptomWhy: [
            { question: "wl-light", answers: ["oil"], text: "Oil pressure warning: matches the code." },
            { question: "wl-noise", answers: ["rattle"], text: "A rattle: fits oil starvation or belt wear." },
            { question: "wl-rpm", answers: ["revs"], text: "Warning at higher revs: typical of a partly blocked oil strainer." },
            { question: "wl-oil-level", answers: ["full"], text: "Oil level is full: points to a blockage or a sensor, not a lack of oil." },
            { question: "wl-brake", answers: ["hard"], text: "Hard brake pedal: belt debris may also be reaching the vacuum pump." },
            { question: "wl-belt-changed", answers: ["no"], text: "The timing belt hasn't been replaced yet." }
          ],

          technical: {
            causeIntro: "On the 1.2 PureTech the timing belt runs inside the engine, in the oil. When it degrades, belt material ends up in the oil, where it can block the oil pump's strainer and reach other oil-fed parts, such as the brake vacuum pump.",
            causePoints: [
              { label: "The trigger", text: "Oil pressure drops below the minimum, most often at higher revs when the engine needs the most oil." },
              { label: "The effect", text: "The engine warns and limits revs. Driving on risks bearing and turbo damage; debris at the vacuum pump can cost braking assistance." }
            ],
            symptoms: [
              "Oil pressure or STOP warning, sometimes only above about 3,000 rpm",
              "Limp mode",
              "Rattle from the engine",
              "Hard brake pedal (if the vacuum pump is affected)"
            ],
            relatedSystems: ["Engine control module (ECM)", "Oil pump and strainer", "Timing belt (in oil)", "Brake vacuum pump", "Oil pressure sensor"],
            otherCauses: {
              intro: "Ranked by how well they fit this code on this engine:",
              items: [
                { label: "Belt debris blocking the oil strainer", text: "The widely reported cause on the 1.2 PureTech." },
                { label: "Low oil level", text: "Rules itself out quickly: check the dipstick first." },
                { label: "Oil pressure sensor or regulator", text: "Found in a real 308 case: the sensor had failed and gave wrong readings." },
                { label: "Worn oil pump", text: "Possible, but less likely than a blockage on this engine." }
              ]
            },
            checks: {
              draft: true,
              items: [
                { label: "Live oil pressure", text: "Compare with the reference for the engine speed; a gauge confirms whether the sensor is right." },
                { label: "Oil and filter", text: "Rubber-like particles in the oil or filter point to belt wear." }
              ]
            },
            notes: [
              "The 2020 brake vacuum pump recall (KBA; EU Safety Gate A12/01504/20) covers engines built March 2013 – April 2017, so it doesn't apply to this 2021 car."
            ]
          },

          fixSteps: {
            steps: [
              {
                title: "Stop and check the oil",
                type: "unordered",
                items: [
                  "Check the oil level on level ground with the engine off.",
                  "Look at the oil and filter for belt particles."
                ]
              },
              {
                title: "Check the timing belt",
                intro: "Follow the workshop manual's belt check for this engine.",
                type: "unordered",
                items: [
                  "Look for cracking, swelling or missing material on the belt.",
                  "If there's belt debris: drop the sump and clean or replace the oil strainer."
                ]
              },
              {
                title: "Before quoting: check the extended warranty",
                intro: "1.2 PureTech engines built April 2014 – June 2022 have 10 years or 175,000 km cover for belt degradation, if serviced at authorised repairers per the schedule.",
                type: "unordered",
                items: [
                  "Check the build date and service history.",
                  "Diagnose and repair through an authorised repairer if the car qualifies."
                ]
              },
              {
                title: "Repair",
                type: "ordered",
                items: [
                  "Replace the timing belt kit, and the oil pump if it's damaged.",
                  "Check the brake vacuum pump for debris, especially if the pedal is hard.",
                  "Fresh oil of the specified grade and a new filter, then re-check oil pressure."
                ]
              },
              {
                title: "If there's no debris and the oil is full",
                type: "unordered",
                items: [
                  "Check the oil pressure sensor against a mechanical gauge, and the pressure regulator."
                ]
              }
            ],
            skipped: [
              {
                title: "Top up the oil and clear the code",
                reason: "With a full oil level and a noise, low pressure points to a blockage or wear. Driving on can wreck the engine, and a warranty claim needs a documented diagnosis."
              }
            ],
            parts: {
              draft: true,
              items: ["Timing belt kit", "Oil strainer / pick-up", "Oil pump (if damaged)", "Brake vacuum pump (if contaminated)", "Oil pressure sensor (if the gauge disagrees)"]
            }
          },

          sources: [
            {
              title: "308 1.2 low oil pressure fault code, but has oil pressure",
              publisher: "French Car Forum",
              url: "https://frenchcarforum.co.uk/forum/viewtopic.php?t=88081",
              trust: "community",
              match: "Same code, same model",
              note: "2015 308 1.2 PureTech: P15A1 and P15A8 (oil pressure below minimum threshold); service light above 3,000 rpm, STOP and limp mode above 4,500 rpm. The original sensor had failed; the thread ends unresolved (Nov 2025)."
            },
            {
              title: "Stellantis offers new extended warranty on PureTech 1.2 motors",
              publisher: "passionnement-citroen.com",
              url: "https://en.passionnement-citroen.com/post/stellantis-offers-new-extended-warranty-on-puretech-1-2-motors",
              trust: "community",
              match: "Same engine: extended warranty",
              note: "From 19 March 2024: 1.2 PureTech built April 2014 – 20 June 2022, up to 10 years or 175,000 km for timing belt degradation, if serviced at authorised repairers. Doesn't quote Stellantis directly."
            },
            {
              title: "Peugeot and Citroën to recall 1.2-litre petrol engines: the brake booster may fail",
              publisher: "car-recalls.eu (23 Nov 2020)",
              url: "https://car-recalls.eu/peugeot-citroen-1-2-puretech-brakes-booster/",
              trust: "verified",
              relation: "Recall for 2013–2017 builds: not this car",
              note: "KBA recall: belt abrasion can damage the vacuum pump and the brake booster may fail; oil pump, belt and other parts replaced. EU Safety Gate A12/01504/20 and A12/01505/20."
            }
          ]
        }
      }
    ],
    fsm: [
      {
        vehicle: { brand: "Audi", model: "A6" },
        code: "C12B354",
        title: "Unknown fault code",
        description: "Unknown fault code",
        status: "Active",
        ecu: "Driver assistance front camera (J852)",
        functionalGroupId: "front-camera",
        aiAssist: {
          title: "Front camera: calibration missing",
          confidence: {
            level: "medium-high",
            label: "Medium-high confidence",
            reason: "The code's meaning is consistent across sources, and the repair order records a windscreen replacement 12 days ago. The same fault is confirmed on a real Audi S5 scan, not yet on the A6."
          },
          scope: "C-codes are manufacturer-specific. This is the Audi meaning for this vehicle. The last two characters, 54, are the standard failure type for “missing calibration”.",
          safety: "Driver assistance is off: Adaptive Cruise Control, Lane Assist, Pre Sense and High Beam Assist won't work until the camera is calibrated. Don't hand the car back before that.",

          overview: {
            whatItIs: "The front camera behind the windscreen has no stored calibration (“no basic setting”). Without it, the camera can't confirm where it's pointing, so it switches off the driver assistance systems that depend on it.",
            severity: { label: "High", tone: "error", note: "Drivable, but safety assist systems are off." },
            why: [
              { text: "Reported by the driver assistance front camera.", source: "vehicle" },
              { text: "Failure type 54 = missing calibration.", source: "ai" },
              { text: "Windscreen replaced 12 days ago; warnings since then.", source: "history" },
              { text: "Same fault on an Audi S5 after a windscreen replacement.", source: "verified" }
            ],
            likelyFix: [
              "Check the windscreen in front of the camera.",
              "Run the front camera calibration."
            ]
          },

          // Symptom Check answers (ADAS path) that support this reading, shown first in "Why AI thinks
          // so" when the check ran for this vehicle.
          symptomWhy: [
            { question: "work", answers: ["windscreen"], text: "Windscreen replaced recently: the camera drops its calibration when it's refitted." },
            { question: "persistence", answers: ["stays"], text: "The warning stays on after a restart: fits a missing calibration, not a passing glitch." },
            { question: "warnings", answers: ["lane", "presense", "several"], text: "Warnings from systems that rely on the front camera." },
            { question: "glass", answers: ["clear"], text: "The windscreen looks clear in front of the camera." }
          ],

          technical: {
            causeIntro: "The camera stores its alignment as a “basic setting”. When the camera or windscreen is disturbed, it drops that setting on purpose, so it never works from an alignment that may no longer be true.",
            causePoints: [
              { label: "The trigger", text: "Replacing the windscreen means removing and refitting the camera. After that, the stored calibration is gone and the camera reports “no basic setting”." },
              { label: "The effect", text: "Until a new calibration is saved, the camera switches off every system that relies on it." }
            ],
            symptoms: [
              "“Lane assist: unavailable”",
              "“Audi pre sense: malfunction”",
              "Adaptive Cruise Control and High Beam Assist unavailable"
            ],
            relatedSystems: ["Front camera (J852)", "Adaptive Cruise Control", "Lane Assist", "Audi Pre Sense", "High Beam Assist"],
            otherCauses: {
              intro: "Ranked lower here, because the repair order records a recent windscreen replacement:",
              items: [
                { label: "Voltage or communication glitch", text: "A battery voltage dip or a CAN interruption can make the camera lose its stored setting." },
                { label: "Camera hardware failing", text: "Heat-stressed camera electronics sometimes report a calibration fault before failing completely." },
                { label: "Windscreen or lens distortion", text: "Chips, film or fogging in front of the lens can stop the camera recognising its reference." }
              ]
            },
            notes: [
              "Some diagnostic tools also offer a dynamic calibration, done by driving on well-marked roads. This app runs the static calibration with a target board."
            ]
          },

          fixSteps: {
            steps: [
              {
                title: "Check the windscreen in front of the camera",
                intro: "A new calibration only holds if the camera has a clear view.",
                type: "unordered",
                items: [
                  "Look for chips, film or fogging directly in front of the lens.",
                  "Check that the camera is seated correctly in its mount after the windscreen work.",
                  "Run the lens obstruction test and compare the reported contamination with what you see."
                ],
                action: { label: "Open Camera lens obstruction test", systemId: "fsm", functionId: "front-camera-lens-test" }
              },
              {
                title: "Run the front camera calibration",
                intro: "Static calibration with a target board, following the workshop manual for this vehicle.",
                type: "ordered",
                items: [
                  "Park on a level floor, with correct tyre pressures and an empty vehicle.",
                  "Set up the calibration target (e.g. VAS 6430) at the specified distance and height.",
                  "Run the calibration and let it save the new basic setting.",
                  "Re-scan to confirm C12B354 is gone."
                ],
                action: { label: "Open ADAS Calibration", systemId: "fsm", functionId: "adas-calibration" }
              },
              {
                title: "If the calibration fails or the code returns",
                type: "unordered",
                items: [
                  "Check the camera's power supply, ground and CAN connection.",
                  "If calibration keeps failing, suspect the camera itself: replace it and code it to the vehicle."
                ]
              }
            ],
            skipped: [
              {
                title: "Clear the code and test drive",
                reason: "The windscreen was replaced recently, so the camera dropped its calibration on purpose. Clearing the code won't restore it, and the assist systems would stay off."
              }
            ]
          },

          // `match` = labelled but still counted as a basis (unlike `relation`, which marks
          // related-but-not-supporting material and is left out of "Based on N sources").
          sources: [
            {
              title: "B9 S5 pre sense malfunction: front camera initial calibration missing",
              publisher: "Ross-Tech Forums (makers of VCDS)",
              url: "https://forums.ross-tech.com/index.php?threads/19798/",
              trust: "verified",
              match: "Same fault, different model",
              note: "Real VCDS scan after a windscreen replacement: “No Basic Setting B2010 00 [Initial_calibration_missing]”. Fixed by recalibrating with special tools (VAS 6430) on an alignment rack."
            }
          ],

          // Video found 2026-09-28: its own description is this exact fault ("Front camera - No
          // basic setting, Pre Sense fault, ACC not available"), but it doesn't name the model — so
          // it's labelled, not presented as A6-specific. 1:01 long, no chapters (none needed).
          media: [
            {
              type: "video",
              youtubeId: "dmXCwJFaUjM",
              title: "Audi Front Camera Calibration",
              channel: "Eral Auto",
              length: "1:01",
              trust: "community",
              relation: "Same fault, model not stated",
              relevance: "Shows the same fault (no basic setting, Pre Sense fault, ACC not available) being calibrated. The model isn't stated, so check the procedure against the workshop manual for the A6."
            },
            {
              type: "diagram",
              diagramId: "front-camera-calibration",
              title: "Static calibration: camera and target setup",
              caption: "Generic side view, not an Audi drawing. The camera behind the windscreen is calibrated against a target placed in front of the vehicle. The exact distance and height come from the workshop manual.",
              focusLabel: "Camera",
              trust: "illustration"
            }
          ]
        }
      }
    ]
  },

  // Systems that always scan clean on a demo vehicle (no random or shared demo fault), for Symptom
  // Check paths whose likely causes set no code: the Octavia's smoke path (coolant into the EGR
  // cooler), where a clean Engine scan is the honest outcome.
  clean: {
    cars: [
      { vehicle: { brand: "Skoda", model: "Octavia" }, systems: ["ecm"] },
      // Focus no-start: the voltage code is the finding; the CEM scans clean so it isn't buried in noise.
      { vehicle: { brand: "Ford", model: "Focus" }, systems: ["cem"] }
    ]
  },
  isClean: function (vehicleType, systemId, brand, model) {
    var b = (brand || "").trim().toLowerCase();
    var m = (model || "").trim().toLowerCase();
    return (this.clean[vehicleType] || []).some(function (c) {
      return c.vehicle.brand.toLowerCase() === b && c.vehicle.model.toLowerCase() === m && c.systems.indexOf(systemId) !== -1;
    });
  },

  // Entries for one system that belong to this vehicle.
  forVehicle: function (vehicleType, systemId, brand, model) {
    var entries = ((this[vehicleType] || {})[systemId]) || [];
    var b = (brand || "").trim().toLowerCase();
    var m = (model || "").trim().toLowerCase();
    return entries.filter(function (e) {
      return e.vehicle && e.vehicle.brand.toLowerCase() === b && e.vehicle.model.toLowerCase() === m;
    });
  }
};
