// ai-patterns/ only — scripted content for the Guided symptom check (Pattern 2, src/ai-patterns/PLAN.md §6).
// Rendered and ranked by ai-patterns-symptom-check.js.
//
// The starting question lists complaints in groups (a real product needs far more; the ones not scripted
// here are shown, disabled). Each scripted complaint belongs to a path with its own causes, questions,
// model knowledge and systems to scan:
//   - engine: rough idle / loss of power on a diesel (hand-off: Volvo XC60 D5 → P010000)
//   - adas:   driver assistance warning (hand-off: Audi A6 2020 → C12B354)
//   - noise:  warning light and a noise from the engine (hand-off: Peugeot 308 2021 1.2 PureTech → P15A8)
//   - nostart: won't start or cranks slowly (hand-off: Ford Focus 2017 petrol → P0562)
//   - smoke:  smoke from the exhaust on a diesel (Skoda Octavia 2017 2.0 TDI; the likely causes often
//             set no code, so the plan leads with physical checks and the scan comes back clean)
// The real product would have AI interpret the answers; the prototype scripts them, but in a shape
// that shows the AI traits:
//   - causes carry a prior per complaint, and every answer multiplies them (live re-ranking)
//   - questions only appear when they apply to what's known about the vehicle
//   - the next question is picked by how well it separates the current top causes (see the engine)
//   - model knowledge (with sources) kicks in once the vehicle is known, incl. ruling causes out
//
// Research (PLAN.md §10, 29 Sep 2026): Vedran's search + Claude's search + a second AI agent's answer,
// compared. Only the forum threads and trade article linked below are cited. Observations that come
// only from general diesel knowledge in the AI answers (smoke colours, fan after switch-off, cutting
// out after refuelling, cold-start timing) carry `draft: true` ("Draft — to verify").
//
// ADAS path (29 Sep 2026): built on the C12B354 research (PLAN.md §10, 28 Sep): the code's meaning,
// and the Ross-Tech case (same fault after a windscreen replacement). Which assist system relies on
// which sensor, weather/low-sun blinding and radar knocks are general knowledge: `draft: true`.
//
// Smoke path (29 Sep 2026, PLAN.md §10 "path 3"): EA288 EGR cooler coolant leaks from a real T6
// 2.0 TDI case and a trade article; the water-cooled charge air cooler from de.wikipedia. The colour /
// smell / timing logic is general diesel knowledge from the research answers: `draft: true`.
//
// No-start path (29 Sep 2026, PLAN.md §10 "path 4"): the Ford battery monitor (moundalexis.com) and
// the 1.0 EcoBoost no-spark case (Pico Technology forum) are sourced; the crank / lights / standing /
// warning-light logic is general knowledge from the research answers: `draft: true`. Recall 18S32 is
// left out: it only covers the 2.0 GDI/GTDI, and the vehicle card doesn't know the engine size.
//
// Noise path (29 Sep 2026, PLAN.md §10 "path 5"): the 2013–2017 brake vacuum pump recall (KBA, via
// car-recalls.eu), the extended belt warranty (April 2014 – June 2022 builds) and P15A8's meaning are
// sourced. Which light / which noise / when logic, and all non-belt causes, are general: `draft: true`.
//
// Effects are multipliers on a cause's weight. Missing = 1 (no effect). 0 rules a cause out.
window.AiPatternsSymptomLibrary = (function () {
  "use strict";

  var SOURCES = {
    xc60MafWire: {
      title: "XC60 2.4 D5 with MAF fault",
      publisher: "Volvo Owners Club Forum",
      url: "https://www.volvoforums.org.uk/showthread.php?t=299900",
      trust: "community"
    },
    xc60BoostLeak: {
      title: "XC60 D5 AWD 2012: P00BD, Engine Service Required and limp mode",
      publisher: "Volvo Owners Club Forum",
      url: "https://www.volvoforums.org.uk/forum/technical-topics/s60-v60-11-18-xc60-09-17-general/298842-xc60-d5-awd-2012-p00bd-engine-service-required-limp-mode",
      trust: "community"
    },
    xc60Egr: {
      title: "Common problems with the Volvo XC60",
      publisher: "ClickMechanic (28 Oct 2025)",
      url: "https://www.clickmechanic.com/blog/common-problems-with-volvo-xc60/",
      trust: "verified"
    },
    rossTechCamera: {
      title: "B9 S5 pre sense malfunction: front camera initial calibration missing",
      publisher: "Ross-Tech Forums (makers of VCDS)",
      url: "https://forums.ross-tech.com/index.php?threads/19798/",
      trust: "verified"
    },
    ea288EgrCoolerCase: {
      title: "Losing coolant internally, 2017 2.0 TDI 150 (T6)",
      publisher: "VW T6 Transporter Forum",
      url: "https://www.t6forum.com/threads/losing-coolant-internally-2017-2-0-tdi-150bph-exaa-van.47268/",
      trust: "community"
    },
    ea288Trade: {
      title: "VW EA288 Motorprobleme: Symptome und Lösungen",
      publisher: "Motorzentrale.de (16 Jun 2025)",
      url: "https://www.motorzentrale.de/magazin/vw-ea288-motorprobleme-symptome-loesungen/",
      trust: "verified"
    },
    ea288Wiki: {
      title: "VW EA288",
      publisher: "Wikipedia (German)",
      url: "https://de.wikipedia.org/wiki/VW_EA288",
      trust: "community"
    },
    fordBms: {
      title: "Ford Battery Management System",
      publisher: "moundalexis.com (A. Moundalexis, 2020–2021)",
      url: "https://moundalexis.com/v2/2020/08/06/ford-bms.html",
      trust: "community"
    },
    focusNoSpark: {
      title: "Ford Focus MK3 1.0 EcoBoost no spark",
      publisher: "Pico Technology forum",
      url: "https://www.picoauto.com/support/viewtopic.php?t=22007",
      trust: "community"
    },
    puretechRecall: {
      title: "Peugeot and Citroën to recall 1.2-litre petrol engines: the brake booster may fail",
      publisher: "car-recalls.eu (23 Nov 2020, reporting the KBA recall)",
      url: "https://car-recalls.eu/peugeot-citroen-1-2-puretech-brakes-booster/",
      trust: "verified"
    },
    puretechWarranty: {
      title: "Stellantis offers new extended warranty on PureTech 1.2 motors",
      publisher: "passionnement-citroen.com",
      url: "https://en.passionnement-citroen.com/post/stellantis-offers-new-extended-warranty-on-puretech-1-2-motors",
      trust: "community"
    },
    p15a8Case: {
      title: "308 1.2 low oil pressure fault code, but has oil pressure",
      publisher: "French Car Forum",
      url: "https://frenchcarforum.co.uk/forum/viewtopic.php?t=88081",
      trust: "community"
    },
    d5NoSwirl: {
      title: "D5 D5244T4 versus D5244T15 engines",
      publisher: "Volvo Owners Club Forum",
      url: "https://www.volvoforums.org.uk/forum/technical-topics/s60-v60-11-18-xc60-09-17-general/321871-d5-d5244t4-versus-d5244t15-engines",
      trust: "community"
    }
  };

  // fuels: which engine types the cause exists on. check: the first quick check for the plan.
  var COMBUSTION_FUELS = ["diesel", "petrol", "hybrid"];

  // ===== Engine path: rough idle / loss of power =====
  var engineCauses = [
    { id: "maf", name: "MAF sensor or its wiring", short: "MAF / wiring", fuels: ["diesel", "petrol", "hybrid"],
      check: "Watch the live MAF reading at idle, then move the harness: a reading that drops out points to the wiring." },
    { id: "boost", name: "Boost leak (intercooler hose)", short: "Boost leak", fuels: ["diesel", "petrol", "hybrid"],
      check: "Check the intercooler hoses for splits and oily residue, especially where they can rub on a bracket." },
    { id: "egr", name: "EGR valve sticking (carbon)", short: "EGR valve", fuels: ["diesel", "petrol", "hybrid"],
      check: "Run the EGR valve adaption and check the valve moves freely." },
    { id: "dpf", name: "Clogged diesel particulate filter (DPF)", short: "DPF", fuels: ["diesel"],
      check: "Read the DPF soot load and differential pressure in live data.", checkDraft: true },
    { id: "turbo", name: "Turbo control (actuator or vacuum)", short: "Turbo control", fuels: ["diesel", "petrol", "hybrid"],
      check: "Run the turbo actuator test and check the vacuum lines.", checkDraft: true },
    { id: "injectors", name: "Injector fault", short: "Injectors", fuels: ["diesel", "petrol", "hybrid"],
      check: "Run the cylinder cut-off test and compare how much each cylinder changes the idle.", checkDraft: true },
    { id: "fuel", name: "Fuel filter or low fuel pressure", short: "Fuel supply", fuels: ["diesel", "petrol", "hybrid"],
      check: "Check when the fuel filter was last changed, then compare rail pressure with the requested value under load.", checkDraft: true },
    { id: "glow", name: "Glow plugs or glow plug module", short: "Glow plugs", fuels: ["diesel"],
      check: "Check the glow plug circuit: run the glow plug relay test and look for glow plug codes.", checkDraft: true },
    { id: "swirl", name: "Swirl flaps (intake manifold)", short: "Swirl flaps", fuels: ["diesel"],
      check: "Check the swirl flap linkage on the intake manifold for a loose or broken arm.", checkDraft: true }
  ];

  // How each complaint shifts the starting weights (before any other answer).
  var enginePriors = {
    idle:  { maf: 1.2, boost: 0.6, egr: 1.4, dpf: 0.8, turbo: 0.5, injectors: 1.4, fuel: 0.8, glow: 1.5, swirl: 1.3 },
    power: { maf: 1.2, boost: 1.6, egr: 1.1, dpf: 1.5, turbo: 1.5, injectors: 1.0, fuel: 1.3, glow: 0.3, swirl: 0.8 },
    both:  { maf: 1.4, boost: 1.2, egr: 1.4, dpf: 1.1, turbo: 1.0, injectors: 1.1, fuel: 1.0, glow: 0.7, swirl: 1.0 }
  };

  // Shared by the combustion paths (same id, same answer): asked when the engine type isn't known.
  var fuelQuestion = {
    id: "fuel",
    label: "Runs on",
    text: "What does it run on?",
    hint: "Decides which causes are possible at all: a DPF or glow plugs only exist on diesels.",
    applies: function (ctx) { return !ctx.vehicleFuel; },
    chips: [
      { id: "diesel", label: "Diesel" },
      { id: "petrol", label: "Petrol" },
      { id: "hybrid", label: "Hybrid" },
      { id: "electric", label: "Electric" }
    ],
    setsFuel: true
  };

  // label = short name for the "Your answers" list. hint = why this question is asked (the engine adds
  // which of the current top causes it separates). applies(ctx): ctx = { fuel, complaint, answers, top }.
  var engineQuestions = [
    fuelQuestion,
    {
      id: "when",
      label: "When it's rough",
      text: "Is it rough only just after a cold start, or also when warm?",
      hint: "Separates cold-start causes from ones that stay once the engine is warm.",
      draft: true,
      applies: function (ctx) { return ctx.complaint !== "power"; },
      chips: [
        { id: "cold", label: "Only just after a cold start", effects: { glow: 3, injectors: 1.3, maf: 0.7, boost: 0.4, egr: 0.8, dpf: 0.5, turbo: 0.5, fuel: 0.7, swirl: 0.8 } },
        { id: "warm", label: "Cold and warm", effects: { glow: 0.3, egr: 1.3, injectors: 1.3, maf: 1.2, swirl: 1.2 } }
      ]
    },
    {
      id: "load",
      label: "Power loss",
      text: "When does it lose power?",
      hint: "Boost and fuel supply problems show under load; air mass and EGR problems show earlier.",
      applies: function (ctx) { return ctx.complaint === "power" || ctx.complaint === "both"; },
      chips: [
        { id: "hard", label: "Under hard acceleration or uphill", effects: { boost: 1.6, turbo: 1.5, fuel: 1.5, dpf: 1.3, glow: 0.4, egr: 0.8, swirl: 0.7 } },
        { id: "light", label: "Also at light throttle", effects: { egr: 1.6, maf: 1.4, boost: 0.8, turbo: 0.8, fuel: 0.8 } }
      ]
    },
    {
      id: "noise",
      label: "Noise",
      text: "Any noise when accelerating?",
      hint: "A whoosh under boost is air escaping from a split hose, the clearest sign of a boost leak.",
      applies: function (ctx) { return ctx.fuel !== "electric"; },
      chips: [
        { id: "whoosh", label: "Whoosh or hiss", effects: { boost: 3, turbo: 1.3, maf: 0.8, egr: 0.7, dpf: 0.7, injectors: 0.6, glow: 0.5, fuel: 0.7, swirl: 0.7 } },
        { id: "whistle", label: "Whistle or siren", effects: { turbo: 2, boost: 1.5, egr: 0.8, glow: 0.6 } },
        { id: "none", label: "No unusual noise", effects: { boost: 0.5, turbo: 0.8 } }
      ]
    },
    {
      id: "message",
      label: "Dashboard",
      text: "Any message or warning on the dashboard?",
      hint: "Some messages point straight at one system; limp mode narrows it to faults the engine protects itself from.",
      chips: [
        { id: "engine", label: "Engine light only", effects: { maf: 1.2, egr: 1.1, glow: 1.1 } },
        { id: "limp", label: "Reduced power / limp mode", effects: { boost: 1.4, turbo: 1.4, maf: 1.3, dpf: 1.3, glow: 0.5, injectors: 0.8 } },
        { id: "soot", label: "Soot filter full", effects: { dpf: 4, egr: 1.1 }, fuels: ["diesel"] },
        { id: "nothing", label: "No warnings", effects: { maf: 0.6, dpf: 0.6, turbo: 0.8 } }
      ]
    },
    {
      id: "onset",
      label: "Onset",
      text: "Did it start suddenly, or build up over time?",
      hint: "Split hoses and broken wires fail suddenly; carbon and soot build up over weeks.",
      draft: true,
      chips: [
        { id: "sudden", label: "Suddenly", effects: { boost: 1.6, maf: 1.4, turbo: 1.2, dpf: 0.5, egr: 0.7, injectors: 0.8 } },
        { id: "gradual", label: "Gradually, over weeks", effects: { dpf: 1.8, egr: 1.6, injectors: 1.3, boost: 0.7, maf: 0.8, swirl: 1.3 } },
        { id: "refuel", label: "Right after refuelling", effects: { fuel: 3, injectors: 1.3, boost: 0.6, egr: 0.7, dpf: 0.7, maf: 0.7 } }
      ]
    },
    {
      id: "trips",
      label: "Driving",
      text: "Is it mostly used for short trips?",
      hint: "A DPF only cleans itself on longer drives, so city use lets soot build up.",
      applies: function (ctx) { return ctx.fuel === "diesel" || !ctx.fuel; },
      chips: [
        { id: "short", label: "Mostly short or city trips", effects: { dpf: 1.8, egr: 1.5, swirl: 1.2 } },
        { id: "long", label: "Regular longer drives", effects: { dpf: 0.5, egr: 0.8 } }
      ]
    },
    {
      id: "smoke",
      label: "Smoke",
      text: "Any smoke from the exhaust?",
      hint: "Black smoke means too little air for the fuel; white smoke at a cold start means fuel not burning.",
      draft: true,
      applies: function (ctx) { return ctx.fuel !== "electric"; },
      chips: [
        { id: "black", label: "Black, when accelerating", effects: { boost: 1.4, egr: 1.4, maf: 1.3, injectors: 1.2, turbo: 1.2, glow: 0.6 } },
        { id: "white", label: "White, at a cold start", effects: { glow: 2, injectors: 1.4, boost: 0.7, maf: 0.8 } },
        { id: "none", label: "No smoke", effects: { injectors: 0.8, egr: 0.9 } }
      ]
    },
    {
      id: "fan",
      label: "Fan after switch-off",
      text: "Does the cooling fan keep running after the engine is switched off?",
      hint: "Can mean a DPF clean-out was interrupted. Only worth asking while the DPF is a likely cause.",
      draft: true,
      applies: function (ctx) { return (ctx.fuel === "diesel" || !ctx.fuel) && ctx.top.indexOf("dpf") !== -1 && ctx.top.indexOf("dpf") < 3; },
      chips: [
        { id: "yes", label: "Yes, often", effects: { dpf: 1.8 } },
        { id: "no", label: "No", effects: { dpf: 0.8 } }
      ]
    }
  ];

  // Model knowledge. Applies once the vehicle matches; each item adjusts one cause and says why, with
  // its source. `ruleOut` removes a cause for this vehicle and lists it under "Ruled out".
  var engineKnowledge = [
    {
      id: "volvo-xc60-d5",
      label: "Volvo XC60 D5",
      matches: function (v) { return v.brandSlug === "volvo" && (v.model || "").toLowerCase() === "xc60" && v.fuel === "diesel"; },
      items: [
        { cause: "boost", factor: 1.3, note: "Known on the XC60 D5: split intercooler inlet hose, limp mode and a whoosh", source: SOURCES.xc60BoostLeak },
        { cause: "maf", factor: 1.3, note: "Known on the XC60 D5: a broken MAF wire, a new sensor didn't fix it", source: SOURCES.xc60MafWire },
        { cause: "egr", factor: 1.2, note: "EGR carbon build-up on the XC60 D5, especially up to 2015", source: SOURCES.xc60Egr },
        {
          cause: "swirl",
          when: function (v) { return parseInt(v.year, 10) >= 2012; },
          ruleOut: true,
          note: "The twin-turbo Euro 5 D5 engine has no swirl flaps (they were on the earlier D5)",
          source: SOURCES.d5NoSwirl
        },
        {
          cause: "swirl",
          when: function (v) { return !v.year; },
          factor: 0.5,
          note: "Only the earlier D5 engines have swirl flaps. Add the year to check",
          source: SOURCES.d5NoSwirl
        }
      ]
    }
  ];

  // Which systems the plan suggests scanning, per cause. All of these faults are stored by the engine
  // control module on this vehicle type (see functions-library.js: ecm has EGR, DPF, turbo, glow
  // plug and injector functions).
  var engineSystems = { ecm: { label: "Engine (ECM)", causes: ["maf", "boost", "egr", "dpf", "turbo", "injectors", "fuel", "glow", "swirl"] } };

  // ===== ADAS path: driver assistance warning =====
  var adasCauses = [
    { id: "cam-calib", name: "Front camera calibration missing", short: "Calibration",
      check: "Read the front camera's fault memory: a calibration fault means running the camera calibration." },
    { id: "cam-view", name: "Camera view blocked (windscreen, film, fogging)", short: "Camera view",
      check: "Look at the windscreen in front of the camera for chips, film or fogging, and run the lens obstruction test." },
    { id: "cam-weather", name: "Blinded for a while (rain, snow, low sun, dirt)", short: "Weather / dirt",
      check: "Clean the windscreen and the sensor covers, then re-check after a drive in clear conditions.", checkDraft: true },
    { id: "cam-power", name: "Voltage or communication glitch", short: "Voltage / CAN",
      check: "Check the battery voltage and the camera's power, ground and CAN connection." },
    { id: "cam-radar", name: "Front radar misaligned or dirty", short: "Front radar",
      check: "Check the radar cover in the front bumper for dirt, damage or signs of a knock.", checkDraft: true },
    { id: "cam-hardware", name: "Front camera failing", short: "Camera fault",
      check: "If the calibration keeps failing, suspect the camera itself." }
  ];

  var adasPriors = {
    adas: { "cam-calib": 1, "cam-view": 1, "cam-weather": 1.2, "cam-power": 0.8, "cam-radar": 1, "cam-hardware": 0.6 }
  };

  var adasQuestions = [
    {
      id: "work",
      label: "Recent work",
      text: "Any recent work on the car?",
      hint: "Replacing the windscreen or repairing the front end disturbs the sensors; a flat battery can make modules lose settings.",
      chips: [
        { id: "windscreen", label: "Windscreen replaced", effects: { "cam-calib": 4, "cam-view": 1.5, "cam-weather": 0.5, "cam-radar": 0.5, "cam-power": 0.7 } },
        { id: "bumper", label: "Front bumper or bodywork repaired", effects: { "cam-radar": 3, "cam-calib": 1.3, "cam-weather": 0.6 } },
        { id: "battery", label: "Battery replaced or went flat", effects: { "cam-power": 3, "cam-calib": 1.2, "cam-weather": 0.6 } },
        { id: "none", label: "No recent work", effects: { "cam-calib": 0.6, "cam-radar": 0.8 } }
      ]
    },
    {
      id: "warnings",
      label: "Warnings",
      text: "Which systems report a problem?",
      hint: "Lane assist relies on the front camera; adaptive cruise also relies on the front radar, so the mix points to the sensor.",
      draft: true,
      chips: [
        { id: "lane", label: "Lane assist", effects: { "cam-radar": 0.3, "cam-calib": 1.3, "cam-view": 1.3 } },
        { id: "acc", label: "Adaptive cruise only", effects: { "cam-radar": 3, "cam-calib": 0.5, "cam-view": 0.5, "cam-hardware": 0.7 } },
        { id: "presense", label: "Pre sense / collision warning", effects: { "cam-calib": 1.2, "cam-radar": 1.2 } },
        { id: "several", label: "Several at once", effects: { "cam-calib": 1.6, "cam-power": 1.4, "cam-hardware": 1.2, "cam-radar": 0.7 } }
      ]
    },
    {
      id: "persistence",
      label: "Stays or comes and goes",
      text: "Does the warning stay, or come and go?",
      hint: "A missing calibration doesn't come and go; weather, dirt and voltage dips do.",
      draft: true,
      chips: [
        { id: "stays", label: "Stays on, even after a restart", effects: { "cam-calib": 1.6, "cam-hardware": 1.3, "cam-weather": 0.3, "cam-power": 0.7 } },
        { id: "comes", label: "Comes and goes", effects: { "cam-weather": 2, "cam-power": 1.6, "cam-view": 1.2, "cam-calib": 0.4 } }
      ]
    },
    {
      id: "conditions",
      label: "Conditions",
      text: "Does it show up in particular conditions?",
      hint: "Rain, snow or low sun can blind the camera for a while; a warning at start-up points to a voltage dip.",
      draft: true,
      applies: function (ctx) { return ctx.answers.persistence !== "stays"; },
      chips: [
        { id: "weather", label: "In rain, snow or low sun", effects: { "cam-weather": 3, "cam-view": 1.2 } },
        { id: "start", label: "Right after starting", effects: { "cam-power": 2.5 } },
        { id: "none", label: "No pattern", effects: { "cam-weather": 0.6 } }
      ]
    },
    {
      id: "glass",
      label: "Windscreen",
      text: "Anything on the windscreen in front of the camera?",
      hint: "The camera looks through the windscreen: anything in its view can stop it recognising the road.",
      chips: [
        { id: "chip", label: "Chip or crack", effects: { "cam-view": 3 } },
        { id: "film", label: "Sticker, film or tint", effects: { "cam-view": 3 } },
        { id: "fog", label: "Fogging or dirt", effects: { "cam-view": 2, "cam-weather": 1.5 } },
        { id: "clear", label: "Looks clear", effects: { "cam-view": 0.4 } }
      ]
    }
  ];

  var adasKnowledge = [
    {
      id: "audi-a6",
      label: "Audi A6",
      matches: function (v) { return v.brandSlug === "audi" && (v.model || "").toLowerCase() === "a6"; },
      items: [
        { cause: "cam-calib", factor: 1.2, note: "Same fault on an Audi S5 after a windscreen replacement: initial calibration missing", source: SOURCES.rossTechCamera }
      ]
    }
  ];

  var adasSystems = { fsm: { label: "ADAS front camera", causes: ["cam-calib", "cam-view", "cam-weather", "cam-power", "cam-radar", "cam-hardware"] } };

  // ===== Smoke path: smoke from the exhaust (diesel) =====
  // noCode: usually sets no fault code, so the scan can come back clean while this is the cause.
  var smokeCauses = [
    { id: "sm-egr-cooler", name: "Coolant into the exhaust: EGR cooler leak", short: "EGR cooler", fuels: ["diesel"], noCode: true,
      check: "Pressure-test the cooling system cold, then look for coolant in the EGR cooler and intake with a borescope." },
    { id: "sm-cac", name: "Coolant into the intake: water-cooled charge air cooler leak", short: "Charge air cooler", fuels: ["diesel"], noCode: true,
      check: "Look into the intake manifold with a borescope for coolant (only on engines with a water-cooled charge air cooler).", checkDraft: true },
    { id: "sm-head", name: "Head gasket or cracked cylinder head", short: "Head gasket", fuels: COMBUSTION_FUELS, noCode: true,
      check: "Test the coolant for exhaust gas (combustion leak test).", checkDraft: true },
    { id: "sm-fuel", name: "Unburnt fuel: injector or glow plugs", short: "Injector / glow", fuels: ["diesel"],
      check: "Compare the injector correction values in live data on a cold start.", checkDraft: true },
    { id: "sm-oil", name: "Burning oil: turbo seals or crankcase breather", short: "Burning oil", fuels: COMBUSTION_FUELS,
      check: "Check the charge air hoses for standing oil, and ask about oil consumption.", checkDraft: true },
    { id: "sm-rich", name: "Too much fuel for the air (black smoke)", short: "Running rich", fuels: COMBUSTION_FUELS,
      check: "Check the tailpipe for soot: with a DPF, visible black smoke usually means the filter is damaged or removed.", checkDraft: true },
    { id: "sm-regen", name: "DPF regeneration (normal)", short: "DPF regeneration", fuels: ["diesel"], noCode: true,
      check: "Check in live data whether a regeneration was running when it smoked.", checkDraft: true },
    { id: "sm-condensation", name: "Condensation (normal in cold weather)", short: "Condensation", fuels: COMBUSTION_FUELS, noCode: true,
      check: "Thin white vapour that clears once warm, with no coolant loss, is normal.", checkDraft: true }
  ];

  var smokePriors = {
    // sm-cac starts low: many diesels have an air-to-air intercooler. Known EA288 → raised (knowledge).
    smoke: { "sm-egr-cooler": 1.2, "sm-cac": 0.35, "sm-head": 0.6, "sm-fuel": 1, "sm-oil": 1, "sm-rich": 0.6, "sm-regen": 1, "sm-condensation": 1.2 }
  };

  var smokeQuestions = [
    fuelQuestion,
    {
      id: "sm-colour",
      label: "Colour",
      text: "What colour is the smoke?",
      hint: "The colour points to what's burning: coolant or unburnt fuel (white), oil (blue), too much fuel (black).",
      draft: true,
      chips: [
        { id: "white", label: "White", effects: { "sm-oil": 0.3, "sm-rich": 0.1, "sm-regen": 0.8 } },
        { id: "blue", label: "Blue or grey", effects: { "sm-oil": 4, "sm-regen": 1.2, "sm-egr-cooler": 0.3, "sm-cac": 0.3, "sm-head": 0.4, "sm-fuel": 0.5, "sm-rich": 0.4, "sm-condensation": 0.2 } },
        { id: "black", label: "Black", effects: { "sm-rich": 4, "sm-oil": 0.6, "sm-egr-cooler": 0.2, "sm-cac": 0.2, "sm-head": 0.2, "sm-fuel": 0.6, "sm-condensation": 0.1, "sm-regen": 0.4 } }
      ]
    },
    {
      id: "sm-when",
      label: "When it smokes",
      text: "When does it smoke?",
      hint: "Condensation and cold-start fuel smoke clear once warm; a coolant leak keeps going.",
      draft: true,
      chips: [
        { id: "cold", label: "Only at a cold start, clears when warm", effects: { "sm-condensation": 3, "sm-fuel": 1.8, "sm-egr-cooler": 0.8, "sm-cac": 0.8, "sm-head": 0.6, "sm-regen": 0.3, "sm-rich": 0.5 } },
        { id: "warm", label: "Also when warm", effects: { "sm-condensation": 0.1, "sm-egr-cooler": 1.6, "sm-cac": 1.5, "sm-head": 1.4, "sm-oil": 1.3, "sm-rich": 1.3 } },
        { id: "now-and-then", label: "Now and then while driving", effects: { "sm-regen": 4, "sm-condensation": 0.4, "sm-fuel": 0.5, "sm-head": 0.6 } }
      ]
    },
    {
      id: "sm-coolant",
      label: "Coolant level",
      text: "Does the coolant level keep dropping?",
      hint: "Coolant going down without a visible leak means it's being burnt: the strongest sign of an internal leak.",
      chips: [
        { id: "yes", label: "Yes, it needs topping up", effects: { "sm-egr-cooler": 3, "sm-cac": 3, "sm-head": 3, "sm-fuel": 0.4, "sm-oil": 0.4, "sm-rich": 0.4, "sm-regen": 0.3, "sm-condensation": 0.1 } },
        { id: "no", label: "No", effects: { "sm-egr-cooler": 0.2, "sm-cac": 0.2, "sm-head": 0.2 } }
      ]
    },
    {
      id: "sm-smell",
      label: "Smell",
      text: "What does the smoke smell like?",
      hint: "Coolant smells sweet, unburnt diesel smells raw, oil smells burnt.",
      draft: true,
      chips: [
        { id: "sweet", label: "Sweet", effects: { "sm-egr-cooler": 2.5, "sm-cac": 2.5, "sm-head": 2.5, "sm-fuel": 0.5, "sm-oil": 0.5, "sm-condensation": 0.3 } },
        { id: "diesel", label: "Raw diesel", effects: { "sm-fuel": 3, "sm-rich": 1.5, "sm-egr-cooler": 0.5, "sm-cac": 0.5, "sm-head": 0.5 } },
        { id: "oil", label: "Burning oil", effects: { "sm-oil": 3, "sm-egr-cooler": 0.5, "sm-cac": 0.5 } },
        { id: "hot", label: "Hot, like something burning off", effects: { "sm-regen": 2.5 } },
        { id: "nothing", label: "Nothing special", effects: { "sm-condensation": 1.5 } }
      ]
    },
    {
      id: "sm-oil-use",
      label: "Oil use",
      text: "Does it use oil between services?",
      hint: "Blue smoke with oil going down points to the turbo or the crankcase breather.",
      chips: [
        { id: "yes", label: "Yes, it needs topping up", effects: { "sm-oil": 3 } },
        { id: "no", label: "No", effects: { "sm-oil": 0.4 } }
      ]
    },
    {
      id: "sm-running",
      label: "How it runs",
      text: "Does it run rough or lose power as well?",
      hint: "A coolant leak into a cylinder or a failing injector makes it run rough; the normal causes don't change how it drives.",
      draft: true,
      chips: [
        { id: "rough", label: "Rough, mainly when cold", effects: { "sm-fuel": 2, "sm-head": 1.4, "sm-egr-cooler": 1.3, "sm-condensation": 0.3, "sm-regen": 0.5 } },
        { id: "power", label: "Loses power", effects: { "sm-rich": 2, "sm-oil": 1.3, "sm-condensation": 0.3, "sm-regen": 0.6 } },
        { id: "normal", label: "Runs normally", effects: { "sm-condensation": 1.5, "sm-regen": 1.5, "sm-fuel": 0.6, "sm-head": 0.7 } }
      ]
    }
  ];

  var smokeKnowledge = [
    {
      id: "skoda-octavia-2-0-tdi",
      label: "Skoda Octavia 2.0 TDI (EA288)",
      matches: function (v) { return v.brandSlug === "skoda" && (v.model || "").toLowerCase() === "octavia" && v.fuel === "diesel"; },
      items: [
        { cause: "sm-egr-cooler", factor: 1.4, note: "Same engine family (2017 VW T6 2.0 TDI): coolant loss, water found in the EGR cooler", source: SOURCES.ea288EgrCoolerCase },
        { cause: "sm-egr-cooler", factor: 1.2, note: "EA288: hairline cracks in the EGR cooler send coolant into the exhaust", source: SOURCES.ea288Trade },
        { cause: "sm-cac", factor: 1.8, note: "The EA288 has a water-cooled charge air cooler, so a leak there is possible", source: SOURCES.ea288Wiki },
        { cause: "sm-oil", factor: 1.1, note: "EA288: oil in the charge air hose with turbo wear", source: SOURCES.ea288Trade }
      ]
    }
  ];

  var smokeSystems = { ecm: { label: "Engine (ECM)", causes: ["sm-fuel", "sm-oil", "sm-rich"] } };

  // ===== No-start path: won't start or cranks slowly =====
  var nostartCauses = [
    { id: "ns-battery", name: "Weak or flat battery", short: "Battery", fuels: COMBUSTION_FUELS,
      check: "Test the battery: voltage at rest, then a load test." },
    { id: "ns-bms", name: "New battery not registered (battery monitor)", short: "Battery registration", fuels: COMBUSTION_FUELS,
      check: "If the battery was replaced, register it with a scan tool so the battery monitor resets." },
    { id: "ns-drain", name: "Battery drained by a module that stays awake", short: "Battery drain", fuels: COMBUSTION_FUELS,
      check: "Measure the current draw once the car has gone to sleep.", checkDraft: true },
    { id: "ns-earth", name: "Poor battery terminal or earth connection", short: "Earth / terminals", fuels: COMBUSTION_FUELS,
      check: "Check the terminals and earth straps, and measure the voltage drop while cranking.", checkDraft: true },
    { id: "ns-starter", name: "Starter motor or solenoid", short: "Starter", fuels: COMBUSTION_FUELS,
      check: "Check that the starter gets its signal while the key or button is held.", checkDraft: true },
    { id: "ns-alternator", name: "Alternator not charging", short: "Alternator", fuels: COMBUSTION_FUELS,
      check: "Measure the charging voltage with the engine running.", checkDraft: true },
    { id: "ns-immo", name: "Immobiliser or key not recognised", short: "Immobiliser / key", fuels: COMBUSTION_FUELS,
      check: "Watch the security light and try the spare key.", checkDraft: true },
    { id: "ns-fuel", name: "No fuel supply (pump or relay)", short: "Fuel supply", fuels: COMBUSTION_FUELS,
      check: "Listen for the fuel pump running when the ignition is switched on.", checkDraft: true },
    { id: "ns-crank", name: "Crankshaft position sensor", short: "Crank sensor", fuels: COMBUSTION_FUELS,
      check: "Watch engine speed in live data while cranking: no reading points to the sensor.", checkDraft: true },
    { id: "ns-ignition", name: "No spark: ignition coil supply or ground", short: "Ignition", fuels: ["petrol", "hybrid"],
      check: "Check for spark, then the ignition coils' power and ground connections.", checkDraft: true }
  ];

  var nostartPriors = {
    "no-start": { "ns-battery": 2, "ns-bms": 0.5, "ns-drain": 1, "ns-earth": 0.8, "ns-starter": 0.8, "ns-alternator": 0.7, "ns-immo": 0.5, "ns-fuel": 0.6, "ns-crank": 0.5, "ns-ignition": 0.5 }
  };

  var nostartQuestions = [
    fuelQuestion,
    {
      id: "ns-crank-q",
      label: "When starting",
      text: "What happens when they try to start it?",
      hint: "The biggest split: no crank or a slow crank points to the battery side; a normal crank that won't fire points to fuel, spark or the immobiliser.",
      draft: true,
      chips: [
        { id: "nothing", label: "Nothing, or just a click", effects: { "ns-battery": 1.8, "ns-earth": 1.8, "ns-starter": 2, "ns-immo": 1.3, "ns-drain": 1.5, "ns-fuel": 0.1, "ns-crank": 0.1, "ns-ignition": 0.1 } },
        { id: "slow", label: "Cranks slowly", effects: { "ns-battery": 2.5, "ns-drain": 1.8, "ns-earth": 1.5, "ns-bms": 1.5, "ns-alternator": 1.5, "ns-starter": 0.6, "ns-immo": 0.2, "ns-fuel": 0.2, "ns-crank": 0.2, "ns-ignition": 0.2 } },
        { id: "normal", label: "Cranks normally but won't fire", effects: { "ns-fuel": 3, "ns-crank": 3, "ns-ignition": 3, "ns-immo": 2, "ns-battery": 0.2, "ns-drain": 0.2, "ns-earth": 0.4, "ns-starter": 0.1, "ns-alternator": 0.3, "ns-bms": 0.2 } }
      ]
    },
    {
      id: "ns-lights",
      label: "Dash lights",
      text: "Do the dashboard lights dim or go out when they try to start it?",
      hint: "Lights that dim mean the voltage collapses under load (battery or connections); bright lights with just a click point to the starter.",
      draft: true,
      applies: function (ctx) { return ctx.answers["ns-crank-q"] !== "normal"; },
      chips: [
        { id: "dim", label: "Dim or go out", effects: { "ns-battery": 2, "ns-earth": 2, "ns-drain": 1.5, "ns-starter": 0.5 } },
        { id: "bright", label: "Stay bright", effects: { "ns-starter": 2.5, "ns-immo": 1.5, "ns-battery": 0.4, "ns-earth": 0.6, "ns-drain": 0.4 } }
      ]
    },
    {
      id: "ns-battery-new",
      label: "Battery replaced",
      text: "Was the battery replaced recently?",
      hint: "On cars with start-stop, a new battery has to be registered, or the battery monitor keeps the old battery's age and settings.",
      chips: [
        { id: "yes", label: "Yes, in the last months", effects: { "ns-bms": 4, "ns-battery": 0.4, "ns-earth": 1.3 } }, // a new battery is less likely the weak part
        { id: "no", label: "No", effects: { "ns-bms": 0.1 } }
      ]
    },
    {
      id: "ns-standing",
      label: "Standing",
      text: "Did it happen after the car stood for a few days?",
      hint: "A battery that goes flat while parked points to something drawing current after switch-off.",
      draft: true,
      chips: [
        { id: "yes", label: "Yes, after standing", effects: { "ns-drain": 3, "ns-battery": 1.5 } },
        { id: "no", label: "No, it's used every day", effects: { "ns-drain": 0.4, "ns-alternator": 1.5 } }
      ]
    },
    {
      id: "ns-startstop",
      label: "Start-stop",
      text: "Had start-stop stopped working before this?",
      hint: "The battery monitor switches start-stop off first when it thinks the battery is weak.",
      chips: [
        { id: "yes", label: "Yes, it stopped working", effects: { "ns-battery": 2, "ns-bms": 2, "ns-alternator": 1.3 } },
        { id: "no", label: "No", effects: { "ns-bms": 0.6, "ns-battery": 0.8 } }
      ]
    },
    {
      id: "ns-warning",
      label: "Warning lights",
      text: "Any warning light before it happened?",
      hint: "A battery light while driving points to charging; a flashing key or security light points to the immobiliser.",
      draft: true,
      chips: [
        { id: "battery", label: "Battery light while driving", effects: { "ns-alternator": 4, "ns-earth": 1.2 } },
        { id: "security", label: "Key or security light flashing", effects: { "ns-immo": 5 } },
        { id: "engine", label: "Engine light", effects: { "ns-crank": 2, "ns-fuel": 1.5, "ns-ignition": 1.5 } },
        { id: "none", label: "No warnings", effects: { "ns-alternator": 0.5, "ns-immo": 0.6 } }
      ]
    },
    {
      id: "ns-cold",
      label: "Temperature",
      text: "Does it happen mainly on cold mornings?",
      hint: "A battery loses cranking power in the cold, so a weak one fails first on cold mornings.",
      draft: true,
      chips: [
        { id: "cold", label: "Yes, mainly when cold", effects: { "ns-battery": 1.8, "ns-starter": 1.2 } },
        { id: "any", label: "Any temperature", effects: { "ns-battery": 0.8 } }
      ]
    }
  ];

  var nostartKnowledge = [
    {
      id: "ford-focus",
      label: "Ford Focus",
      matches: function (v) { return v.brandSlug === "ford" && (v.model || "").toLowerCase() === "focus" && v.fuel === "petrol"; },
      items: [
        { cause: "ns-bms", factor: 1.3, note: "Ford with start-stop: the battery monitor keeps the old battery's age until it's reset with a scan tool", source: SOURCES.fordBms },
        { cause: "ns-ignition", factor: 1.3, note: "Focus 1.0 EcoBoost: cranks but no spark, traced to the ignition coils' ground connection", source: SOURCES.focusNoSpark }
      ]
    }
  ];

  var nostartSystems = {
    ecm: { label: "Engine (ECM)" },
    cem: { label: "Central electronics (CEM)" }
  };

  // ===== Noise path: warning light and a noise from the engine =====
  var noiseCauses = [
    { id: "wl-belt", name: "Timing belt wearing (belt running in oil)", short: "Timing belt", fuels: COMBUSTION_FUELS,
      check: "Check the timing belt's condition as the workshop manual describes, and look for belt debris in the oil.", checkDraft: true },
    { id: "wl-strainer", name: "Oil strainer blocked (low oil pressure)", short: "Oil strainer", fuels: COMBUSTION_FUELS,
      check: "Compare live oil pressure with the reference; if it's low, drop the sump and check the strainer.", checkDraft: true },
    { id: "wl-oil-low", name: "Low oil level", short: "Oil level", fuels: COMBUSTION_FUELS,
      check: "Check the oil level on level ground with the engine off." },
    { id: "wl-sensor", name: "Oil pressure sensor or regulator fault", short: "Pressure sensor", fuels: COMBUSTION_FUELS,
      check: "Compare the sensor's reading with a mechanical gauge.", checkDraft: true },
    { id: "wl-vacuum", name: "Brake vacuum pump failing", short: "Vacuum pump", fuels: COMBUSTION_FUELS,
      check: "Check brake assistance: with the engine running, the pedal should go down under light pressure.", checkDraft: true },
    { id: "wl-turbo", name: "Turbo bearing or wastegate", short: "Turbo", fuels: COMBUSTION_FUELS,
      check: "Check the turbo shaft for play and the intake for oil.", checkDraft: true },
    { id: "wl-aux", name: "Auxiliary belt or tensioner", short: "Auxiliary belt", fuels: COMBUSTION_FUELS,
      check: "Look at the auxiliary belt for cracks and glazing, and the tensioner for wobble.", checkDraft: true },
    { id: "wl-waterpump", name: "Water pump bearing", short: "Water pump", fuels: COMBUSTION_FUELS,
      check: "Check the coolant level and look for leaks around the pump.", checkDraft: true },
    { id: "wl-misfire", name: "Misfire (coil or spark plug)", short: "Misfire", fuels: ["petrol", "hybrid"],
      check: "Read the misfire counters, then swap coils between cylinders to see if it follows.", checkDraft: true }
  ];

  var noisePriors = {
    "light-noise": { "wl-belt": 0.8, "wl-strainer": 0.5, "wl-oil-low": 1.2, "wl-sensor": 0.4, "wl-vacuum": 0.4, "wl-turbo": 0.7, "wl-aux": 1, "wl-waterpump": 0.5, "wl-misfire": 1 }
  };

  var noiseQuestions = [
    fuelQuestion,
    {
      id: "wl-light",
      label: "Which light",
      text: "Which warning light came on?",
      hint: "The light narrows it down the most: oil pressure, engine, brake and charging or temperature lights point to different systems.",
      draft: true,
      chips: [
        { id: "oil", label: "Oil pressure or STOP", effects: { "wl-oil-low": 2, "wl-strainer": 3, "wl-belt": 2, "wl-sensor": 2, "wl-turbo": 0.5, "wl-aux": 0.3, "wl-waterpump": 0.4, "wl-misfire": 0.3 } },
        { id: "engine", label: "Engine or service warning", effects: { "wl-misfire": 2, "wl-turbo": 1.5, "wl-belt": 1.2, "wl-strainer": 1.2, "wl-sensor": 1.2, "wl-aux": 0.6, "wl-vacuum": 0.6 } },
        { id: "brake", label: "Brake warning", effects: { "wl-vacuum": 4, "wl-belt": 1.5, "wl-aux": 0.5, "wl-misfire": 0.3, "wl-waterpump": 0.4 } },
        { id: "charge", label: "Battery or temperature light", effects: { "wl-aux": 3, "wl-waterpump": 3, "wl-belt": 0.5, "wl-strainer": 0.5, "wl-sensor": 0.5, "wl-misfire": 0.4 } }
      ]
    },
    {
      id: "wl-noise",
      label: "Noise",
      text: "What does the noise sound like?",
      hint: "A rattle points to oil starvation or wear, a whine to the turbo or a pump, a squeal to a belt, a knock or shake to a misfire.",
      draft: true,
      chips: [
        { id: "rattle", label: "Rattle or ticking", effects: { "wl-belt": 1.5, "wl-oil-low": 2, "wl-strainer": 1.5, "wl-vacuum": 1.5, "wl-misfire": 0.5, "wl-aux": 0.6 } },
        { id: "whine", label: "Whine or whistle", effects: { "wl-turbo": 3, "wl-waterpump": 1.5, "wl-strainer": 1.3, "wl-aux": 0.8 } },
        { id: "squeal", label: "Squeal or chirp", effects: { "wl-aux": 4, "wl-waterpump": 1.5, "wl-belt": 0.5, "wl-strainer": 0.5, "wl-turbo": 0.5 } },
        { id: "knock", label: "Knock or rough running", effects: { "wl-misfire": 3, "wl-oil-low": 1.5, "wl-aux": 0.5 } }
      ]
    },
    {
      id: "wl-brake",
      label: "Brake pedal",
      text: "Is the brake pedal harder than usual?",
      hint: "A hard pedal means the brake servo is losing vacuum; on belt-in-oil engines, belt debris can block the vacuum pump.",
      chips: [
        { id: "hard", label: "Yes, harder", effects: { "wl-vacuum": 5, "wl-belt": 1.5, "wl-strainer": 1.2 } },
        { id: "normal", label: "No, normal", effects: { "wl-vacuum": 0.2 } }
      ]
    },
    {
      id: "wl-oil-level",
      label: "Oil level",
      text: "Is the oil level low, or does it need topping up?",
      hint: "Low oil alone can light the oil warning and make the engine rattle.",
      chips: [
        { id: "low", label: "Yes, low or dropping", effects: { "wl-oil-low": 4, "wl-belt": 1.2 } },
        { id: "full", label: "No, it's full", effects: { "wl-oil-low": 0.2, "wl-strainer": 1.3, "wl-sensor": 1.3 } }
      ]
    },
    {
      id: "wl-rpm",
      label: "When it warns",
      text: "When does the warning come on?",
      hint: "A partly blocked oil strainer usually shows first at higher revs, when the engine needs the most oil.",
      draft: true,
      applies: function (ctx) { return ctx.answers["wl-light"] !== "charge"; },
      chips: [
        { id: "revs", label: "Above about 3,000 rpm or when accelerating", effects: { "wl-strainer": 2, "wl-sensor": 1.5, "wl-belt": 1.3, "wl-turbo": 1.3 } },
        { id: "idle", label: "At idle, once warm", effects: { "wl-oil-low": 1.5, "wl-strainer": 1.5, "wl-sensor": 1.2 } },
        { id: "always", label: "All the time", effects: { "wl-sensor": 1.5, "wl-misfire": 1.2 } }
      ]
    },
    {
      id: "wl-belt-changed",
      label: "Timing belt",
      text: "Has the timing belt been replaced?",
      hint: "A belt that runs in oil wears faster when the oil is old or the wrong grade; a recent change makes belt wear less likely.",
      draft: true,
      chips: [
        { id: "yes", label: "Yes, recently", effects: { "wl-belt": 0.4, "wl-strainer": 0.7 } },
        { id: "no", label: "Not yet, or don't know", effects: { "wl-belt": 1.5, "wl-strainer": 1.2 } }
      ]
    }
  ];

  var noiseKnowledge = [
    {
      id: "peugeot-308-puretech",
      label: "Peugeot 308 1.2 PureTech",
      matches: function (v) { return v.brandSlug === "peugeot" && (v.model || "").toLowerCase() === "308" && v.fuel === "petrol"; },
      items: [
        { cause: "wl-belt", factor: 2, note: "1.2 PureTech: belt degradation is covered by an extended warranty (10 years / 175,000 km) for engines built April 2014 – June 2022", source: SOURCES.puretechWarranty },
        { cause: "wl-strainer", factor: 2, note: "1.2 PureTech: belt material can damage oil-fed parts (the recall for 2013–2017 builds replaced the oil pump and belt)", source: SOURCES.puretechRecall },
        { cause: "wl-sensor", factor: 1.2, note: "308 1.2 PureTech with P15A8: the oil pressure sensor itself had failed", source: SOURCES.p15a8Case },
        { cause: "wl-vacuum", factor: 1.5, when: function (v) { var y = parseInt(v.year, 10); return y && y <= 2017; },
          note: "The brake vacuum pump recall covers engines built March 2013 – April 2017: check this VIN", source: SOURCES.puretechRecall },
        { cause: "wl-vacuum", factor: 1, when: function (v) { return parseInt(v.year, 10) >= 2018; },
          note: "The brake vacuum pump recall only covers 2013–2017 builds, so not this car; check the pump anyway if the pedal is hard", source: SOURCES.puretechRecall }
      ]
    }
  ];

  var noiseSystems = { ecm: { label: "Engine (ECM)" } };

  // ===== Starting question: the complaint =====
  // Grouped so a long list stays scannable. `path` = scripted in the prototype; chips without one are
  // shown disabled ("Not in this prototype"), to show how broad the real list would be.
  // fuels: complaints that only exist on some engine types (an EV is never asked about rough idle).
  var COMBUSTION = ["diesel", "petrol", "hybrid"];
  var complaintGroups = [
    { label: "Engine and performance", chips: [
      { id: "idle", label: "Rough or shaky idle", path: "engine", fuels: COMBUSTION },
      { id: "power", label: "Loss of power", path: "engine" },
      { id: "both", label: "Rough idle and loss of power", path: "engine", fuels: COMBUSTION },
      { id: "stalls", label: "Stalls or cuts out", fuels: COMBUSTION },
      { id: "consumption", label: "High fuel consumption", fuels: COMBUSTION }
    ] },
    { label: "Warning lights and messages", chips: [
      { id: "adas", label: "Driver assistance warning (lane assist, pre sense, cruise)", path: "adas" },
      { id: "light-noise", label: "Warning light and a noise from the engine", path: "noise", fuels: COMBUSTION },
      { id: "engine-light", label: "Engine warning light only" },
      { id: "battery-light", label: "Battery or charging warning" },
      { id: "brake-light", label: "Brake or ABS warning" }
    ] },
    { label: "Starting", chips: [
      { id: "no-start", label: "Won't start or cranks slowly", path: "nostart", fuels: COMBUSTION }
    ] },
    { label: "Smoke, smells and leaks", chips: [
      { id: "smoke", label: "Smoke from the exhaust", path: "smoke", fuels: COMBUSTION },
      { id: "smell", label: "Burning smell" },
      { id: "leak", label: "Fluid leak" }
    ] },
    { label: "Noise and vibration", chips: [
      { id: "noise-brake", label: "Noise when braking" },
      { id: "vibration", label: "Vibration at speed" },
      { id: "knock", label: "Knocking over bumps" }
    ] }
  ];

  var complaintQuestion = {
    id: "complaint",
    label: "Complaint",
    text: "What does the customer notice?",
    hint: "Sets the starting point: each complaint has its own usual causes.",
    groups: complaintGroups,
    chips: complaintGroups.reduce(function (all, g) { return all.concat(g.chips.filter(function (c) { return c.path; })); }, []),
    noSkip: true
  };

  // scriptedFor: the engine type the questions were researched for; other types get a note that the
  // ranking is incomplete.
  var paths = {
    engine: { id: "engine", usesFuel: true, scriptedFor: ["diesel"], causes: engineCauses, priors: enginePriors, questions: engineQuestions, modelKnowledge: engineKnowledge, systems: engineSystems },
    smoke: { id: "smoke", usesFuel: true, scriptedFor: ["diesel"], causes: smokeCauses, priors: smokePriors, questions: smokeQuestions, modelKnowledge: smokeKnowledge, systems: smokeSystems,
      // The likely causes often set no code: the plan leads with the physical checks, and says so.
      scanNote: "The likely coolant and normal causes usually set no fault code, so a clean scan doesn't rule them out. Do the checks first." },
    noise: { id: "noise", usesFuel: true, scriptedFor: ["petrol"], causes: noiseCauses, priors: noisePriors, questions: noiseQuestions, modelKnowledge: noiseKnowledge, systems: noiseSystems },
    nostart: { id: "nostart", usesFuel: true, scriptedFor: ["petrol"], causes: nostartCauses, priors: nostartPriors, questions: nostartQuestions, modelKnowledge: nostartKnowledge, systems: nostartSystems },
    adas: { id: "adas", usesFuel: false, causes: adasCauses, priors: adasPriors, questions: adasQuestions, modelKnowledge: adasKnowledge, systems: adasSystems }
  };

  // ===== Reading a repair order's complaint text (PLAN.md §4 area 5, "messy input") =====
  // Keyed by Garage vehicle id. The real product would have AI read the free text; the prototype
  // prepares the reading per repair order. Only what the text clearly says becomes an answer, each
  // with the phrase it was read from (shown next to the answer, so it can be checked); the rest is
  // asked as usual. Repair orders without a reading only fill in the vehicle.
  var repairOrderReadings = {
    "volvo-xc60-2014": [
      { question: "complaint", answer: "idle", quote: "intermittent rough idle at startup" },
      { question: "message", answer: "engine", quote: "Check engine light on" }
    ],
    "audi-a6-2020": [
      { question: "complaint", answer: "adas", quote: "Lane assist and Pre Sense warnings on the dashboard" },
      { question: "work", answer: "windscreen", quote: "Windscreen replaced 12 days ago" },
      { question: "warnings", answer: "several", quote: "“Lane assist: unavailable” and “Audi pre sense: malfunction”" }
    ],
    "peugeot-308-2021": [
      { question: "complaint", answer: "light-noise", quote: "Oil pressure warning and a rattle from the engine" },
      { question: "wl-light", answer: "oil", quote: "Oil pressure warning" },
      { question: "wl-noise", answer: "rattle", quote: "a rattle from the engine" },
      { question: "wl-rpm", answer: "revs", quote: "oil warning comes on above about 3,000 rpm" },
      { question: "wl-oil-level", answer: "full", quote: "oil level looks full" },
      { question: "wl-belt-changed", answer: "no", quote: "Timing belt not replaced yet" }
    ]
  };

  return {
    complaint: complaintQuestion,
    paths: paths,
    repairOrderReadings: repairOrderReadings
  };
})();
