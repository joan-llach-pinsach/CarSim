/**
 * Car Specifications Tab - Tab 1
 * Handles car characteristics input and power/torque curve visualization
 */

import { getCurrentCar, updateCurrentCar } from '../carModel.js';
import { saveToJsonFile, loadFromJsonFile, validateCarSpecsData } from '../fileUtils.js';
import { calculateFrontalArea, calculateEngineDisplacement } from '../physics.js';

let powerTorqueChart = null;

/**
 * Calculate engine displacement in cc (cubic centimeters)
 * @param {Object} engine - Engine configuration with numCylinders, bore, stroke
 * @returns {number} Displacement in cc
 */
function calculateDisplacementCc(engine) {
    const displacementM3 = calculateEngineDisplacement(engine.numCylinders, engine.bore, engine.stroke);
    return Math.round(displacementM3 * 1e6); // Convert m³ to cc
}

/**
 * Render the car specifications tab
 * @param {HTMLElement} container - Container element
 */
export function renderCarSpecsTab(container) {
    const car = getCurrentCar();
    
    container.innerHTML = `
        <div class="cards-flow">
            <div class="card">
                <h2>Basic Specifications</h2>
                <div class="form-row">
                    <div class="form-group">
                        <label for="carName">Car Name</label>
                        <input type="text" id="carName" value="${car.name}">
                    </div>
                    <div class="form-group">
                        <label for="carMass">Mass (kg)</label>
                        <input type="number" id="carMass" value="${car.mass}" min="500" max="5000">
                    </div>
                    <div class="form-group">
                        <label for="rollingResist">Rolling Resistance (Crr)</label>
                        <input type="number" id="rollingResist" value="${car.rollingResistanceCoeff}" step="0.001" min="0.005" max="0.03">
                    </div>
                    <div class="form-group">
                        <label for="drivetrainEff">Drivetrain Efficiency</label>
                        <input type="number" id="drivetrainEff" value="${car.drivetrainEfficiency}" step="0.01" min="0.7" max="1.0">
                    </div>
                </div>
            </div>

            <div class="card">
                <h2>Aerodynamics</h2>
                <div class="form-row">
                    <div class="form-group">
                        <label for="dragCoeff">Drag Coefficient (Cd)</label>
                        <input type="number" id="dragCoeff" value="${car.dragCoefficient}" step="0.01" min="0.1" max="1.0">
                    </div>
                    <div class="form-group">
                        <label for="carWidth">Width (m)</label>
                        <input type="number" id="carWidth" value="${car.width}" step="0.01" min="1" max="3">
                    </div>
                    <div class="form-group">
                        <label for="carHeight">Height (m)</label>
                        <input type="number" id="carHeight" value="${car.height}" step="0.01" min="1" max="3">
                    </div>
                    <div class="form-group">
                        <label for="frontalAreaCoeff">Shape Coefficient</label>
                        <input type="number" id="frontalAreaCoeff" value="${car.frontalAreaCoeff || 0.85}" step="0.01" min="0.70" max="0.95">
                    </div>
                    <div class="form-group">
                        <label for="frontalArea">Frontal Area (m²)</label>
                        <input type="text" id="frontalArea" value="${car.frontalArea.toFixed(2)}" readonly
                            style="background-color: var(--background-color); cursor: not-allowed;">
                    </div>
                </div>
                <div style="background-color: var(--background-color); padding: 10px; border-radius: 6px; margin-top: 10px;">
                    <small style="color: var(--text-muted);">
                        <strong>Frontal Area</strong> = Width × Height × Shape Coefficient<br><br>
                        <strong>Reference shape coefficients:</strong><br>
                        • Sports cars (streamlined): 0.75 - 0.80<br>
                        • Typical sedans: 0.82 - 0.85<br>
                        • SUVs and trucks (boxy): 0.88 - 0.92
                    </small>
                </div>
            </div>

            <div class="card">
                <h2>Tire Dimensions</h2>
                <p style="color: var(--text-muted); margin-bottom: 15px;">Format: Width/Aspect Ratio R Rim Diameter (e.g., 225/50 R17)</p>
                <div class="form-row">
                    <div class="form-group">
                        <label for="tireWidth">Width (mm)</label>
                        <input type="number" id="tireWidth" value="${car.tire.width}" min="155" max="335">
                    </div>
                    <div class="form-group">
                        <label for="tireAspect">Aspect Ratio (%)</label>
                        <input type="number" id="tireAspect" value="${car.tire.aspectRatio}" min="25" max="80">
                    </div>
                    <div class="form-group">
                        <label for="tireRim">Rim Diameter (inches)</label>
                        <input type="number" id="tireRim" value="${car.tire.rimDiameter}" min="14" max="22">
                    </div>
                    <div class="form-group">
                        <label>Wheel Radius</label>
                        <span id="wheelRadiusDisplay" style="font-weight: bold;">${(car.wheelRadius * 1000).toFixed(1)} mm</span>
                    </div>
                </div>
            </div>

            <div class="card full-width">
                <h2>Engine Specifications</h2>

                <h3 style="margin-bottom: 10px; color: var(--text-secondary);">RPM Range</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="idleRpm">Idle RPM</label>
                        <input type="number" id="idleRpm" value="${car.idleRpm}" min="500" max="1500">
                    </div>
                    <div class="form-group">
                        <label for="redlineRpm">Redline RPM</label>
                        <input type="number" id="redlineRpm" value="${car.redlineRpm}" min="4000" max="12000">
                    </div>
                    <div class="form-group">
                        <label for="maxRpm">Max RPM</label>
                        <input type="number" id="maxRpm" value="${car.maxRpm}" min="4000" max="15000">
                    </div>
                </div>

                <h3 style="margin-top: 20px; margin-bottom: 10px; color: var(--text-secondary);">Engine Geometry</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="numCylinders">Cylinders</label>
                        <input type="number" id="numCylinders" value="${car.engine.numCylinders}" min="1" max="16" step="1">
                    </div>
                    <div class="form-group">
                        <label for="bore">Bore (mm)</label>
                        <input type="number" id="bore" value="${car.engine.bore}" min="50" max="150" step="0.1">
                    </div>
                    <div class="form-group">
                        <label for="stroke">Stroke (mm)</label>
                        <input type="number" id="stroke" value="${car.engine.stroke}" min="50" max="150" step="0.1">
                    </div>
                    <div class="form-group">
                        <label for="displacement">Displacement (cc)</label>
                        <input type="text" id="displacement" value="${calculateDisplacementCc(car.engine)}" readonly
                            style="background-color: var(--background-color); cursor: not-allowed;">
                    </div>
                </div>
                <div class="form-row" style="margin-top: 10px;">
                    <div class="form-group">
                        <label for="fmepA">FMEP a (bar)</label>
                        <input type="number" id="fmepA" value="${car.engine.fmepA}" min="0.1" max="0.6" step="0.01">
                    </div>
                    <div class="form-group">
                        <label for="fmepB">FMEP b (bar/(m/s))</label>
                        <input type="number" id="fmepB" value="${car.engine.fmepB}" min="0.01" max="0.1" step="0.001">
                    </div>
                    <div class="form-group">
                        <label for="fmepC">FMEP c (bar/(m/s)²)</label>
                        <input type="number" id="fmepC" value="${car.engine.fmepC}" min="0.0001" max="0.005" step="0.0001">
                    </div>
                </div>
                <div style="background-color: var(--background-color); padding: 10px; border-radius: 6px; margin-top: 10px;">
                    <small style="color: var(--text-muted);">
                        <strong>Friction Mean Effective Pressure (FMEP)</strong> models engine internal friction losses.<br><br>
                        <strong>Formula:</strong> FMEP = a + b·Vp + c·Vp²<br>
                        Where Vp = mean piston speed (m/s) = 2 × Stroke × RPM / 60<br><br>
                        <strong>Friction Torque</strong> = FMEP × Displacement / (4π)<br><br>
                        <strong>Typical values by engine type:</strong><br>
                        • Modern efficient engines: a=0.25, b=0.02, c=0.0008<br>
                        • Standard gasoline engines: a=0.30, b=0.03, c=0.0010<br>
                        • High-performance engines: a=0.35, b=0.04, c=0.0015<br>
                        • Older/heavy-duty engines: a=0.40, b=0.05, c=0.0020
                    </small>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Engine Power Data Entry</h2>
            <table class="data-table" id="engineCurveTable">
                <thead>
                    <tr>
                        <th>RPM</th>
                        <th>Torque (Nm)</th>
                        <th>Power (HP)</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="engineCurveBody">
                    <!-- Rows generated by JavaScript -->
                </tbody>
            </table>
            <div class="table-actions">
                <button class="btn btn-primary" id="addRowBtn">Add Row</button>
                <button class="btn btn-success" id="updateChartBtn">Update Chart</button>
            </div>
        </div>

        <div class="card">
            <h2>Power & Torque Chart</h2>
            <div class="chart-container">
                <canvas id="powerTorqueChart"></canvas>
            </div>
            <div id="peakValuesDisplay" style="margin-top: 15px; padding: 12px; background-color: var(--background-color); border-radius: 6px;">
                <div style="display: flex; gap: 30px; flex-wrap: wrap;">
                    <div>
                        <strong style="color: #ef4444;">Peak Torque:</strong>
                        <span id="peakTorqueValue">-- Nm</span> @ <span id="peakTorqueRpm">-- RPM</span>
                    </div>
                    <div>
                        <strong style="color: #3b82f6;">Peak Power:</strong>
                        <span id="peakPowerValue">-- HP</span> @ <span id="peakPowerRpm">-- RPM</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Save / Load Configuration</h2>
            <p style="color: var(--text-muted); margin-bottom: 15px;">
                Save your car specifications to a JSON file or load a previously saved configuration.
            </p>
            <div class="table-actions">
                <button class="btn btn-secondary" id="saveCarSpecsBtn">💾 Save to JSON</button>
                <button class="btn btn-secondary" id="loadCarSpecsBtn">📂 Load from JSON</button>
            </div>
        </div>
    `;
    
    // Initialize event listeners and chart
    initializeCarSpecsTab();
}

/**
 * Initialize event listeners and populate data
 */
function initializeCarSpecsTab() {
    populateEngineCurveTable();
    createPowerTorqueChart();
    setupEventListeners();
}

/**
 * Calculate power (HP) from torque (Nm) and RPM
 * @param {number} torque - Torque in Nm
 * @param {number} rpm - Engine RPM
 * @returns {number} Power in HP
 */
function calculatePowerFromTorque(torque, rpm) {
    // Power (HP) = Torque (Nm) × RPM / 7120.8 (conversion factor for Nm to HP)
    // Or equivalently: Power (kW) = Torque × RPM × 2π / 60000, then × 1.341 for HP
    return Math.round((torque * rpm) / 7120.8 * 10) / 10;
}

/**
 * Populate the engine curve table with current data
 */
function populateEngineCurveTable() {
    const car = getCurrentCar();
    const tbody = document.getElementById('engineCurveBody');

    tbody.innerHTML = car.engineCurve.map((point, index) => {
        const calculatedPower = calculatePowerFromTorque(point.torque, point.rpm);
        return `
        <tr data-index="${index}">
            <td><input type="number" class="rpm-input" value="${point.rpm}" min="0" max="15000"></td>
            <td><input type="number" class="torque-input" value="${point.torque}" min="0" max="1500"></td>
            <td class="power-cell">${calculatedPower}</td>
            <td><button class="btn btn-danger btn-sm" onclick="removeEngineCurveRow(${index})">✕</button></td>
        </tr>
    `}).join('');

    // Add event listeners for auto-calculating power
    setupEngineCurveRowListeners();
}

/**
 * Setup event listeners for RPM and torque inputs to auto-calculate power
 */
function setupEngineCurveRowListeners() {
    const rows = document.querySelectorAll('#engineCurveBody tr');
    rows.forEach(row => {
        const rpmInput = row.querySelector('.rpm-input');
        const torqueInput = row.querySelector('.torque-input');
        const powerCell = row.querySelector('.power-cell');

        const updatePower = () => {
            const rpm = parseInt(rpmInput.value) || 0;
            const torque = parseFloat(torqueInput.value) || 0;
            powerCell.textContent = calculatePowerFromTorque(torque, rpm);
        };

        rpmInput.addEventListener('input', updatePower);
        torqueInput.addEventListener('input', updatePower);
    });
}

/**
 * Create or update the power/torque chart
 */
function createPowerTorqueChart() {
    const car = getCurrentCar();
    const ctx = document.getElementById('powerTorqueChart')?.getContext('2d');

    if (!ctx) return;

    // Destroy existing chart if any
    if (powerTorqueChart) {
        powerTorqueChart.destroy();
    }

    // Sort engine curve by RPM for proper line plotting
    const sortedCurve = [...car.engineCurve].sort((a, b) => a.rpm - b.rpm);

    // Create data points as {x, y} for proper linear scaling
    const powerData = sortedCurve.map(p => ({ x: p.rpm, y: p.power }));
    const torqueData = sortedCurve.map(p => ({ x: p.rpm, y: p.torque }));

    powerTorqueChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Power (HP)',
                    data: powerData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'power',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Torque (Nm)',
                    data: torqueData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    yAxisID: 'torque',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Engine RPM'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                power: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Power (HP)',
                        color: '#ef4444'
                    },
                    ticks: { color: '#ef4444' }
                },
                torque: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Torque (Nm)',
                        color: '#2563eb'
                    },
                    ticks: { color: '#2563eb' },
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });

    // Update peak values display
    updatePeakValuesDisplay(car.engineCurve);
}

/**
 * Update the peak torque and power display
 * @param {Array} engineCurve - Array of {rpm, torque, power} objects
 */
function updatePeakValuesDisplay(engineCurve) {
    if (!engineCurve || engineCurve.length === 0) return;

    // Find peak torque and power
    // Use >= to get the highest RPM where peak occurs (end of flat spot if any)
    let peakTorque = { value: 0, rpm: 0 };
    let peakPower = { value: 0, rpm: 0 };

    for (const point of engineCurve) {
        if (point.torque >= peakTorque.value) {
            peakTorque.value = point.torque;
            peakTorque.rpm = point.rpm;
        }
        if (point.power >= peakPower.value) {
            peakPower.value = point.power;
            peakPower.rpm = point.rpm;
        }
    }

    // Update DOM
    const peakTorqueValueEl = document.getElementById('peakTorqueValue');
    const peakTorqueRpmEl = document.getElementById('peakTorqueRpm');
    const peakPowerValueEl = document.getElementById('peakPowerValue');
    const peakPowerRpmEl = document.getElementById('peakPowerRpm');

    if (peakTorqueValueEl) peakTorqueValueEl.textContent = `${peakTorque.value.toFixed(1)} Nm`;
    if (peakTorqueRpmEl) peakTorqueRpmEl.textContent = `${peakTorque.rpm} RPM`;
    if (peakPowerValueEl) peakPowerValueEl.textContent = `${peakPower.value.toFixed(1)} HP`;
    if (peakPowerRpmEl) peakPowerRpmEl.textContent = `${peakPower.rpm} RPM`;
}

/**
 * Setup event listeners for the tab
 */
function setupEventListeners() {
    // Add row button
    document.getElementById('addRowBtn')?.addEventListener('click', addEngineCurveRow);

    // Update chart button
    document.getElementById('updateChartBtn')?.addEventListener('click', updateEngineCurveFromTable);

    // Save/Load buttons
    document.getElementById('saveCarSpecsBtn')?.addEventListener('click', saveCarSpecsToFile);
    document.getElementById('loadCarSpecsBtn')?.addEventListener('click', loadCarSpecsFromFile);

    // Auto-apply changes on input for all form fields
    const autoApplyFields = [
        'carName', 'carMass', 'dragCoeff', 'carWidth', 'carHeight', 'frontalAreaCoeff',
        'rollingResist', 'drivetrainEff', 'tireWidth', 'tireAspect', 'tireRim',
        'idleRpm', 'redlineRpm', 'maxRpm', 'numCylinders', 'bore', 'stroke',
        'fmepA', 'fmepB', 'fmepC'
    ];

    autoApplyFields.forEach(fieldId => {
        document.getElementById(fieldId)?.addEventListener('input', autoApplyCarSpecs);
    });
}

/**
 * Auto-apply car specifications from form inputs (called on every input change)
 */
function autoApplyCarSpecs() {
    const car = getCurrentCar();

    // Get form values
    const width = parseFloat(document.getElementById('carWidth').value) || car.width;
    const height = parseFloat(document.getElementById('carHeight').value) || car.height;
    const frontalAreaCoeff = parseFloat(document.getElementById('frontalAreaCoeff').value) || 0.85;

    const config = {
        name: document.getElementById('carName').value || car.name,
        mass: parseFloat(document.getElementById('carMass').value) || car.mass,
        dragCoefficient: parseFloat(document.getElementById('dragCoeff').value) || car.dragCoefficient,
        width: width,
        height: height,
        frontalAreaCoeff: frontalAreaCoeff,
        frontalArea: width * height * frontalAreaCoeff,
        rollingResistanceCoeff: parseFloat(document.getElementById('rollingResist').value) || car.rollingResistanceCoeff,
        drivetrainEfficiency: parseFloat(document.getElementById('drivetrainEff').value) || car.drivetrainEfficiency,
        tire: {
            width: parseInt(document.getElementById('tireWidth').value) || car.tire.width,
            aspectRatio: parseInt(document.getElementById('tireAspect').value) || car.tire.aspectRatio,
            rimDiameter: parseInt(document.getElementById('tireRim').value) || car.tire.rimDiameter
        },
        engineCurve: car.engineCurve,
        idleRpm: parseInt(document.getElementById('idleRpm').value) || car.idleRpm,
        redlineRpm: parseInt(document.getElementById('redlineRpm').value) || car.redlineRpm,
        maxRpm: parseInt(document.getElementById('maxRpm').value) || car.maxRpm,
        engine: {
            numCylinders: parseInt(document.getElementById('numCylinders').value) || car.engine.numCylinders,
            bore: parseFloat(document.getElementById('bore').value) || car.engine.bore,
            stroke: parseFloat(document.getElementById('stroke').value) || car.engine.stroke,
            fmepA: parseFloat(document.getElementById('fmepA').value) || car.engine.fmepA,
            fmepB: parseFloat(document.getElementById('fmepB').value) || car.engine.fmepB,
            fmepC: parseFloat(document.getElementById('fmepC').value) || car.engine.fmepC
        },
        gearbox: car.gearbox,
        differentialRatio: car.differentialRatio
    };

    const updatedCar = updateCurrentCar(config);

    // Update calculated displays
    document.getElementById('frontalArea').value = (width * height * frontalAreaCoeff).toFixed(2);
    document.getElementById('wheelRadiusDisplay').textContent = `${(updatedCar.wheelRadius * 1000).toFixed(1)} mm`;
    document.getElementById('displacement').value = calculateDisplacementCc(updatedCar.engine);
}

/**
 * Sync table inputs to car engine curve data (without updating chart)
 */
function syncTableToEngineCurve() {
    const car = getCurrentCar();
    const rows = document.querySelectorAll('#engineCurveBody tr');

    if (rows.length > 0) {
        car.engineCurve = Array.from(rows).map(row => {
            const rpm = parseInt(row.querySelector('.rpm-input').value) || 0;
            const torque = parseFloat(row.querySelector('.torque-input').value) || 0;
            return {
                rpm,
                torque,
                power: calculatePowerFromTorque(torque, rpm)
            };
        });
    }
}

/**
 * Add a new row to the engine curve table
 */
function addEngineCurveRow() {
    // First sync any edits from the table
    syncTableToEngineCurve();

    const car = getCurrentCar();
    const lastRpm = car.engineCurve.length > 0
        ? car.engineCurve[car.engineCurve.length - 1].rpm + 500
        : 1000;
    const defaultTorque = 200;

    car.engineCurve.push({
        rpm: lastRpm,
        torque: defaultTorque,
        power: calculatePowerFromTorque(defaultTorque, lastRpm)
    });
    populateEngineCurveTable();
}

/**
 * Remove a row from the engine curve table
 * @param {number} index - Row index to remove
 */
window.removeEngineCurveRow = function(index) {
    // First sync any edits from the table
    syncTableToEngineCurve();

    const car = getCurrentCar();
    car.engineCurve.splice(index, 1);
    populateEngineCurveTable();
    createPowerTorqueChart();
};

/**
 * Update engine curve data from table inputs and refresh chart
 */
function updateEngineCurveFromTable() {
    const car = getCurrentCar();
    const rows = document.querySelectorAll('#engineCurveBody tr');

    car.engineCurve = Array.from(rows).map(row => {
        const rpm = parseInt(row.querySelector('.rpm-input').value) || 0;
        const torque = parseFloat(row.querySelector('.torque-input').value) || 0;
        return {
            rpm,
            torque,
            power: calculatePowerFromTorque(torque, rpm)
        };
    });

    createPowerTorqueChart();
}



/**
 * Save car specifications to JSON file
 */
function saveCarSpecsToFile() {
    // First apply current form values
    updateEngineCurveFromTable();

    const car = getCurrentCar();

    // Create specs object (excluding transmission data)
    const width = parseFloat(document.getElementById('carWidth').value);
    const height = parseFloat(document.getElementById('carHeight').value);
    const frontalAreaCoeff = parseFloat(document.getElementById('frontalAreaCoeff').value) || 0.85;
    const specs = {
        name: document.getElementById('carName').value,
        mass: parseFloat(document.getElementById('carMass').value),
        dragCoefficient: parseFloat(document.getElementById('dragCoeff').value),
        width: width,
        height: height,
        frontalAreaCoeff: frontalAreaCoeff,
        frontalArea: width * height * frontalAreaCoeff,
        rollingResistanceCoeff: parseFloat(document.getElementById('rollingResist').value),
        drivetrainEfficiency: parseFloat(document.getElementById('drivetrainEff').value),
        tire: {
            width: parseInt(document.getElementById('tireWidth').value),
            aspectRatio: parseInt(document.getElementById('tireAspect').value),
            rimDiameter: parseInt(document.getElementById('tireRim').value)
        },
        engineCurve: car.engineCurve,
        idleRpm: parseInt(document.getElementById('idleRpm').value),
        redlineRpm: parseInt(document.getElementById('redlineRpm').value),
        maxRpm: parseInt(document.getElementById('maxRpm').value),
        engine: {
            numCylinders: parseInt(document.getElementById('numCylinders').value),
            bore: parseFloat(document.getElementById('bore').value),
            stroke: parseFloat(document.getElementById('stroke').value),
            fmepA: parseFloat(document.getElementById('fmepA').value),
            fmepB: parseFloat(document.getElementById('fmepB').value),
            fmepC: parseFloat(document.getElementById('fmepC').value)
        }
    };

    // Generate filename from car name
    const filename = `car_specs_${specs.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

    saveToJsonFile(specs, filename);
}

/**
 * Load car specifications from JSON file
 */
function loadCarSpecsFromFile() {
    loadFromJsonFile((data) => {
        // Validate the data
        const validation = validateCarSpecsData(data);

        if (!validation.valid) {
            alert(`Invalid car specifications file:\n${validation.errors.join('\n')}`);
            return;
        }

        // Merge with current car config (to keep transmission data)
        const car = getCurrentCar();
        const mergedConfig = {
            ...car.toJSON(),
            ...data,
            // Keep existing gearbox and differential if not in loaded data
            gearbox: data.gearbox || car.gearbox,
            differentialRatio: data.differentialRatio || car.differentialRatio
        };

        // Update the car
        updateCurrentCar(mergedConfig);

        // Re-render the tab to show new values
        const container = document.getElementById('car-specs');
        if (container) {
            renderCarSpecsTab(container);
        }

        alert(`Car specifications loaded: ${data.name || 'Unnamed Car'}`);
    });
}
