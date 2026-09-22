"""
models/engineering_knowledge.py — Multidisciplinary Sovereign Engineering Knowledge Repository
Authoritative engineering science, mathematical formulations, and standards across:
- Electrical Engineering & Motors (IEEE, IEC 60034, NEMA)
- Solid Mechanics & Structural Design (AISC 360, ACI 318, Eurocode 3)
- Power Generation & Thermodynamics (Rankine, Brayton, ASME Section I, ASME B31.1)
- HVAC, Refrigeration & Heat Rejection (ASHRAE, CTI)
- Fluid Mechanics & Hydraulics (Darcy-Weisbach, Reynolds, Bernoulli)
- Rotating Machinery & Dynamics (API 610, API 617, ISO 10816)
- Piping, Pressure Vessels & Flanges (ASME B31.3, ASME B16.5, ASME Section VIII)
- Process Control & Automation (PID Tuning, ISA-75)
- Water Treatment & Membrane Desalination (Reverse Osmosis, AWWA)
- Applied Mathematics & Computational Science (Python, Numerical Methods)
"""

CURATED_TOPICS = {
    # ══════════════════════════════════════════════════════════════════════════
    # 1. ELECTRICAL ENGINEERING & ELECTRIC MOTORS (IEC / IEEE / NEMA)
    # ══════════════════════════════════════════════════════════════════════════
    'induction_motor_slip': {
        'title': '3-Phase Induction Motors: Operating Principles, Synchronous Speed & Slip',
        'domain': 'electrical_motor',
        'standard': 'IEC 60034 / NEMA MG 1 / IEEE 112',
        'keywords': ['induction motor', '3-phase motor', 'three phase motor', 'motor slip', 'synchronous speed', 'rotor speed', 'slip frequency', 'stator winding', 'squirrel cage'],
        'content': r"""### 3-Phase Induction Motors: Principles, Synchronous Speed & Slip

#### 1. Operating Principle
A 3-phase induction (asynchronous) motor operates on Faraday's law of electromagnetic induction and Lorentz force. When balanced 3-phase alternating currents flow through the stator windings, they establish a rotating magnetic field (RMF) of constant magnitude that revolves around the stator bore at synchronous speed ($n_s$).

This rotating flux cuts the stationary conductors of the rotor (typically a squirrel-cage or wound rotor), inducing alternating electromotive forces (EMF) and currents in them. The interaction between the rotor currents and the stator's rotating magnetic field produces electromagnetic torque that accelerates the rotor in the direction of the rotating field (Lenz's Law).

#### 2. Synchronous Speed Formula
The synchronous speed ($n_s$) of the stator's rotating magnetic field is strictly dictated by the electrical supply frequency ($f$) and the number of magnetic poles ($P$):

$$n_s = \frac{120 \times f}{P}$$

- For a 50 Hz grid:
  - 2 Poles: $n_s = 3000\text{ RPM}$
  - 4 Poles: $n_s = 1500\text{ RPM}$
  - 6 Poles: $n_s = 1000\text{ RPM}$
- For a 60 Hz grid:
  - 2 Poles: $n_s = 3600\text{ RPM}$
  - 4 Poles: $n_s = 1800\text{ RPM}$
  - 6 Poles: $n_s = 1200\text{ RPM}$

#### 3. Definition & Mathematical Expression of Slip ($s$)
The rotor can **never** catch up with the synchronous speed in motor mode. If $n = n_s$, the relative velocity between the rotating flux and the rotor conductors becomes zero; no flux is cut, no rotor EMF is induced, rotor current falls to zero, and all driving torque vanishes.

The relative difference between synchronous speed and actual mechanical rotor speed ($n$) is defined as **Slip ($s$)**:

$$s = \frac{n_s - n}{n_s}$$

Or as a percentage:
$$\%\text{Slip} = \left(\frac{n_s - n}{n_s}\right) \times 100\%$$

From this relationship, the operating shaft speed is:
$$n = n_s \times (1 - s)$$

#### 4. Operating Regimes as a Function of Slip
- **Motor Mode ($0 < s < 1$):** Mechanical speed is below synchronous speed ($0 \le n < n_s$). Electrical power flows from the grid to mechanical shaft power. Typical full-load slip for modern industrial squirrel-cage motors is between **1.0% and 4.0%** (0.01 to 0.04).
- **Generator Mode ($s < 0$):** Driven by an external prime mover (e.g., wind turbine or steam turbine) above synchronous speed ($n > n_s$). Torque reverses, and mechanical energy is delivered back to the electrical grid as active electrical power.
- **Plugging / Counter-Current Braking Mode ($s > 1$):** Occurs when two stator phases are swapped while the rotor is running forward, or when an overhauling load drives the shaft in the opposite direction of the rotating field ($n < 0$). Severe electrical braking with massive internal rotor heat dissipation.

#### 5. Rotor Electrical Frequency & Power Flow
- **Rotor Frequency ($f_r$):**
  $$f_r = s \times f$$
  At standstill (locked rotor, $s=1$), $f_r = f$. At rated load ($s \approx 0.03$), $f_r \approx 1.5\text{ Hz}$, which keeps rotor core iron losses negligible.
- **Air-Gap Power Division:**
  - Total power transferred across the air gap: $P_{ag}$
  - Rotor copper loss (joule heating): $P_{rcl} = s \times P_{ag}$
  - Developed mechanical internal power: $P_{mech} = (1 - s) \times P_{ag}$
  - Rotor efficiency: $\eta_{rotor} = 1 - s$

#### 6. Industrial Sizing & Governing Standards
- **Efficiency Classes (IEC 60034-30-1):** IE1 (Standard), IE2 (High Efficiency), IE3 (Premium Efficiency), and IE4 (Super Premium Efficiency). Modern greenfield industrial facilities mandate IE3 or IE4 minimums.
- **NEMA Designs (NEMA MG 1):** Design B (normal starting torque, low starting current, slip < 5%), Design C (high starting torque for conveyors and crushers), Design D (high slip 5–13% for high-inertia cyclic punch presses)."""
    },

    'synchronous_vs_induction_motor': {
        'title': 'Comparative Analysis: Synchronous Motors vs Asynchronous (Induction) Motors',
        'domain': 'electrical_motor',
        'standard': 'IEEE 115 / IEC 60034 / NEMA MG 1',
        'keywords': ['synchronous vs induction', 'synchronous motor', 'induction vs synchronous', 'asynchronous motor', 'compare motors'],
        'content': r"""### Comparative Analysis: Synchronous Motors vs Asynchronous (Induction) Motors

#### 1. Core Operating Principles & Speed Regulation
- **Synchronous Motor:** Operates at strictly constant speed ($n = n_s = 120 f / P$) from no-load up to pull-out torque. The rotor magnetic poles lock in synchronism with the stator's rotating magnetic field. There is **zero slip ($s = 0$)** in steady state.
- **Induction (Asynchronous) Motor:** Relies on relative speed between rotor conductors and the rotating magnetic field to induce rotor currents. It always operates with positive slip ($n < n_s$). Speed drops slightly as mechanical load increases (speed regulation of 1% to 4%).

#### 2. Rotor Construction & Excitation
- **Synchronous Motor:** Requires a separate DC excitation source (brushless exciter or slip rings with external DC power) to establish fixed magnetic poles, or utilizes high-coercivity rare-earth permanent magnets (PMSM).
- **Induction Motor:** Fully self-excited via electromagnetic induction across the air gap. The squirrel-cage rotor consists of short-circuited aluminum or copper bars cast into laminated steel sheets, requiring zero external excitation, slip rings, or commutators.

#### 3. Power Factor Control & Grid Compensation
- **Synchronous Motors:** Can operate across **lagging, unity, and leading power factor** simply by varying the DC field excitation current. An over-excited synchronous motor draws leading current from the grid, functioning as a "Synchronous Condenser" to correct overall plant power factor and eliminate grid reactive power penalties.
- **Induction Motors:** Always operate at a **lagging power factor** (typically 0.80 to 0.88 at full load, dropping below 0.30 at no-load) because the stator must draw reactive magnetizing current from the AC grid to create the air-gap flux.

#### 4. Starting Capability & Transients
- **Induction Motors:** Inherently self-starting. When energized from a 3-phase supply, the stationary rotor experiences maximum flux cutting, producing strong breakaway torque directly.
- **Synchronous Motors:** Not inherently self-starting from a direct-on-line (DOL) fixed-frequency source because the rotor cannot accelerate from 0 to 1500/3000 RPM in a fraction of a cycle. They incorporate squirrel-cage amortisseur (damper) windings to start as an induction motor before pulling into synchronism, or utilize Variable Frequency Drives (VFDs) for soft ramping.

#### 5. Capital Cost, Maintenance & Industrial Applications
- **Induction Motors (The Universal Workhorse):** Account for over 85% of industrial drives worldwide. They feature low initial capital expenditure, rugged construction, zero brushes, high reliability, and minimal maintenance across pumps, fans, compressors, conveyors, and machine tools.
- **Synchronous Motors:** Higher capital cost and complex excitation controls, but deliver higher electrical efficiency (> 96–98%) in very large continuous ratings (> 1 MW to 50 MW) such as utility gas pipeline compressors, large reciprocating compressors, mine hoists, and cement ball mills."""
    },

    'transformers_power_factor': {
        'title': 'Industrial Power Distribution: Transformers, Reactive Power & Power Factor Correction',
        'domain': 'electrical_power',
        'standard': 'IEEE 141 (Red Book) / IEC 60076 / NFPA 70 (NEC)',
        'keywords': ['transformer', 'power factor', 'power factor correction', 'kvar', 'apparent power', 'reactive power', 'transformer losses', 'capacitor bank'],
        'content': r"""### Industrial Power Distribution: Transformers, Reactive Power & Power Factor Correction

#### 1. Transformer Operation & Turns Ratio
An industrial power transformer transfers AC electrical energy between voltage levels via mutual electromagnetic induction without changing frequency.
- **Turns Ratio:**
  $$\frac{V_p}{V_s} = \frac{N_p}{N_s} = \frac{I_s}{I_p} = a$$
  Where $N_p, N_s$ are primary/secondary turns, $V$ is voltage, and $I$ is current.
- **Total Losses:**
  - *No-Load / Core (Iron) Losses ($P_{core}$):* Hysteresis and eddy currents in the laminated silicon steel core. Constant as long as voltage and frequency remain nominal.
  - *Load / Copper Losses ($P_{cu}$):* Joule heating in primary and secondary windings ($I^2 R$). Proportional to the square of the operating load fraction.

#### 2. The Power Triangle (P, Q, S)
AC industrial networks distribute complex electrical power:
- **Active / Real Power ($P$, in kW or MW):** True useful work performed (mechanical torque, heating, lighting):
  $$P = \sqrt{3} \times V_{L} \times I_{L} \times \cos\phi$$
- **Reactive Power ($Q$, in kVAR or MVAR):** Magnetizing energy exchanged back and forth to sustain magnetic fields in inductive loads (motors, transformers, ballasts):
  $$Q = \sqrt{3} \times V_{L} \times I_{L} \times \sin\phi$$
- **Apparent Power ($S$, in kVA or MVA):** Total vector sum supplied by generators, cables, and transformers:
  $$S = \sqrt{P^2 + Q^2} = \sqrt{3} \times V_{L} \times I_{L}$$
- **Power Factor (PF):**
  $$\text{PF} = \cos\phi = \frac{P}{S} = \frac{\text{kW}}{\text{kVA}}$$

#### 3. Consequences of Poor Power Factor (< 0.85 Lagging)
- Higher line currents for identical mechanical work, causing excessive $I^2 R$ heating in cables, switchgear, and transformers.
- Higher voltage drops across distribution feeders (poor voltage regulation).
- Reduced available transformer loading capacity (kVA capacity is consumed by useless magnetizing VARs).
- Severe monetary penalties imposed by electric utilities on maximum kVA demand and low power factor.

#### 4. Sizing Shunt Capacitor Banks for Power Factor Correction
To elevate plant power factor from an uncorrected value ($\cos\phi_1$) to a target value ($\cos\phi_2$, typically 0.95 to 0.98):

$$Q_c = P \times (\tan\phi_1 - \tan\phi_2)$$

Where:
$$\tan\phi = \frac{\sqrt{1 - \cos^2\phi}}{\cos\phi}$$

*Example:* A facility drawing $1000\text{ kW}$ at $0.75\text{ PF}$ ($\phi_1 = 41.4^\circ$, $\tan\phi_1 = 0.882$) upgraded to $0.96\text{ PF}$ ($\phi_2 = 16.3^\circ$, $\tan\phi_2 = 0.292$) requires:
$$Q_c = 1000 \times (0.882 - 0.292) = 590\text{ kVAR}$$
This reduces apparent power demand from $1333\text{ kVA}$ down to $1042\text{ kVA}$, releasing $291\text{ kVA}$ of feeder capacity."""
    },

    # ══════════════════════════════════════════════════════════════════════════
    # 2. SOLID MECHANICS & STRUCTURAL ENGINEERING (AISC / ACI / EUROCODE)
    # ══════════════════════════════════════════════════════════════════════════
    'cantilever_beam_deflection': {
        'title': 'Cantilever Beam Analysis: Deflection, Bending Stress & Euler-Bernoulli Theory',
        'domain': 'structural_beam',
        'standard': 'AISC 360 / Eurocode 3 (EN 1993) / Roark’s Formulas',
        'keywords': ['cantilever beam', 'beam deflection', 'cantilever deflection', 'point load deflection', 'euler bernoulli', 'bending moment cantilever', 'moment of inertia'],
        'content': r"""### Cantilever Beam Analysis: Deflection, Bending Stress & Euler-Bernoulli Theory

#### 1. Theoretical Foundation (Euler-Bernoulli Beam Theory)
The governing differential equation for elastic flexure in a slender prismatic beam where plane sections remain plane and normal to the longitudinal axis is:

$$E I \frac{d^2 v}{dx^2} = M(x)$$

Where:
- $E$ = Modulus of Elasticity (Young's Modulus, e.g., $200\text{ GPa}$ for structural carbon steel)
- $I$ = Area Moment of Inertia of the cross-section about the neutral axis ($\text{m}^4$ or $\text{in}^4$)
- $E I$ = Flexural Rigidity
- $M(x)$ = Internal bending moment as a function of position $x$
- $v(x)$ = Lateral deflection curve

#### 2. Case 1: Cantilever with Concentrated End Point Load ($P$)
For a cantilever of span $L$ fixed at $x = 0$ (built-in root) and free at $x = L$ with a downward point load $P$:
- **Bending Moment Distribution:**
  $$M(x) = -P (L - x)$$
  Maximum bending moment occurs at the fixed root ($x = 0$):
  $$M_{max} = P L$$
- **Slope Equation ($\theta = dv/dx$):**
  $$\theta(x) = -\frac{P}{2 E I} (2 L x - x^2)$$
  Maximum slope at the free tip ($x = L$):
  $$\theta_{max} = \frac{P L^2}{2 E I}$$
- **Deflection Equation ($v(x)$):**
  $$v(x) = -\frac{P x^2}{6 E I} (3 L - x)$$
  Maximum deflection at the free tip ($x = L$):
  $$\delta_{max} = \frac{P L^3}{3 E I}$$

#### 3. Case 2: Cantilever with Uniformly Distributed Load ($w$)
For a cantilever carrying a uniform distributed load $w$ (force per unit length, e.g., self-weight or snow load):
- **Maximum Bending Moment at Root ($x=0$):**
  $$M_{max} = \frac{w L^2}{2}$$
- **Maximum Deflection at Free Tip ($x=L$):**
  $$\delta_{max} = \frac{w L^4}{8 E I}$$
- **Maximum Slope at Tip:**
  $$\theta_{max} = \frac{w L^3}{6 E I}$$

#### 4. Flexural Bending Stress & Section Modulus
The normal bending stress $\sigma$ at distance $y$ from the neutral axis is given by the Navier-Bernoulli flexure formula:

$$\sigma = \frac{M y}{I} = \frac{M}{S}$$

Where $S = I / y_{max}$ is the elastic Section Modulus of the cross-section.
- For a solid rectangular beam of width $b$ and height $h$:
  $$I = \frac{b h^3}{12}, \quad S = \frac{b h^2}{6}$$
- For a standard structural wide-flange I-beam (e.g., W-shape or HEB profile): Section properties $I_x, S_x$ are taken from structural steel handbook tables.
- **Safety Criterion:**
  $$\sigma_{max} = \frac{M_{max}}{S} \le \frac{F_y}{\Omega} \quad (\text{or } \phi F_y)$$
  Where $F_y$ is yield strength (e.g., $250\text{ MPa}$ for ASTM A36 / S275, $345\text{ MPa}$ for ASTM A572 / S355).

#### 5. Serviceability Deflection Limits
Structural codes impose stringent deflection criteria to prevent cracking of supported finishes, excessive vibration, and human discomfort:
- For general cantilever structures under live load: $\delta_{max} \le L / 180$ to $L / 250$
- For cantilevers supporting sensitive equipment or masonry facades: $\delta_{max} \le L / 300$ to $L / 400$"""
    },

    'simply_supported_beam': {
        'title': 'Simply Supported Beams: Shear Force, Bending Moments & Maximum Deflection',
        'domain': 'structural_beam',
        'standard': 'AISC 360 / Eurocode 3 / ASCE 7',
        'keywords': ['simply supported beam', 'midspan deflection', 'simply supported', 'sfd bmd', 'bending moment simply supported', 'shear force diagram'],
        'content': r"""### Simply Supported Beams: Shear Force, Bending Moments & Deflection

#### 1. Boundary Conditions & Equilibrium
A simply supported beam rests on a pin support at one end (resisting vertical and horizontal displacements: $R_{x1}, R_{y1}$) and a roller support at the other end (resisting only vertical displacement: $R_{y2}$). This represents a statically determinate structure.

#### 2. Central Concentrated Point Load ($P$ at $x = L/2$)
- **Support Reactions:**
  $$R_1 = R_2 = \frac{P}{2}$$
- **Shear Force Diagram (SFD):**
  - From $x = 0$ to $L/2$: $V(x) = +P/2$
  - From $x = L/2$ to $L$: $V(x) = -P/2$
  - Shear steps abruptly by $-P$ across the point of load application.
- **Bending Moment Diagram (BMD):**
  - Moment is zero at both end supports: $M(0) = M(L) = 0$.
  - Maximum bending moment occurs at midspan ($x = L/2$):
    $$M_{max} = \frac{P L}{4}$$
- **Maximum Midspan Deflection:**
  $$\delta_{max} = \frac{P L^3}{48 E I}$$

#### 3. Uniformly Distributed Load ($w$ across full span $L$)
- **Support Reactions:**
  $$R_1 = R_2 = \frac{w L}{2}$$
- **Shear Force:**
  $$V(x) = \frac{w L}{2} - w x$$
  Shear is maximum at supports ($V_{max} = \pm w L / 2$) and passes through zero at midspan ($x = L/2$).
- **Bending Moment (Parabolic):**
  $$M(x) = \frac{w L x}{2} - \frac{w x^2}{2} = \frac{w x}{2}(L - x)$$
  Maximum bending moment occurs at zero shear ($x = L/2$):
  $$M_{max} = \frac{w L^2}{8}$$
- **Maximum Midspan Deflection:**
  $$\delta_{max} = \frac{5 w L^4}{384 E I}$$

#### 4. Practical Design Check (AISC 360)
1. **Flexural Strength:** $M_u \le \phi_b M_n$ where $M_n = F_y Z_x$ for compact sections with full lateral support ($Z_x$ is plastic section modulus).
2. **Shear Strength:** $V_u \le \phi_v V_n = \phi_v (0.6 F_y A_w)$.
3. **Deflection Serviceability:** $\delta_{LL} \le L / 360$, $\delta_{Total} \le L / 240$."""
    },

    # ══════════════════════════════════════════════════════════════════════════
    # 3. POWER GENERATION & THERMODYNAMICS (ASME B31.1 / ASME SECTION I)
    # ══════════════════════════════════════════════════════════════════════════
    'rankine_cycle_power': {
        'title': 'Thermal Power Generation: The Rankine Cycle, Superheat & Reheat Efficiency',
        'domain': 'thermo_power_cycle',
        'standard': 'ASME Section I / ASME B31.1 (Power Piping) / ASME PTC 6',
        'keywords': ['rankine cycle', 'steam turbine', 'thermal power plant', 'power cycle', 'rankine efficiency', 'steam cycle', 'boiler efficiency', 'heat rate'],
        'content': r"""### Thermal Power Generation: The Rankine Cycle & Efficiency Optimization

#### 1. The Ideal Rankine Cycle Thermodynamic Stages
The Rankine cycle is the universal vapor power cycle for commercial steam electric generating stations (coal, natural gas, biomass, and nuclear reactors). It comprises four steady-flow component processes:

1. **State 1 $\rightarrow$ 2: Isentropic Compression in Boiler Feedwater Pump (BFP):**
   Subcooled liquid water from the condenser hotwell is pressurized from condenser vacuum pressure ($P_1$) up to boiler drum/operating pressure ($P_2$):
   $$w_{pump, in} = h_2 - h_1 = v_1 (P_2 - P_1)$$
2. **State 2 $\rightarrow$ 3: Isobaric Heat Addition in Boiler / Superheater:**
   Water is heated to saturation, evaporated in boiler evaporator tubes, and superheated in convective superheater bundles:
   $$q_{in} = h_3 - h_2$$
3. **State 3 $\rightarrow$ 4: Isentropic Expansion in Steam Turbine:**
   High-pressure, high-temperature superheated steam expands through multi-stage impulse/reaction blades, producing mechanical shaft power:
   $$w_{turb, out} = h_3 - h_4$$
4. **State 4 $\rightarrow$ 1: Isobaric Heat Rejection in Surface Condenser:**
   Exhaust wet steam is condensed back to saturated liquid via cooling water in shell-and-tube surface condensers:
   $$q_{out} = h_4 - h_1$$

#### 2. Thermal Efficiency ($\eta_{th}$) & Heat Rate (HR)
- **Cycle Thermal Efficiency:**
  $$\eta_{th} = \frac{w_{net}}{q_{in}} = \frac{w_{turb, out} - w_{pump, in}}{q_{in}} = \frac{(h_3 - h_4) - (h_2 - h_1)}{h_3 - h_2}$$
- **Net Heat Rate (HR):** Amount of thermal energy input (Btu or kJ) required to produce 1 kWh of net electrical energy:
  $$\text{Heat Rate} = \frac{3600}{\eta_{net}} \quad [\text{kJ/kWh}] = \frac{3412}{\eta_{net}} \quad [\text{Btu/kWh}]$$
  A lower heat rate denotes superior plant thermodynamic efficiency.

#### 3. Methods to Maximize Rankine Cycle Efficiency
- **Lowering Condenser Pressure ($P_1$):** Operating the surface condenser under deep vacuum (typically 0.05 to 0.08 bar absolute) expands the turbine enthalpy drop ($h_3 - h_4$). Limited by cooling water ambient temperature.
- **Superheating Steam to Elevated Temperatures:** Prevents blade droplet erosion by ensuring turbine exhaust vapor quality $x_4 > 88–90\%$ while elevating the average temperature of heat addition.
- **Steam Reheat Cycle:** Steam expanding through the High-Pressure (HP) turbine is extracted at intermediate pressure and returned to the boiler reheater coils, heated back to main steam temperature ($540–565^\circ\text{C}$), and routed to the Intermediate-Pressure (IP) turbine. Increases cycle efficiency by 4% to 6%.
- **Regenerative Feedwater Heating:** Bleeding extraction steam from intermediate turbine stages to preheat feedwater in Closed/Open Feedwater Heaters (FWH) and deaerators prior to boiler entry, driving efficiency toward Carnot limits."""
    },

    # ══════════════════════════════════════════════════════════════════════════
    # 4. HVAC, COOLING TOWERS & PSYCHROMETRICS (ASHRAE / CTI)
    # ══════════════════════════════════════════════════════════════════════════
    'cooling_tower_performance': {
        'title': 'Industrial Cooling Towers: Evaporative Heat Rejection, Approach & Range',
        'domain': 'hvac_cooling',
        'standard': 'CTI STD-201 / ASHRAE Handbook — HVAC Systems and Equipment',
        'keywords': ['cooling tower', 'approach temperature', 'cooling tower range', 'wet bulb approach', 'evaporative cooling', 'cycles of concentration', 'cooling tower efficiency'],
        'content': r"""### Industrial Cooling Towers: Heat Rejection, Approach & Range

#### 1. Fundamentals of Evaporative Cooling
An industrial cooling tower rejects low-grade waste heat from industrial chillers, condensers, and plant machinery directly into the atmosphere. The cooling mechanism relies predominantly on **latent heat of vaporization**: approximately 1% of the circulating water mass evaporates, absorbing approximately $2450\text{ kJ}$ per kilogram of evaporated water, cooling the remaining 99% of circulating water.

#### 2. Key Thermodynamic Parameters
1. **Hot Water Temperature ($T_{hwi}$):** Temperature of warm cooling water returning from industrial plant exchangers into the top distribution basin.
2. **Cold Water Temperature ($T_{cwo}$):** Temperature of cooled water collected in the cold water basin at the base of the tower and returned to the plant.
3. **Ambient Wet-Bulb Temperature ($T_{wb}$):** The theoretical thermodynamic temperature of air saturated adiabatically with water vapor. It represents the absolute physical lower limit to which water can be cooled by evaporative contact.

#### 3. Range, Approach & Cooling Effectiveness Formulas
- **Cooling Range (Delta T across water):**
  $$\text{Range} = T_{hwi} - T_{cwo}$$
  Reflects the plant heat load ($Q = \dot{m} c_p \times \text{Range}$). Typical industrial design range is **$5^\circ\text{C}$ to $12^\circ\text{C}$** ($10^\circ\text{F}$ to $22^\circ\text{F}$).
- **Approach Temperature:**
  $$\text{Approach} = T_{cwo} - T_{wb}$$
  Measures cooling tower thermal sizing and effectiveness. Standard economic design approach is **$3^\circ\text{C}$ to $6^\circ\text{C}$** ($5^\circ\text{F}$ to $10^\circ\text{F}$). Achieving an approach below $3^\circ\text{C}$ requires an exponentially larger tower footprint and fan power.
- **Cooling Tower Thermal Effectiveness ($\eta_{ct}$):**
  $$\eta_{ct} = \frac{\text{Range}}{\text{Range} + \text{Approach}} = \frac{T_{hwi} - T_{cwo}}{T_{hwi} - T_{wb}} \times 100\%$$

#### 4. Water Balance & Cycles of Concentration (CoC)
As pure water vapor evaporates, non-volatile dissolved minerals (calcium, magnesium, chlorides, sulfates) remain behind, concentrating in the circulating water:
- **Cycles of Concentration (CoC):**
  $$\text{CoC} = \frac{\text{Chloride}_{tower}}{\text{Chloride}_{makeup}} = \frac{\text{Conductivity}_{tower}}{\text{Conductivity}_{makeup}}$$
  Target CoC is typically **4.0 to 6.0** to optimize water conservation while preventing mineral scale formation (calcium carbonate precipitation).
- **Evaporation Loss ($E$):**
  $$E = 0.00085 \times \text{Circulation Rate} \times \text{Range } (^\circ\text{F})$$
- **Blowdown Requirement ($B$):** Purging concentrated mineral-rich water to maintain target CoC:
  $$B = \frac{E}{\text{CoC} - 1}$$
- **Make-up Water Demand ($M$):** $M = E + B + \text{Drift Loss}$."""
    },

    # ══════════════════════════════════════════════════════════════════════════
    # 5. FLUID MECHANICS & HYDRAULICS (DARCY-WEISBACH / REYNOLDS)
    # ══════════════════════════════════════════════════════════════════════════
    'reynolds_number_hydraulics': {
        'title': 'Fluid Mechanics: Reynolds Number, Laminar vs Turbulent Flow & Darcy Friction',
        'domain': 'fluid_mechanics',
        'standard': 'Hydraulic Institute (HI) / Crane Technical Paper 410 / ASME MFC',
        'keywords': ['reynolds number', 'laminar vs turbulent', 'laminar flow', 'turbulent flow', 'darcy weisbach', 'pipe friction factor', 'friction factor', 'head loss'],
        'content': r"""### Fluid Mechanics: Reynolds Number, Flow Regimes & Darcy Friction

#### 1. Physical Definition of Reynolds Number ($Re$)
The Reynolds number is a dimensionless quantity that characterizes fluid flow by quantifying the ratio of inertial forces to viscous forces within the fluid stream:

$$Re = \frac{\text{Inertial Forces}}{\text{Viscous Forces}} = \frac{\rho v D}{\mu} = \frac{v D}{\nu}$$

Where:
- $\rho$ = Fluid density ($\text{kg/m}^3$)
- $v$ = Mean fluid flow velocity ($v = Q / A$, $\text{m/s}$)
- $D$ = Inside pipe hydraulic diameter ($\text{m}$)
- $\mu$ = Dynamic viscosity ($\text{Pa}\cdot\text{s}$ or $\text{N}\cdot\text{s/m}^2$)
- $\nu = \mu / \rho$ = Kinematic viscosity ($\text{m}^2\text{/s}$ or cSt)

#### 2. Flow Regimes in Enclosed Circular Conduits
- **Laminar Flow ($Re < 2,300$):** Viscous forces dominate. Fluid moves in smooth, parallel concentric layers (streamlines) with zero radial macroscopic mixing. Velocity profile across the pipe diameter is parabolic, where center-line velocity is exactly twice mean velocity ($v_{max} = 2 v$).
- **Critical / Transition Zone ($2,300 \le Re \le 4,000$):** Flow is unpredictable and oscillates between laminar and turbulent regimes. Small pipe vibrations or upstream fittings can trigger sudden turbulence bursts.
- **Turbulent Flow ($Re > 4,000$):** Inertial forces dominate. Characterized by chaotic eddy currents, rapid transverse momentum exchange, and a blunt, uniform velocity profile across the core. In industrial process plants, over 95% of fluid flows operate in fully turbulent conditions ($Re > 10^4$ to $10^6$).

#### 3. Darcy Friction Factor ($f_D$)
- **For Laminar Flow:** Independent of internal pipe surface roughness:
  $$f = \frac{64}{Re} \quad (\text{Hagen-Poiseuille formula})$$
- **For Turbulent Flow:** Governed by the implicit Colebrook-White equation or calculated directly using the explicit **Swamee-Jain approximation** (valid for $\varepsilon/D \in [10^{-6}, 10^{-2}]$ and $Re \in [5000, 10^8]$):
  $$f = \frac{0.25}{\left[\log_{10}\left(\frac{\varepsilon / D}{3.7} + \frac{5.74}{Re^{0.9}}\right)\right]^2}$$
  Where $\varepsilon$ is internal pipe absolute roughness (e.g., $0.045\text{ mm}$ for commercial carbon steel, $0.015\text{ mm}$ for drawn stainless steel).

#### 4. Darcy-Weisbach Pressure Drop & Head Loss
The head loss ($h_f$, meters of fluid column) due to pipe wall friction is:

$$h_f = f \times \frac{L}{D} \times \frac{v^2}{2 g}$$

Converting to differential pressure drop ($\Delta P$, Pa):
$$\Delta P = \rho g h_f = f \times \frac{L}{D} \times \frac{\rho v^2}{2}$$

*Key Engineering Insight:* Pressure drop escalates with the square of velocity ($v^2$) and inversely with the fifth power of pipe inside diameter ($D^5$ for a fixed volumetric flow rate $Q$). A 20% reduction in pipe diameter nearly triples friction head loss."""
    },

    # ══════════════════════════════════════════════════════════════════════════
    # 6. PROCESS CONTROL & AUTOMATION (ISA / IEC 61131)
    # ══════════════════════════════════════════════════════════════════════════
    'pid_controller_tuning': {
        'title': 'Process Control & Automation: PID Controller Fundamentals & Tuning Methods',
        'domain': 'process_control',
        'standard': 'ISA-5.1 / IEC 61131-3 / ANSI/ISA-75',
        'keywords': ['pid controller', 'pid tuning', 'ziegler nichols', 'proportional integral derivative', 'controller tuning', 'closed loop control', 'reset time', 'rate time'],
        'content': r"""### Process Control & Automation: PID Controller Fundamentals & Tuning

#### 1. The Ideal Parallel PID Control Algorithm
The Proportional-Integral-Derivative (PID) controller calculates an error value $e(t) = SP(t) - PV(t)$ as the difference between a desired Setpoint (SP) and a measured Process Variable (PV). The control output $u(t)$ sent to the final control element (e.g., control valve) is:

$$u(t) = K_p e(t) + K_i \int_0^t e(\tau) d\tau + K_d \frac{de(t)}{dt}$$

Or in standard ISA dependent format:
$$u(t) = K_p \left[ e(t) + \frac{1}{T_i} \int_0^t e(\tau) d\tau + T_d \frac{de(t)}{dt} \right]$$

Where:
- $K_p$ = Proportional Controller Gain ($PB\% = 100 / K_p$)
- $T_i$ = Integral / Reset Time (minutes or seconds per repeat)
- $T_d$ = Derivative / Rate Time (minutes or seconds)

#### 2. Individual Term Functions & Operational Trade-offs
- **Proportional Action ($P$):** Generates corrective output directly proportional to current instantaneous error. High gain accelerates response speed, but excessive gain induces continuous limit-cycle oscillations. **P-only control always produces a steady-state offset (droop).**
- **Integral Action ($I$):** Eliminates steady-state offset by continuously accumulating error over time until $e(t) = 0$. However, integral action introduces phase lag ($-90^\circ$), reduces loop phase margin, and risks **integrator windup** during actuator saturation.
- **Derivative Action ($D$):** Acts on the slope (rate of change) of the error to provide anticipatory damping before error grows. Improves loop stability and settling time in slow thermal/chemical systems. Highly sensitive to high-frequency sensor noise; always paired with a low-pass derivative filter.

#### 3. Ziegler-Nichols Closed-Loop Tuning Protocol
1. Disable Integral ($T_i = \infty$) and Derivative ($T_d = 0$) actions.
2. With the control loop in Automatic closed-loop mode, incrementally increase Proportional Gain $K_p$ while introducing small setpoint step perturbations.
3. Identify the **Ultimate Gain ($K_u$)** where the process variable displays continuous, sustained, un-damped sinusoidal oscillations.
4. Record the corresponding **Ultimate Period of Oscillation ($T_u$)** in seconds or minutes.
5. Compute controller tuning parameters per classical Ziegler-Nichols rules:
   - **P Controller:** $K_p = 0.50 K_u$
   - **PI Controller:** $K_p = 0.45 K_u, \quad T_i = T_u / 1.2$
   - **Full PID Controller:** $K_p = 0.60 K_u, \quad T_i = 0.50 T_u, \quad T_d = 0.125 T_u$

#### 4. Anti-Windup & Practical Field Implementation
- **Anti-Reset Windup:** Clamps the internal integrator whenever the control valve hits physical hard stops (0% or 100% stroke), ensuring instantaneous recovery when setpoint returns to normal range.
- **Derivative on PV:** Differentiates only the measured process variable rather than the error: $\frac{d(PV)}{dt}$ instead of $\frac{d(SP-PV)}{dt}$. This eliminates "derivative kick" spikes when an operator makes an abrupt step change to setpoint."""
    },

    # ══════════════════════════════════════════════════════════════════════════
    # 7. WATER TREATMENT & MEMBRANE DESALINATION (AWWA)
    # ══════════════════════════════════════════════════════════════════════════
    'reverse_osmosis_desalination': {
        'title': 'Water Treatment & Desalination: Reverse Osmosis Principles, Flux & Recovery',
        'domain': 'water_treatment',
        'standard': 'AWWA Manual M46 / ISO 14001 / EPA Water Quality Standards',
        'keywords': ['reverse osmosis', 'desalination', 'ro membrane', 'osmotic pressure', 'water treatment', 'salt rejection', 'permeate flux', 'sdi', 'clean in place'],
        'content': r"""### Water Treatment & Desalination: Reverse Osmosis (RO) Principles

#### 1. The Physics of Reverse Osmosis
In natural osmosis, water spontaneously permeates across a semi-permeable membrane from a dilute solution into a concentrated solute solution to equalize chemical potentials. 

**Reverse Osmosis (RO)** reverses this natural transport process. By applying an external hydraulic pressure ($\Delta P$) that exceeds the solution's natural thermodynamic osmotic pressure ($\Delta \Pi$), pure water molecules are driven across a semi-permeable polyamide thin-film composite (TFC) membrane, leaving dissolved salts, silica, heavy metals, and organics behind in a concentrated reject stream (brine).

#### 2. Thermodynamic Osmotic Pressure (Van 't Hoff Equation)
For dilute aqueous electrolyte solutions:

$$\Pi = i \times M \times R \times T$$

Where:
- $i$ = Van 't Hoff ionization factor (e.g., $i \approx 2$ for $\text{NaCl}$)
- $M$ = Molar concentration of solute ($\text{mol/L}$)
- $R$ = Universal gas constant ($0.08206\text{ L}\cdot\text{atm}/(\text{mol}\cdot\text{K})$)
- $T$ = Absolute water temperature (Kelvin)

*Engineering Rule of Thumb:* Seawater ($35,000\text{ mg/L TDS}$) exhibits an osmotic pressure of approximately **27 to 30 bar (390 to 435 psi)**. To drive permeate flux, seawater RO (SWRO) high-pressure pumps must supply **55 to 70 bar (800 to 1000 psi)**.

#### 3. Water Flux & Salt Rejection Equations
- **Water Permeate Flux ($J_w$):** Volumetric flow of pure water per unit membrane active area:
  $$J_w = A \times (\Delta P - \Delta \Pi)$$
  Where $A$ is the membrane water permeability coefficient, $\Delta P = P_{feed} - P_{permeate}$, and $\Delta \Pi$ is osmotic pressure difference.
- **Salt / Solute Flux ($J_s$):** Transport of dissolved solids across the membrane driven by concentration gradient:
  $$J_s = B \times (C_{feed} - C_{permeate})$$
  Where $B$ is the solute permeability coefficient. Note that salt transport is independent of hydraulic pressure $\Delta P$. Increasing feed pressure produces higher water flux, resulting in purer permeate water.
- **Solute Rejection Fraction ($R$):**
  $$R = \left(1 - \frac{C_{permeate}}{C_{feed}}\right) \times 100\%$$
  Modern spiral-wound polyamide elements deliver salt rejections exceeding **99.5% to 99.8%**.
- **System Recovery Rate ($Y$):**
  $$Y = \frac{Q_{permeate}}{Q_{feed}} \times 100\%$$
  Typical design recovery: **40% to 50% for SWRO** (seawater); **75% to 85% for BWRO** (brackish groundwater).

#### 4. Pretreatment & Silt Density Index (SDI)
To protect membrane elements from irreversible particulate fouling, scaling, and biological degradation:
- **Silt Density Index (SDI):** Must remain **$\text{SDI}_{15} < 3.0$** (and strictly $< 5.0$).
- **Anti-Scalant Injection:** Threshold inhibitors (polycarboxylates, phosphonates) prevent crystallization of $\text{CaCO}_3$, $\text{CaSO}_4$, and $\text{BaSO}_4$.
- **Dechlorination:** Polyamide membranes rapidly degrade when exposed to free chlorine ($< 0.1\text{ ppm}$ tolerance); sodium bisulfite (SBS) dosing is mandatory."""
    },

    # ══════════════════════════════════════════════════════════════════════════
    # 8. ROTATING MACHINERY & PUMP HYDRAULICS (API 610 / ISO 13709)
    # ══════════════════════════════════════════════════════════════════════════
    'pump_cavitation': {
        'title': 'Cavitation in Centrifugal Pumps: Mechanisms, Symptoms & Prevention',
        'domain': 'pump_cavitation',
        'standard': 'API 610 (12th Edition) / ISO 13709',
        'keywords': ['cavitation', 'cavitate', 'bubble collapse', 'implosion', 'pitting', 'gravel noise', 'npsh margin'],
        'content': r"""### Cavitation in Centrifugal Pumps: Mechanisms, Symptoms & Prevention

#### 1. What is Cavitation?
Cavitation is a dynamic two-phase fluid phenomenon that occurs when the localized static pressure of a liquid drops below its thermodynamic vapor pressure ($P_{vap}$) at operating temperature. When this threshold is crossed, the liquid vaporizes instantaneously, creating microscopic vapor cavities (bubbles).

As the flowing liquid sweeps these vapor cavities into regions of higher static pressure within the impeller vane passages, the surrounding liquid pressure exceeds the vapor pressure, causing the bubbles to violently implode.

#### 2. Physical Damage Mechanism
- **Asymmetric Bubble Collapse:** Occurring adjacent to a solid metal wall, the bubble collapses non-spherically, forming a high-velocity liquid micro-jet directed at the metal boundary.
- **Extreme Localized Pressures:** Micro-jets achieve velocities of 1,000 to 1,500 m/s, generating localized impact pressures of 10,000 to 100,000 bar (1 to 10 GPa).
- **Fatigue Erosion:** Repeated impacts exceed the fatigue yield strength of the material, causing progressive pitting erosion and honeycomb metal loss on impeller vane surfaces.

#### 3. Governing Standards & NPSH Margin (API 610)
Under **API 610 12th Edition Clause 6.1.2**, process pumps require a certified Net Positive Suction Head margin:
- **Standard Industrial Margin:** NPSH Available (NPSHa) must exceed NPSH Required (NPSHr) by at least **1.0 meter (3.3 feet)** or a ratio of **1.10x**, whichever is greater.
- **High-Energy Services:** For volatile fluids or high-energy pumps (single-stage head > 200 m or power > 225 kW), an expanded margin of **1.20x to 1.50x** is required."""
    },

    'pump_affinity_laws': {
        'title': 'Centrifugal Pump Affinity Laws: Principles, Formulas & VFD Applications',
        'domain': 'pump_hydraulics',
        'standard': 'Hydraulic Institute (HI) / API 610',
        'keywords': ['affinity law', 'affinity laws', 'speed change', 'impeller trim', 'trimming impeller', 'rpm change'],
        'content': r"""### Centrifugal Pump Affinity Laws: Principles, Formulas & Applications

#### 1. Fundamental Principles
The pump affinity laws govern mathematical relationships between rotational speed ($N$), impeller diameter ($D$), flow rate ($Q$), Total Dynamic Head ($H$), and shaft Brake Horsepower ($BHP$).

#### 2. Speed Variation (Constant Impeller Diameter D)
When changing rotational speed from $N_1$ to $N_2$ (e.g., using a Variable Frequency Drive):
- **Flow Rate ($Q$):** Directly proportional to speed:
  $$Q_2 = Q_1 \times \left(\frac{N_2}{N_1}\right)$$
- **Total Dynamic Head ($H$):** Proportional to the square of speed:
  $$H_2 = H_1 \times \left(\frac{N_2}{N_1}\right)^2$$
- **Brake Horsepower ($BHP$):** Proportional to the cube of speed:
  $$BHP_2 = BHP_1 \times \left(\frac{N_2}{N_1}\right)^3$$

*Engineering Impact:* A 20% reduction in motor speed yields a 20% drop in flow, a 36% drop in head, and a massive **48.8% reduction in electrical power consumption**."""
    },

    # ══════════════════════════════════════════════════════════════════════════
    # 9. PIPING DESIGN & PRESSURE CONTAINMENT (ASME B31.3 / B31.1 / B16.5)
    # ══════════════════════════════════════════════════════════════════════════
    'b31_3_vs_b31_1': {
        'title': 'Comparative Analysis: ASME B31.3 (Process Piping) vs ASME B31.1 (Power Piping)',
        'domain': 'pipe_thickness',
        'standard': 'ASME B31.3-2022 / ASME B31.1-2022',
        'keywords': ['b31.3', 'b31.1', 'difference between b31.3 and b31.1', 'compare b31.3', 'process piping vs power piping'],
        'content': r"""### Comparative Analysis: ASME B31.3 (Process Piping) vs ASME B31.1 (Power Piping)

#### 1. Scope & Jurisdiction
- **ASME B31.3 (Process Piping):** Governs chemical, petrochemical, manufacturing, pharmaceutical, and textile facilities handling flammable, toxic, or reactive fluids.
- **ASME B31.1 (Power Piping):** Governs electric power generating stations, steam central heating plants, and industrial boilers handling high-energy steam and feedwater.

#### 2. Design Safety Margins & Allowable Stress
- **ASME B31.3:** Employs a **3.0:1 design margin** on ultimate tensile strength. Because modern process plants utilize extensive instrumentation and ESD protection, higher allowable stresses are permitted, resulting in lighter, more economical pipe walls.
- **ASME B31.1:** Employs a more conservative **3.5:1 to 4.0:1 margin** on tensile strength. Power plants prioritize long-term structural conservatism against severe thermal fatigue, cyclic steam hammering, and 40+ year operating lifespans."""
    },

    'barlow_formula': {
        'title': "Barlow's Formula and ASME B31.3 Pipe Wall Thickness Derivation",
        'domain': 'pipe_thickness',
        'standard': 'ASME B31.3 Paragraph 304.1.2 / ASME B36.10M',
        'keywords': [
            'barlow', "barlow's", 'wall thickness formula', 'pipe thickness formula', 'pipeline thickness formula',
            'pipe thickness', 'pipeline thickness', 'thickness of a pipe', 'thickness of a pipeline', 'thickness of pipeline',
            'calculate pipe thickness', 'calculate pipeline thickness', 'how to calculate pipe thickness',
            'how can we calculate the thickness', 'calculate the thickness', 'calculate thickness of a pipeline',
            'hoop stress', 'paragraph 304.1.2', 'pipe wall thickness', 'pipeline wall thickness',
            'minimum pipeline thickness', 'minimum pipe thickness', 'pipeline wall'
        ],
        'content': r"""### Barlow's Formula & ASME B31.3 Pipeline Wall Thickness Derivation

#### 1. Classical Barlow's Formula (Hoop Stress Baseline)
For a thin-walled cylindrical pressure pipe ($D/t \ge 10$), the circumferential (hoop) stress $\sigma_h$ generated by internal gauge pressure $P$ is given by **Barlow's Formula**:

$$\sigma_h = \frac{P \times D}{2 \times t}$$

Solving for the theoretical pressure containment thickness $t$:

$$t = \frac{P \times D}{2 \times \sigma_h}$$

Where:
- $P$ = Internal design gauge pressure (psig, bar, or MPa)
- $D$ = Outside pipe diameter (in or mm)
- $t$ = Pipe wall thickness (in or mm)
- $\sigma_h$ = Allowable hoop tensile stress (psi, bar, or MPa)

#### 2. ASME B31.3 Process Piping Formula (Paragraph 304.1.2)
Classical Barlow's formula assumes uniform stress across a thin wall. For actual industrial process piping handling hazardous, pressurized fluids, **ASME B31.3 Paragraph 304.1.2** modifies Barlow's equation to account for thick-wall stress distribution, longitudinal weld joint efficiency, and temperature-dependent material plasticity:

$$t_d = \frac{P \times D}{2 \times (S \times E \times W + P \times Y)}$$

The total minimum required pipe wall thickness $t_m$ is then obtained by adding structural allowances:

$$t_m = t_d + c$$

Where:
- **$t_m$**: Total minimum required pipe wall thickness (in or mm).
- **$t_d$**: Pressure design thickness calculated from internal pressure.
- **$P$**: Internal design gauge pressure.
- **$D$**: Outside pipe diameter per ASME B36.10M.
- **$S$**: Basic allowable stress of the pipe material at design temperature from **ASME B31.3 Table A-1** (e.g., $S = 20{,}000\text{ psi} = 137.9\text{ MPa}$ for ASTM A106 Grade B seamless carbon steel at ambient up to 200°C).
- **$E$**: Quality factor for longitudinal/spiral joints from Table 302.3.4 ($E = 1.00$ for seamless pipe; $E = 0.85$ for electric resistance welded / ERW).
- **$W$**: Weld joint strength reduction factor per Paragraph 302.3.5 ($W = 1.0$ at temperatures below the creep range).
- **$Y$**: Material and temperature coefficient from Table 304.1.1 ($Y = 0.40$ for ferritic steels at $T < 482^\circ\text{C}$ / $900^\circ\text{F}$).
- **$c$**: Total mechanical and chemical allowances, comprising:
  - **$c_1$ (Corrosion/Erosion allowance):** Sacrificial wall loss over design plant lifespan (typically $1.5\text{ to }3.0\text{ mm}$ or $0.0625\text{ to }0.125\text{ in}$).
  - **$c_2$ (Mechanical allowance):** Thread depth or machining groove depth if threaded connections are utilized.

#### 3. Nominal Wall Thickness & Mill Undertolerance
Pipe manufacturing specifications (e.g., **ASTM A106, ASTM A53, API 5L**) permit a manufacturing mill undertolerance of up to **$-12.5\%$** on wall thickness. Therefore, the nominal purchased wall thickness $t_{\text{nom}}$ must satisfy:

$$t_{\text{nom}} \ge \frac{t_m}{1 - \text{mill tolerance}} = \frac{t_m}{0.875} = 1.143 \times t_m$$

#### 4. Selection of Pipe Schedule (ASME B36.10M / B36.19M)
Once the minimum nominal thickness $t_{\text{nom}}$ is calculated, the design engineer selects the next higher standard nominal schedule from **ASME B36.10M** (Carbon & Alloy Steel) or **ASME B36.19M** (Stainless Steel):
- **Schedule 40 (Standard - STD):** Baseline utility and moderate pressure process lines.
- **Schedule 80 (Extra Strong - XS):** High-pressure services, vibration-prone pump discharges, and corrosive streams.
- **Schedule 160 / Double Extra Strong (XXS):** Extreme high-pressure lines (e.g., hydraulic systems, high-pressure injection > 150–200 bar).

#### 5. Step-by-Step Calculation Methodology
1. **Define Operating Parameters:** Design pressure $P$, design temperature $T$, nominal pipe size (NPS), and fluid corrosivity.
2. **Select Pipe Material:** Obtain allowable stress $S$ from ASME B31.3 Table A-1 and joint efficiency $E$.
3. **Calculate Pressure Design Thickness:** Evaluate $t_d = \frac{P \cdot D}{2(S \cdot E \cdot W + P \cdot Y)}$.
4. **Add Corrosion Allowance:** Compute minimum structural thickness $t_m = t_d + c$.
5. **Apply Mill Tolerance:** Calculate $t_{\text{nom, req}} = t_m / 0.875$.
6. **Assign Standard Schedule:** Select the standard schedule from ASME B36.10M whose specified nominal thickness meets or exceeds $t_{\text{nom, req}}$."""
    },

    'schedule_40_vs_80': {
        'title': 'Piping Schedule Comparison: Schedule 40 vs Schedule 80',
        'domain': 'pipe_thickness',
        'standard': 'ASME B36.10M / ASTM A106',
        'keywords': ['schedule 40', 'schedule 80', 'sch 40 vs sch 80', 'sch 40', 'sch 80', 'pipe schedule difference'],
        'content': r"""### Piping Schedule Comparison: Schedule 40 (Standard) vs Schedule 80 (Extra Strong)

#### 1. Geometry & Outside Diameter
Under ASME B36.10M, Outside Diameter (OD) is identical for a given NPS. Schedule 80 pipe wall is substantially thicker (+30% to +50%), which reduces the Internal Diameter (ID) and cross-sectional flow area.

#### 2. Pressure & Mechanical Containment
- **Schedule 40:** Standard baseline for utility water, low-pressure instrument air, inert gases, and general fluid transport within ASME Class 150 boundaries.
- **Schedule 80:** Extra strong wall for high-pressure process streams (ASME Class 300+), severe cyclic conditions, pump discharge manifolds subject to pulsation, and corrosive/erosive services requiring larger sacrificial wall margin."""
    },

    'flange_facing_rf_rtj': {
        'title': 'Flange Facings: Raised Face (RF) vs Ring Type Joint (RTJ)',
        'domain': 'flange_mawp',
        'standard': 'ASME B16.5 / ASME B16.20',
        'keywords': ['raised face', 'rf', 'rtj', 'ring type joint', 'flange facing', 'rf vs rtj'],
        'content': r"""### Flange Facings: Raised Face (RF) vs Ring Type Joint (RTJ)

#### 1. Raised Face (RF) Flanges
Features a raised contact plateau with serrated phonographic or concentric finish (roughness 125–250 micro-inches Ra). Mates with spiral-wound or sheet gaskets. Standard, highly cost-effective choice for industrial piping lines up to Class 600# and temperatures up to 450°C.

#### 2. Ring Type Joint (RTJ) Flanges
Features a precision-machined annular trapezoidal groove mating with a solid metallic ring gasket. Bolt tension plastically deforms the solid metal ring against the groove walls, creating a metal-to-metal hermetic seal. Standard for extreme pressure services (Class 900#, 1500#, 2500#), high-temperature hydrogen services, and severe subsea connections."""
    },

    'compressor_surge_concept': {
        'title': 'Centrifugal Compressor Surge: Physics, Detection & Anti-Surge Control',
        'domain': 'compressor_surge',
        'standard': 'API 617 (8th Edition)',
        'keywords': ['compressor surge', 'surge', 'anti-surge', 'ascl', 'stall', 'choke', 'compressor trip'],
        'content': r"""### Centrifugal Compressor Surge: Physics, Detection & Anti-Surge Control

#### 1. What is Compressor Surge?
Surge is a dynamic aerodynamic instability occurring when mass flow drops below a critical threshold for a given pressure ratio. The pressure ratio collapses, causing instantaneous flow reversal through the impellers into the suction piping at frequencies of 0.5 to 5 Hz.

#### 2. Anti-Surge Control Line (ASCL) & Margins
Under API 617, compressors incorporate an automated Anti-Surge Control system:
- **Anti-Surge Control Line (ASCL):** Maintains a minimum **10% to 15% surge margin** to the right of the Surge Limit Line (SLL).
- **Anti-Surge Valve (ASV):** Fast-acting recycle valve designed for rapid stroke (< 1.5 seconds) to divert gas from discharge back to suction, maintaining forward flow."""
    },

    'heat_exchanger_fouling': {
        'title': 'Heat Exchanger Fouling: Mechanisms, Thermal Degradation & Cleaning',
        'domain': 'heat_exchanger_fouling',
        'standard': 'TEMA (10th Edition) / API 660',
        'keywords': ['fouling', 'exchanger fouling', 'fouling resistance', 'rf', 'heat transfer degradation', 'cleaning exchanger'],
        'content': r"""### Heat Exchanger Fouling: Thermal Degradation & Maintenance

#### 1. Thermal Resistance Formula
Fouling deposits act as an insulating barrier, reducing the overall heat transfer coefficient ($U$):
$$\frac{1}{U_{dirty}} = \frac{1}{U_{clean}} + R_f$$
Where $R_f$ is total fouling resistance factor ($m^2\cdot K/W$) per TEMA standards.

#### 2. Field Diagnostic Indicators
- **Approach Temperature Escalation:** Widening temperature difference between hot-fluid outlet and cold-fluid outlet.
- **Differential Pressure Escalation:** Narrowing tube flow area increases pressure drop proportionally to $v^2$.
- **Cleaning Protocols:** On-line chemical flushing, high-pressure hydrojetting (10,000–20,000 psi), or ultrasonic bath cleaning."""
    },

    'vibration_severity_iso': {
        'title': 'Machinery Vibration Severity Diagnostic Guidelines (ISO 10816-3 / ISO 20816)',
        'domain': 'vibration_severity',
        'standard': 'ISO 10816-3 / API 670',
        'keywords': ['vibration', 'iso 10816', 'vibration zones', 'vibration limits', 'vibration severity', 'mms'],
        'content': r"""### Machinery Vibration Severity Diagnostic Guidelines (ISO 10816-3 / ISO 20816)

#### 1. Evaluation Metric: Velocity RMS (mm/s)
Vibration velocity RMS (10 Hz to 1,000 Hz) directly measures kinetic fatigue energy and mechanical stress exerted on bearings and structures.

#### 2. Evaluation Severity Zones (Group 2 Machines, Rigid Foundation)
- **Zone A (0.0 to 1.4 mm/s RMS):** Newly commissioned, precision-aligned machinery.
- **Zone B (1.4 to 2.8 mm/s RMS):** **Satisfactory for unrestricted long-term continuous operation.**
- **Zone C (2.8 to 4.5 mm/s RMS):** **Unsatisfactory for long-term operation.** Maintenance must be scheduled. Alarm zone.
- **Zone D (> 4.5 mm/s RMS):** **Dangerous vibration severity.** Risk of catastrophic bearing seizure or shaft fracture. Immediate trip required.

#### 3. Diagnostic Spectral Signatures
- **1X RPM Dominant:** Rotor mass unbalance.
- **2X RPM Dominant:** Shaft angular or parallel misalignment across coupling.
- **Harmonics (1X, 2X, 3X, 4X):** Mechanical looseness in bearing housing or baseplate bolts."""
    }
}
