# AeroTwin - AI-Enabled Digital Twin Demonstrator

AeroTwin is a research prototype dashboard for simulating health monitoring, thermal behavior, fault prediction, mission reliability, and remaining useful life estimation for aero piston engines used in MALE UAV-class mission profiles.

This project uses simulated telemetry only. It is not connected to a real UAV, aircraft engine, flight-control system, or certified monitoring system.

## Prototype Status

**RESEARCH PROTOTYPE - SIMULATED ENGINE DATA**

This demonstrator is intended to show the architecture and operator workflow of a digital twin system. The values, predictions, faults, and advisories are generated from deterministic prototype logic and should not be treated as real engineering predictions.

## Features

- Real-time simulated engine telemetry
- Interactive mission and environmental simulation
- Virtual aero piston engine cutaway
- Animated engine internals:
  - rotating propeller
  - moving pistons
  - crankshaft rotation
  - valve motion
  - fuel injector spray
  - spark and combustion pulse
  - intake, exhaust, and oil-flow cues
- Engine health index with subsystem status
- AI prediction and advisory panel
- Fault prediction table
- Remaining Useful Life estimation
- Engine parameter trend graph
- Thermal model with heat balance
- Thermodynamic Otto-cycle working-process view
- Historical mission replay module
- Digital twin architecture overview

## Core Dashboard Modules

### Live Telemetry

The dashboard displays simulated values for:

- RPM
- CHT, or Cylinder Head Temperature
- EGT, or Exhaust Gas Temperature
- Oil pressure
- Oil temperature
- Fuel flow
- Vibration
- Battery voltage
- Injection timing

### Mission Simulation

The simulation panel allows the user to change:

- Mission profile
- Altitude
- Ambient temperature
- Humidity
- Wind
- Throttle
- Mission duration

The current simulation logic responds deterministically to these inputs. For example, higher throttle and hot high-altitude conditions increase thermal load, fuel flow, vibration tendency, degradation, and reduce RUL.

### Thermal Model

The thermal model estimates:

- Combustion core temperature
- Cylinder head temperature
- Oil circuit temperature
- Cooling air temperature
- Heat generated
- Cooling capacity
- Net thermal balance
- Air density estimate
- Head-to-oil temperature gradient
- Thermal stress index

### Thermodynamic Working Process

The thermodynamic section visualizes a simplified Otto-cycle process:

1. Intake
2. Compression
3. Combustion
4. Expansion
5. Exhaust

It includes a pressure-volume cycle diagram and live estimates for:

- Manifold pressure
- Compression ratio
- Compression pressure
- Peak cylinder pressure
- BMEP estimate
- Indicated efficiency

### AI Advisory and Fault Prediction

The AI advisory section generates prototype maintenance guidance from the simulated operating state. The system estimates risk categories such as:

- Overheating trend
- Injector abnormality
- Lubrication issue
- Combustion instability
- Abnormal vibration
- Sensor drift or failure
- Misfire

These are simulated outputs for demonstration only.

## Technology Stack

This prototype is implemented as a static frontend:

- HTML
- CSS
- JavaScript
- SVG animation
- Canvas charts

No external runtime dependencies are required for the application itself.

## Project Files

```text
.
├── index.html
├── styles.css
├── app.js
└── README.md
```

## How to Run

Open the project folder:

```powershell
cd C:\Users\Ganesh_Pai\OneDrive\Desktop\ps2
```

Start a local static server:

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html','.css':'text/css','.js':'text/javascript'};http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const target=u.pathname==='/'?'index.html':u.pathname.slice(1);const p=path.resolve(root,target);if(!p.startsWith(root)){res.writeHead(403);res.end('Forbidden');return;}fs.readFile(p,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(p)]||'text/plain'});res.end(data);});}).listen(4173,()=>console.log('AeroTwin prototype running at http://127.0.0.1:4173'));"
```

Then open:

```text
http://127.0.0.1:4173
```

The page can also be opened directly from `index.html`, but using a local server is recommended.

## Suggested Demonstration Scenario

Use the preset:

```text
High Altitude + Hot Weather + Endurance
```

Example conditions:

- Altitude: 7000 m
- Ambient temperature: 42 C
- Throttle: 82 percent
- Duration: 120 minutes

Expected behavior:

- Higher CHT and EGT
- Higher fuel flow
- Increased thermal stress
- Increased degradation estimate
- Reduced health index
- Reduced RUL
- Thermal advisory indicating sustained high-load stress

## Digital Twin Architecture

The prototype represents the following architecture:

```text
Physical Engine
-> Sensor Telemetry
-> Data Preprocessing
-> Physics-Based Engine Model
-> Real-Time State Estimation
-> AI/ML Correction
-> Digital Twin State
-> Operator Dashboard
```

The current telemetry source is a mock client-side simulation. It is structured so that a real telemetry adapter could be added later.

## Important Disclaimer

This software is a research and presentation prototype. It is not intended to represent:

- certified flight-critical engine-control software
- real aircraft maintenance guidance
- real UAV telemetry
- validated engine performance maps
- certified RUL prediction
- operational safety decision support

All displayed values are simulated prototype data.

## Future Improvements

Potential next steps:

- Replace mock telemetry with a real telemetry adapter
- Add backend persistence for missions and health history
- Add exportable mission reports
- Add calibrated engine performance maps
- Add validated fault models
- Improve responsive mobile dashboard layout
- Add role-based operator views
- Add test coverage for simulation and analytics logic
