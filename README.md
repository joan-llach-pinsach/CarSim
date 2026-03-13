# Car Acceleration Simulator

A web-based car acceleration simulator that models realistic vehicle physics including engine torque curves, transmission ratios, aerodynamic drag, rolling resistance, and engine friction.

## Features

- **Car Specifications**: Configure vehicle parameters including mass, aerodynamics, tire dimensions, and engine geometry
- **Engine Modeling**: Define custom torque curves with automatic power calculation, FMEP-based friction modeling, and rev limiter with hysteresis
- **Transmission**: Configure gear ratios, final drive ratios, and view calculated speeds at key RPM points
- **Real-time Simulation**: Run acceleration simulations with multiple gear shifting modes and 12 synchronized dashboard charts
- **Data Persistence**: Save/load car configurations to JSON files

## Running on Windows 11

This application uses ES6 JavaScript modules, which require the files to be served via HTTP (not opened directly from the file system).

### Option 1: Python HTTP Server (Recommended)

If you have Python installed:

1. Open **Command Prompt** or **PowerShell**
2. Navigate to the project folder:
   ```powershell
   cd "C:\path\to\WebAppTest"
   ```
3. Start the HTTP server:
   ```powershell
   # Python 3
   python -m http.server 8000
   
   # Or if you have Python 2
   python -m SimpleHTTPServer 8000
   ```
4. Open your browser and go to: **http://localhost:8000**

### Option 2: Node.js HTTP Server

If you have Node.js installed:

1. Install `http-server` globally (one-time setup):
   ```powershell
   npm install -g http-server
   ```
2. Navigate to the project folder and start the server:
   ```powershell
   cd "C:\path\to\WebAppTest"
   http-server -p 8000
   ```
3. Open your browser and go to: **http://localhost:8000**

### Option 3: Visual Studio Code Live Server

If you use VS Code:

1. Install the **Live Server** extension by Ritwick Dey
2. Open the project folder in VS Code
3. Right-click on `index.html` and select **"Open with Live Server"**
4. The browser will open automatically

## Project Structure

```
WebAppTest/
├── index.html              # Main HTML entry point
├── css/
│   └── styles.css          # Application styles
└── js/
    ├── app.js              # Application entry point and tab management
    ├── carModel.js         # Car data model and state management
    ├── physics.js          # Physics calculations (forces, torque, etc.)
    ├── fileUtils.js        # File save/load utilities
    └── tabs/
        ├── carSpecsTab.js      # Car specifications tab UI
        ├── transmissionTab.js  # Transmission tab UI and charts
        └── simulationTab.js    # Simulation tab UI and engine
```

## Technical Details

### Physics Model

- **Engine Torque**: Interpolated from user-defined RPM/Torque curve
- **Engine Friction**: FMEP model: `FMEP = a + b·Vp + c·Vp²` (Vp = mean piston speed)
- **Aerodynamic Drag**: `F_drag = 0.5 · ρ · Cd · A · v²`
- **Rolling Resistance**: `F_roll = Crr · m · g`
- **Tractive Force**: `F = (T_engine · ratio · efficiency) / r_wheel`

### Gear Shifting Modes

- **At Redline**: Shift at redline RPM
- **At Max Revs**: Shift at maximum RPM (rev limiter)
- **Max Torque**: Shift at peak torque RPM
- **Max Power**: Shift at peak power RPM
- **Optimal Shift**: Shift when next gear provides more tractive force
- **Manual**: Stay in selected gear

### Units

- Internal calculations use SI units (m, s, kg, N, W)
- UI displays: km/h, HP, Nm, cc, mm

## Dependencies

- [Chart.js](https://www.chartjs.org/) (loaded via CDN) - For all charts and graphs

## Installing as a Mobile App (PWA)

This app can be installed on Android, iOS, or desktop as a Progressive Web App (PWA).

### On Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **⋮** menu (three dots)
3. Tap **"Add to Home screen"** or **"Install app"**
4. The app will appear on your home screen and work offline

### On iOS (Safari)
1. Open the app URL in Safari
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. The app will appear on your home screen

### On Desktop (Chrome/Edge)
1. Open the app URL
2. Click the **install icon** in the address bar (or ⋮ menu → "Install...")
3. The app will open in its own window

### Generating App Icons
Before installing, generate the PWA icons:
1. Open `icons/generate-icons.html` in a browser
2. Right-click each image and save as:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)
3. Save both files in the `icons/` folder

## Browser Compatibility

Works in all modern browsers that support ES6 modules:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## License

This project is for educational and personal use.

