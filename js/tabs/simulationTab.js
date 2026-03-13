/**
 * Simulation Tab - Tab 3
 * Handles simulation controls and real-time plotting
 */

import { getCurrentCar } from '../carModel.js';
import {
    kmhToMs, msToKmh, hpToWatts,
    calculateAeroDrag, calculateRollingResistance,
    calculateEngineRpm, calculateTotalGearRatio,
    calculateWheelTorque, calculateTractiveForce,
    calculateAcceleration, interpolateTorque, interpolatePower,
    calculateEngineDisplacement, calculatePistonSpeed,
    calculateFMEP, calculateFrictionTorque
} from '../physics.js';

// Simulation state
let simulationState = {
    running: false,
    paused: false,
    animationId: null,
    data: [],
    startTime: 0,
    currentTime: 0
};

// Best results for each end condition type
// Each entry stores an array of up to 5 best results, sorted by performance
// Each result: { targetValue, time, distance, speed, shiftMode, shiftModeLabel, startGear }
let bestResults = {
    speed: [],    // Array of results, sorted by time (ascending)
    distance: [], // Array of results, sorted by time (ascending)
    time: []      // Array of results, sorted by distance (descending)
};

// Maximum number of best results to keep
const MAX_BEST_RESULTS = 5;

// Last simulation result (for comparison with best)
let lastResult = null;

// Previous best result (captured before adding new result, for delta calculations)
let previousBest = null;

// Best run data for chart comparison (stores arrays of simulation data for all 5 best results)
let bestRunData = {
    speed: [],      // Array of up to 5 simulation data arrays
    distance: [],   // Array of up to 5 simulation data arrays
    time: []        // Array of up to 5 simulation data arrays
};

// Index of the selected result for comparison (0 = best, 1 = second best, etc.)
let selectedResultIndex = {
    speed: 0,
    distance: 0,
    time: 0
};

// Whether to show comparison with selected result on charts
let showBestRunComparison = false;

// Charts
let charts = {
    speed: null,
    distance: null,
    acceleration: null,
    gear: null,
    rpm: null,
    power: null,
    torque: null,
    combustionTorque: null,
    frictionTorque: null,
    tractiveForce: null,
    rollingResistance: null,
    aeroDrag: null
};

// Flag to track if tab has been rendered
let tabRendered = false;

// UI settings state (persisted across tab switches)
let uiSettings = {
    startSpeed: 0,
    startGear: 0,
    endCondition: 'speed',
    targetValue: 100,
    autoShift: 'redline',
    timeStep: 20
};

// Last status display values
let lastStatusDisplay = {
    time: '0.00 s',
    speed: '0.0 km/h',
    distance: '0.0 m',
    accel: '0.00 m/s²',
    rpm: '0',
    gear: '-'
};

/**
 * Render the simulation tab
 * @param {HTMLElement} container - Container element
 */
export function renderSimulationTab(container) {
    // Note: UI state is saved by the capture-phase click listener when leaving the tab
    // (see document.addEventListener('click', ..., true) below)

    const car = getCurrentCar();

    container.innerHTML = `
        <div class="card">
            <h2>Simulation Settings</h2>
            <div class="simulation-controls">
                <div class="form-group">
                    <label for="startSpeed">Initial Speed (km/h)</label>
                    <input type="number" id="startSpeed" value="0" min="0" max="300">
                </div>
                <div class="form-group">
                    <label for="startGear">Starting Gear</label>
                    <select id="startGear">
                        ${car.gearbox.names.map((name, i) =>
                            `<option value="${i}">${name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="endCondition">End Condition</label>
                    <select id="endCondition">
                        <option value="speed">Target Speed</option>
                        <option value="distance">Target Distance</option>
                        <option value="time">Target Time</option>
                    </select>
                </div>
                <div class="form-group" id="targetValueGroup">
                    <label for="targetValue" id="targetValueLabel">Target Speed (km/h)</label>
                    <input type="number" id="targetValue" value="100" min="0">
                </div>
                <div class="form-group">
                    <label for="autoShift">Gear Shifting</label>
                    <select id="autoShift">
                        <option value="redline">Automatic (at redline)</option>
                        <option value="maxRevs">Automatic (at max revs)</option>
                        <option value="maxTorque">Automatic (max torque)</option>
                        <option value="maxPower">Automatic (max power)</option>
                        <option value="optimalShift">Automatic (optimal shift)</option>
                        <option value="manual">Manual (stay in gear)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="timeStep">Simulation Precision (ms)</label>
                    <select id="timeStep">
                        <option value="10">10ms (High)</option>
                        <option value="20" selected>20ms (Normal)</option>
                        <option value="50">50ms (Fast)</option>
                    </select>
                </div>
            </div>
            <div class="flex-center">
                <button class="btn btn-success" id="startSimBtn">▶ Start Simulation</button>
                <button class="btn btn-secondary" id="pauseSimBtn" disabled>⏸ Pause</button>
                <button class="btn btn-danger" id="resetSimBtn">⟲ Reset</button>
            </div>
        </div>

        <div class="card">
            <h2>Simulation Status</h2>
            <p id="statusSettingsDescription" style="color: #888; margin-bottom: 12px; font-size: 0.9em;">
                Configure settings and run a simulation.
            </p>
            <div class="simulation-status" id="simulationStatus">
                <div class="status-item">
                    <span>Time:</span>
                    <span class="status-value" id="statusTime">0.00 s</span>
                </div>
                <div class="status-item">
                    <span>Speed:</span>
                    <span class="status-value" id="statusSpeed">0.0 km/h</span>
                </div>
                <div class="status-item">
                    <span>Distance:</span>
                    <span class="status-value" id="statusDistance">0.0 m</span>
                </div>
                <div class="status-item">
                    <span>Acceleration:</span>
                    <span class="status-value" id="statusAccel">0.00 m/s²</span>
                </div>
                <div class="status-item">
                    <span>Engine RPM:</span>
                    <span class="status-value" id="statusRpm">0</span>
                </div>
                <div class="status-item">
                    <span>Current Gear:</span>
                    <span class="status-value" id="statusGear">-</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>Best Results</h2>
            <div id="bestResultsContainer">
                <p style="color: #888;">No best results yet. Run a simulation to record results.</p>
            </div>
        </div>

        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h2 style="margin: 0;">Real-Time Charts</h2>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <span style="font-size: 0.9em;">Compare with Selected</span>
                    <input type="checkbox" id="compareBestToggle" style="width: 18px; height: 18px; cursor: pointer;">
                </label>
            </div>
            <div class="charts-grid">
                <div class="chart-container">
                    <canvas id="speedChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="distanceChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="accelChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="gearChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="rpmChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="powerChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="torqueChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="combustionTorqueChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="frictionTorqueChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="tractiveForceChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="rollingResistanceChart"></canvas>
                </div>
                <div class="chart-container">
                    <canvas id="aeroDragChart"></canvas>
                </div>
            </div>
        </div>
    `;

    console.log('[SimTab] renderSimulationTab called, tabRendered:', tabRendered);

    // Always set up event listeners first
    setupSimulationEventListeners();
    console.log('[SimTab] Event listeners set up');

    // Create charts and restore state if tab was previously rendered
    if (tabRendered) {
        console.log('[SimTab] Restoring state. simulationState.data length:', simulationState.data.length);
        // Restore UI state first (form values, status display)
        restoreUIState();
        console.log('[SimTab] UI state restored');
        // Then recreate charts with saved data
        recreateChartsWithData();
        console.log('[SimTab] Charts recreated with data');
    } else {
        // First time rendering - create fresh charts
        createSimulationCharts();
        console.log('[SimTab] Fresh charts created');
    }

    tabRendered = true;
    console.log('[SimTab] Render complete');
}

/**
 * Save current UI settings to state
 */
function saveUIState() {
    uiSettings.startSpeed = parseFloat(document.getElementById('startSpeed')?.value) || 0;
    uiSettings.startGear = parseInt(document.getElementById('startGear')?.value) || 0;
    uiSettings.endCondition = document.getElementById('endCondition')?.value || 'speed';
    uiSettings.targetValue = parseFloat(document.getElementById('targetValue')?.value) || 100;
    uiSettings.autoShift = document.getElementById('autoShift')?.value || 'redline';
    uiSettings.timeStep = parseInt(document.getElementById('timeStep')?.value) || 20;
    uiSettings.compareBestToggle = document.getElementById('compareBestToggle')?.checked || false;

    // Save status display values
    lastStatusDisplay.time = document.getElementById('statusTime')?.innerHTML || '0.00 s';
    lastStatusDisplay.speed = document.getElementById('statusSpeed')?.innerHTML || '0.0 km/h';
    lastStatusDisplay.distance = document.getElementById('statusDistance')?.innerHTML || '0.0 m';
    lastStatusDisplay.accel = document.getElementById('statusAccel')?.textContent || '0.00 m/s²';
    lastStatusDisplay.rpm = document.getElementById('statusRpm')?.textContent || '0';
    lastStatusDisplay.gear = document.getElementById('statusGear')?.textContent || '-';

    // Save status settings description
    const descElement = document.getElementById('statusSettingsDescription');
    if (descElement) {
        lastStatusDisplay.settingsDescription = descElement.textContent;
        lastStatusDisplay.settingsDescriptionColor = descElement.style.color;
    }
}

/**
 * Restore UI settings from state
 */
function restoreUIState() {
    // Restore form values
    const startSpeedEl = document.getElementById('startSpeed');
    const startGearEl = document.getElementById('startGear');
    const endConditionEl = document.getElementById('endCondition');
    const targetValueEl = document.getElementById('targetValue');
    const autoShiftEl = document.getElementById('autoShift');
    const timeStepEl = document.getElementById('timeStep');
    const compareBestToggleEl = document.getElementById('compareBestToggle');

    if (startSpeedEl) startSpeedEl.value = uiSettings.startSpeed;
    if (startGearEl) startGearEl.value = uiSettings.startGear;
    if (endConditionEl) endConditionEl.value = uiSettings.endCondition;
    if (targetValueEl) targetValueEl.value = uiSettings.targetValue;
    if (autoShiftEl) autoShiftEl.value = uiSettings.autoShift;
    if (timeStepEl) timeStepEl.value = uiSettings.timeStep;
    if (compareBestToggleEl) compareBestToggleEl.checked = uiSettings.compareBestToggle || false;

    // Update target label based on end condition
    updateTargetLabelOnly(uiSettings.endCondition);

    // Restore status display (use optional chaining to prevent errors)
    const statusTime = document.getElementById('statusTime');
    const statusSpeed = document.getElementById('statusSpeed');
    const statusDistance = document.getElementById('statusDistance');
    const statusAccel = document.getElementById('statusAccel');
    const statusRpm = document.getElementById('statusRpm');
    const statusGear = document.getElementById('statusGear');

    if (statusTime) statusTime.innerHTML = lastStatusDisplay.time;
    if (statusSpeed) statusSpeed.innerHTML = lastStatusDisplay.speed;
    if (statusDistance) statusDistance.innerHTML = lastStatusDisplay.distance;
    if (statusAccel) statusAccel.textContent = lastStatusDisplay.accel;
    if (statusRpm) statusRpm.textContent = lastStatusDisplay.rpm;
    if (statusGear) statusGear.textContent = lastStatusDisplay.gear;

    // Restore status settings description
    const descElement = document.getElementById('statusSettingsDescription');
    if (descElement && lastStatusDisplay.settingsDescription) {
        descElement.textContent = lastStatusDisplay.settingsDescription;
        descElement.style.color = lastStatusDisplay.settingsDescriptionColor || '#888';
    }

    // Restore button states
    const startBtn = document.getElementById('startSimBtn');
    const pauseBtn = document.getElementById('pauseSimBtn');
    if (simulationState.running && startBtn && pauseBtn) {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        if (simulationState.paused) {
            pauseBtn.textContent = '▶ Resume';
        } else {
            pauseBtn.textContent = '⏸ Pause';
        }
    }

    // Restore best result display
    updateBestResultDisplay();
}

/**
 * Update target label without changing the value
 */
function updateTargetLabelOnly(condition) {
    const label = document.getElementById('targetValueLabel');
    if (!label) return;

    switch(condition) {
        case 'speed':
            label.textContent = 'Target Speed (km/h)';
            break;
        case 'distance':
            label.textContent = 'Target Distance (m)';
            break;
        case 'time':
            label.textContent = 'Target Time (s)';
            break;
    }
}

/**
 * Recreate charts with existing simulation data
 */
function recreateChartsWithData() {
    // createSimulationCharts handles destroying existing charts
    createSimulationCharts();

    // Repopulate with existing data
    if (simulationState.data && simulationState.data.length > 0) {
        simulationState.data.forEach(dataPoint => {
            addDataPointToCharts(dataPoint);
        });

        // Update all charts once after loading all data
        Object.keys(charts).forEach(key => {
            if (charts[key]) charts[key].update('none');
        });
    }

    // Load best run data for comparison
    loadBestRunDataToCharts();
}

/**
 * Add a single data point to all charts (without animation or update)
 */
function addDataPointToCharts(dataPoint) {
    const timeLabel = dataPoint.time.toFixed(2);

    if (charts.speed) {
        charts.speed.data.labels.push(timeLabel);
        charts.speed.data.datasets[0].data.push(dataPoint.speed);
    }

    if (charts.distance) {
        charts.distance.data.labels.push(timeLabel);
        charts.distance.data.datasets[0].data.push(dataPoint.position);
    }

    if (charts.acceleration) {
        charts.acceleration.data.labels.push(timeLabel);
        charts.acceleration.data.datasets[0].data.push(dataPoint.acceleration);
    }

    if (charts.gear) {
        charts.gear.data.labels.push(timeLabel);
        charts.gear.data.datasets[0].data.push(dataPoint.gear);
    }

    if (charts.rpm) {
        charts.rpm.data.labels.push(timeLabel);
        charts.rpm.data.datasets[0].data.push(dataPoint.rpm);
    }

    if (charts.power) {
        charts.power.data.labels.push(timeLabel);
        charts.power.data.datasets[0].data.push(dataPoint.enginePower);
    }

    if (charts.torque) {
        charts.torque.data.labels.push(timeLabel);
        charts.torque.data.datasets[0].data.push(dataPoint.engineTorque);
    }

    if (charts.combustionTorque) {
        charts.combustionTorque.data.labels.push(timeLabel);
        charts.combustionTorque.data.datasets[0].data.push(dataPoint.combustionTorque);
    }

    if (charts.frictionTorque) {
        charts.frictionTorque.data.labels.push(timeLabel);
        charts.frictionTorque.data.datasets[0].data.push(dataPoint.frictionTorque);
    }

    if (charts.tractiveForce) {
        charts.tractiveForce.data.labels.push(timeLabel);
        charts.tractiveForce.data.datasets[0].data.push(dataPoint.tractiveForce);
    }

    if (charts.rollingResistance) {
        charts.rollingResistance.data.labels.push(timeLabel);
        charts.rollingResistance.data.datasets[0].data.push(dataPoint.rollingResistance);
    }

    if (charts.aeroDrag) {
        charts.aeroDrag.data.labels.push(timeLabel);
        charts.aeroDrag.data.datasets[0].data.push(dataPoint.aeroDrag);
    }
}

// Save state when leaving the tab
window.addEventListener('beforeunload', saveUIState);

/**
 * Called by app.js before switching away from the simulation tab
 * This ensures state is saved reliably before the DOM is replaced
 */
export function onLeaveSimulationTab() {
    console.log('[SimTab] onLeaveSimulationTab called, tabRendered:', tabRendered);
    if (tabRendered) {
        saveUIState();
        console.log('[SimTab] State saved. simulationState.data length:', simulationState.data.length);
        console.log('[SimTab] uiSettings:', JSON.stringify(uiSettings));

        // Destroy all charts before the DOM is replaced
        // This prevents "Canvas is already in use" errors
        Object.keys(charts).forEach(key => {
            if (charts[key]) {
                charts[key].destroy();
                charts[key] = null;
            }
        });
        console.log('[SimTab] Charts destroyed');
    }
}

/**
 * Setup event listeners
 */
function setupSimulationEventListeners() {
    document.getElementById('startSimBtn')?.addEventListener('click', startSimulation);
    document.getElementById('pauseSimBtn')?.addEventListener('click', togglePause);
    document.getElementById('resetSimBtn')?.addEventListener('click', resetSimulation);

    // End condition change
    document.getElementById('endCondition')?.addEventListener('change', (e) => {
        updateTargetLabel(e.target.value);
        updateBestResultDisplay(); // Show best result for new end condition
        // Load best run data for the new condition
        loadBestRunDataToCharts();
    });

    // Target value change - reset best result if value changed
    document.getElementById('targetValue')?.addEventListener('change', () => {
        resetBestResultForCondition();
    });

    // Compare with best toggle
    document.getElementById('compareBestToggle')?.addEventListener('change', (e) => {
        showBestRunComparison = e.target.checked;
        if (showBestRunComparison) {
            // Load best run data (this ensures labels are extended if needed)
            loadBestRunDataToCharts();
        }
        toggleBestRunVisibility();
    });
}

/**
 * Update target value label based on end condition
 */
function updateTargetLabel(condition) {
    const label = document.getElementById('targetValueLabel');
    const input = document.getElementById('targetValue');

    switch(condition) {
        case 'speed':
            label.textContent = 'Target Speed (km/h)';
            input.value = 100;
            break;
        case 'distance':
            label.textContent = 'Target Distance (m)';
            input.value = 400;
            break;
        case 'time':
            label.textContent = 'Target Time (s)';
            input.value = 10;
            break;
    }
}

/**
 * Synchronized tooltip plugin for all simulation charts
 */
const syncTooltipPlugin = {
    id: 'syncTooltip',
    afterEvent(chart, args) {
        const event = args.event;
        if (event.type === 'mousemove' || event.type === 'mouseout') {
            const chartKeys = Object.keys(charts).filter(k => charts[k] && charts[k] !== chart);

            if (event.type === 'mouseout') {
                // Hide tooltips on all other charts
                chartKeys.forEach(key => {
                    const otherChart = charts[key];
                    if (otherChart && otherChart.tooltip) {
                        otherChart.tooltip.setActiveElements([], { x: 0, y: 0 });
                        otherChart.update('none');
                    }
                });
            } else {
                // Find the data index at the current x position
                const elements = chart.getElementsAtEventForMode(args.event, 'index', { intersect: false }, false);
                if (elements.length > 0) {
                    const dataIndex = elements[0].index;

                    // Sync tooltips on all other charts
                    chartKeys.forEach(key => {
                        const otherChart = charts[key];
                        if (otherChart && otherChart.data.datasets[0].data.length > dataIndex) {
                            const meta = otherChart.getDatasetMeta(0);
                            if (meta.data[dataIndex]) {
                                otherChart.tooltip.setActiveElements(
                                    [{ datasetIndex: 0, index: dataIndex }],
                                    { x: meta.data[dataIndex].x, y: meta.data[dataIndex].y }
                                );
                                otherChart.update('none');
                            }
                        }
                    });
                }
            }
        }
    }
};

/**
 * Helper to safely destroy a chart on a canvas element
 * Uses Chart.getChart() to find any existing chart instance
 */
function destroyChartOnCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        // Get existing chart instance from Chart.js registry
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
    }
}

/**
 * Create simulation charts
 */
function createSimulationCharts() {
    // First, destroy any existing charts on all canvases
    const canvasIds = [
        'speedChart', 'distanceChart', 'accelChart', 'gearChart',
        'rpmChart', 'powerChart', 'torqueChart', 'combustionTorqueChart',
        'frictionTorqueChart', 'tractiveForceChart', 'rollingResistanceChart', 'aeroDragChart'
    ];
    canvasIds.forEach(id => destroyChartOnCanvas(id));

    // Also clear our chart references
    Object.keys(charts).forEach(key => {
        charts[key] = null;
    });

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: {
            mode: 'index',
            intersect: false
        },
        scales: {
            x: {
                title: { display: true, text: 'Time (s)' },
                min: 0
            }
        },
        plugins: {
            legend: {
                display: showBestRunComparison
            },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false
            }
        }
    };

    // Helper to create selected run dataset config (for comparison)
    const createSelectedRunDataset = (color) => ({
        label: 'Selected',
        data: [],
        borderColor: color,
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.2,
        hidden: !showBestRunComparison,
        pointRadius: 0
    });

    // Speed chart
    const speedCtx = document.getElementById('speedChart')?.getContext('2d');
    if (speedCtx) {
        if (charts.speed) charts.speed.destroy();
        charts.speed = new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#1e40af')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Speed (km/h)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Distance chart
    const distanceCtx = document.getElementById('distanceChart')?.getContext('2d');
    if (distanceCtx) {
        if (charts.distance) charts.distance.destroy();
        charts.distance = new Chart(distanceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#0891b2',
                        backgroundColor: 'rgba(8, 145, 178, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#0e7490')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Distance (m)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Acceleration chart
    const accelCtx = document.getElementById('accelChart')?.getContext('2d');
    if (accelCtx) {
        if (charts.acceleration) charts.acceleration.destroy();
        charts.acceleration = new Chart(accelCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#15803d')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Acceleration (m/s²)' } }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Gear chart
    const gearCtx = document.getElementById('gearChart')?.getContext('2d');
    if (gearCtx) {
        if (charts.gear) charts.gear.destroy();
        charts.gear = new Chart(gearCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        stepped: true,
                        fill: true,
                        pointRadius: 0
                    },
                    { ...createSelectedRunDataset('#b45309'), stepped: true }
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Gear' }, min: 0, max: 8 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // RPM chart
    const rpmCtx = document.getElementById('rpmChart')?.getContext('2d');
    if (rpmCtx) {
        if (charts.rpm) charts.rpm.destroy();
        charts.rpm = new Chart(rpmCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#b91c1c')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'RPM' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Power chart
    const powerCtx = document.getElementById('powerChart')?.getContext('2d');
    if (powerCtx) {
        if (charts.power) charts.power.destroy();
        charts.power = new Chart(powerCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#be185d')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Power (HP)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Torque chart
    const torqueCtx = document.getElementById('torqueChart')?.getContext('2d');
    if (torqueCtx) {
        if (charts.torque) charts.torque.destroy();
        charts.torque = new Chart(torqueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#6d28d9')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Engine Torque (Nm)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Combustion Torque chart
    const combustionTorqueCtx = document.getElementById('combustionTorqueChart')?.getContext('2d');
    if (combustionTorqueCtx) {
        if (charts.combustionTorque) charts.combustionTorque.destroy();
        charts.combustionTorque = new Chart(combustionTorqueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#b91c1c')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Engine Combustion Torque (Nm)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Friction Torque chart
    const frictionTorqueCtx = document.getElementById('frictionTorqueChart')?.getContext('2d');
    if (frictionTorqueCtx) {
        if (charts.frictionTorque) charts.frictionTorque.destroy();
        charts.frictionTorque = new Chart(frictionTorqueCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#7e22ce')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Engine Friction Torque (Nm)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Tractive Force chart
    const tractiveForceCtx = document.getElementById('tractiveForceChart')?.getContext('2d');
    if (tractiveForceCtx) {
        if (charts.tractiveForce) charts.tractiveForce.destroy();
        charts.tractiveForce = new Chart(tractiveForceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#c2410c')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Wheel Tractive Force (N)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Rolling Resistance chart
    const rollingResistanceCtx = document.getElementById('rollingResistanceChart')?.getContext('2d');
    if (rollingResistanceCtx) {
        if (charts.rollingResistance) charts.rollingResistance.destroy();
        charts.rollingResistance = new Chart(rollingResistanceCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#84cc16',
                        backgroundColor: 'rgba(132, 204, 22, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#4d7c0f')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Rolling Resistance (N)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Aero Drag chart
    const aeroDragCtx = document.getElementById('aeroDragChart')?.getContext('2d');
    if (aeroDragCtx) {
        if (charts.aeroDrag) charts.aeroDrag.destroy();
        charts.aeroDrag = new Chart(aeroDragCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current',
                        data: [],
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0
                    },
                    createSelectedRunDataset('#0891b2')
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: { title: { display: true, text: 'Aero Drag (N)' }, min: 0 }
                }
            },
            plugins: [syncTooltipPlugin]
        });
    }

    // Force resize on all charts to ensure proper dimensions
    // This handles cases where charts are created before layout is complete
    requestAnimationFrame(() => {
        Object.keys(charts).forEach(key => {
            if (charts[key]) {
                charts[key].resize();
            }
        });
    });
}

/**
 * Toggle visibility of best run datasets on all charts
 */
function toggleBestRunVisibility() {
    Object.keys(charts).forEach(key => {
        if (charts[key] && charts[key].data.datasets.length > 1) {
            charts[key].data.datasets[1].hidden = !showBestRunComparison;
            // Update legend display
            charts[key].options.plugins.legend.display = showBestRunComparison;
            charts[key].update('none');
        }
    });
}

/**
 * Select a result for chart comparison
 * @param {number} index - The index of the result to select (0-4)
 */
function selectResultForComparison(index) {
    const endCondition = document.getElementById('endCondition')?.value || 'speed';
    selectedResultIndex[endCondition] = index;

    // Reload the best run data with the new selection
    loadBestRunDataToCharts();

    // Update the display to reflect the new selection (highlighting)
    updateBestResultDisplay();
}

// Expose to window for onclick handlers
window.selectResultForComparison = selectResultForComparison;

/**
 * Load best run data to charts based on current end condition and selected index
 */
function loadBestRunDataToCharts() {
    const endCondition = document.getElementById('endCondition')?.value || 'speed';
    const allRunsData = bestRunData[endCondition];
    const selectedIndex = selectedResultIndex[endCondition] || 0;

    // Get the selected run's data (bestRunData now stores an array of runs)
    const bestData = allRunsData && allRunsData[selectedIndex] ? allRunsData[selectedIndex] : null;

    if (!bestData || bestData.length === 0) {
        // No best run data, clear the best run datasets
        Object.keys(charts).forEach(key => {
            if (charts[key] && charts[key].data.datasets.length > 1) {
                charts[key].data.datasets[1].data = [];
            }
        });
        // Update all charts
        Object.keys(charts).forEach(key => {
            if (charts[key]) charts[key].update('none');
        });
        return;
    }

    // Generate time labels from best run data
    const bestRunLabels = bestData.map(d => d.time.toFixed(2));

    // For each chart, ensure labels array is long enough and populate best run data
    Object.keys(charts).forEach(key => {
        if (charts[key]) {
            const chart = charts[key];
            const currentLabelsLength = chart.data.labels.length;
            const bestLabelsLength = bestRunLabels.length;

            // Extend labels array if best run is longer than current labels
            if (bestLabelsLength > currentLabelsLength) {
                for (let i = currentLabelsLength; i < bestLabelsLength; i++) {
                    chart.data.labels.push(bestRunLabels[i]);
                }
            }
        }
    });

    // Populate best run data to each chart's second dataset using simple values
    if (charts.speed && charts.speed.data.datasets.length > 1) {
        charts.speed.data.datasets[1].data = bestData.map(d => d.speed);
    }
    if (charts.distance && charts.distance.data.datasets.length > 1) {
        charts.distance.data.datasets[1].data = bestData.map(d => d.position);
    }
    if (charts.acceleration && charts.acceleration.data.datasets.length > 1) {
        charts.acceleration.data.datasets[1].data = bestData.map(d => d.acceleration);
    }
    if (charts.gear && charts.gear.data.datasets.length > 1) {
        charts.gear.data.datasets[1].data = bestData.map(d => d.gear);
    }
    if (charts.rpm && charts.rpm.data.datasets.length > 1) {
        charts.rpm.data.datasets[1].data = bestData.map(d => d.rpm);
    }
    if (charts.power && charts.power.data.datasets.length > 1) {
        charts.power.data.datasets[1].data = bestData.map(d => d.enginePower);
    }
    if (charts.torque && charts.torque.data.datasets.length > 1) {
        charts.torque.data.datasets[1].data = bestData.map(d => d.engineTorque);
    }
    if (charts.combustionTorque && charts.combustionTorque.data.datasets.length > 1) {
        charts.combustionTorque.data.datasets[1].data = bestData.map(d => d.combustionTorque);
    }
    if (charts.frictionTorque && charts.frictionTorque.data.datasets.length > 1) {
        charts.frictionTorque.data.datasets[1].data = bestData.map(d => d.frictionTorque);
    }
    if (charts.tractiveForce && charts.tractiveForce.data.datasets.length > 1) {
        charts.tractiveForce.data.datasets[1].data = bestData.map(d => d.tractiveForce);
    }
    if (charts.rollingResistance && charts.rollingResistance.data.datasets.length > 1) {
        charts.rollingResistance.data.datasets[1].data = bestData.map(d => d.rollingResistance);
    }
    if (charts.aeroDrag && charts.aeroDrag.data.datasets.length > 1) {
        charts.aeroDrag.data.datasets[1].data = bestData.map(d => d.aeroDrag);
    }

    // Update all charts
    Object.keys(charts).forEach(key => {
        if (charts[key]) charts[key].update('none');
    });
}

/**
 * Start the simulation
 */
function startSimulation() {
    if (simulationState.running && !simulationState.paused) return;

    const car = getCurrentCar();

    if (simulationState.paused) {
        // Resume
        simulationState.paused = false;
        document.getElementById('pauseSimBtn').textContent = '⏸ Pause';
        runSimulationLoop();
        return;
    }

    // Initialize simulation state
    const startSpeed = parseFloat(document.getElementById('startSpeed').value) || 0;
    const startGear = parseInt(document.getElementById('startGear').value) || 0;

    simulationState = {
        running: true,
        paused: false,
        animationId: null,
        data: [],
        startTime: performance.now(),
        currentTime: 0,
        velocity: kmhToMs(startSpeed), // m/s
        position: 0, // m
        gear: startGear,
        lastUpdateTime: performance.now(),
        revLimiterActive: false // Rev limiter cuts power when RPM >= maxRpm
    };

    // Clear charts
    clearCharts();

    // Update the status settings description
    updateStatusSettingsDescription();

    // Enable/disable buttons
    document.getElementById('startSimBtn').disabled = true;
    document.getElementById('pauseSimBtn').disabled = false;

    // Start simulation loop
    runSimulationLoop();
}

/**
 * Find peak torque RPM from engine curve
 * Returns the highest RPM where peak torque occurs (end of flat spot if any)
 * @param {Array} engineCurve - Array of {rpm, torque, power} objects
 * @returns {number} RPM at peak torque
 */
function findPeakTorqueRpm(engineCurve) {
    if (!engineCurve || engineCurve.length === 0) return 3000;

    let peakTorque = 0;
    let peakRpm = engineCurve[0].rpm;

    for (const point of engineCurve) {
        if (point.torque >= peakTorque) {
            peakTorque = point.torque;
            peakRpm = point.rpm;
        }
    }

    return peakRpm;
}

/**
 * Find peak power RPM from engine curve
 * Returns the highest RPM where peak power occurs (end of flat spot if any)
 * @param {Array} engineCurve - Array of {rpm, torque, power} objects
 * @returns {number} RPM at peak power
 */
function findPeakPowerRpm(engineCurve) {
    if (!engineCurve || engineCurve.length === 0) return 5000;

    let peakPower = 0;
    let peakRpm = engineCurve[0].rpm;

    for (const point of engineCurve) {
        if (point.power >= peakPower) {
            peakPower = point.power;
            peakRpm = point.rpm;
        }
    }

    return peakRpm;
}

/**
 * Calculate speed at given RPM
 * @param {number} rpm - Engine RPM
 * @param {number} totalRatio - Total gear ratio
 * @param {number} wheelRadius - Wheel radius in meters
 * @returns {number} Speed in km/h
 */
function calculateSpeedAtRpm(rpm, totalRatio, wheelRadius) {
    const angularVelocity = rpm * (2 * Math.PI / 60);
    const wheelAngularVelocity = angularVelocity / totalRatio;
    const speedMs = wheelAngularVelocity * wheelRadius;
    return msToKmh(speedMs);
}

/**
 * Calculate the optimal shift speed from current gear to next gear
 * Returns the minimum speed where tractive force in current gear <= tractive force in next gear
 * @param {Object} car - Car object
 * @param {number} gearIndex - Current gear index
 * @returns {number|null} Optimal shift speed in km/h, or null if no crossover exists
 */
function calculateOptimalShiftSpeed(car, gearIndex) {
    const numGears = car.getGearCount();

    // Last gear has no next gear to shift to
    if (gearIndex >= numGears - 1) return null;

    const currentTotalRatio = car.getTotalRatio(gearIndex);
    const nextTotalRatio = car.getTotalRatio(gearIndex + 1);

    // Calculate speed ranges for both gears
    const currentMinSpeed = calculateSpeedAtRpm(car.idleRpm, currentTotalRatio, car.wheelRadius);
    const currentMaxSpeed = calculateSpeedAtRpm(car.redlineRpm, currentTotalRatio, car.wheelRadius);
    const nextMinSpeed = calculateSpeedAtRpm(car.idleRpm, nextTotalRatio, car.wheelRadius);
    const nextMaxSpeed = calculateSpeedAtRpm(car.redlineRpm, nextTotalRatio, car.wheelRadius);

    // The overlap range where both gears can operate
    const overlapMinSpeed = Math.max(currentMinSpeed, nextMinSpeed);
    const overlapMaxSpeed = Math.min(currentMaxSpeed, nextMaxSpeed);

    // No overlap means no valid shift point
    if (overlapMinSpeed >= overlapMaxSpeed) return null;

    // Search for the crossover point within the overlap range
    const numSteps = 100;
    const speedStep = (overlapMaxSpeed - overlapMinSpeed) / numSteps;

    for (let speed = overlapMinSpeed; speed <= overlapMaxSpeed; speed += speedStep) {
        const velocityMs = kmhToMs(speed);

        // Calculate RPM and tractive force for current gear
        const currentRpm = calculateEngineRpm(velocityMs, car.wheelRadius, currentTotalRatio);
        const currentEngineTorque = interpolateTorque(car.engineCurve, currentRpm);
        const currentWheelTorque = calculateWheelTorque(currentEngineTorque, currentTotalRatio, car.drivetrainEfficiency);
        const currentTractiveForce = calculateTractiveForce(currentWheelTorque, car.wheelRadius);

        // Calculate RPM and tractive force for next gear
        const nextRpm = calculateEngineRpm(velocityMs, car.wheelRadius, nextTotalRatio);
        const nextEngineTorque = interpolateTorque(car.engineCurve, nextRpm);
        const nextWheelTorque = calculateWheelTorque(nextEngineTorque, nextTotalRatio, car.drivetrainEfficiency);
        const nextTractiveForce = calculateTractiveForce(nextWheelTorque, car.wheelRadius);

        // Found the crossover point
        if (currentTractiveForce <= nextTractiveForce) {
            return speed;
        }
    }

    // No crossover found - current gear always has more tractive force
    return null;
}

/**
 * Check if we should shift to next gear based on shift mode
 * @param {string} shiftMode - Shift mode ('redline', 'maxTorque', 'maxPower', 'optimalShift', 'manual')
 * @param {Object} car - Car object
 * @param {number} currentRpm - Current engine RPM
 * @param {number} currentVelocity - Current velocity in m/s
 * @returns {boolean} True if should shift up
 */
function checkShouldShift(shiftMode, car, currentRpm, currentVelocity) {
    const currentGear = simulationState.gear;
    const nextGear = currentGear + 1;

    if (nextGear >= car.getGearCount()) return false;

    switch (shiftMode) {
        case 'redline':
            // Shift at redline
            return currentRpm >= car.redlineRpm;

        case 'maxRevs':
            // Shift at max revs (max RPM)
            return currentRpm >= car.maxRpm;

        case 'maxTorque':
            // Shift at peak torque RPM
            return currentRpm >= findPeakTorqueRpm(car.engineCurve);

        case 'maxPower':
            // Shift at peak power RPM
            return currentRpm >= findPeakPowerRpm(car.engineCurve);

        case 'optimalShift': {
            // Shift at optimal shift speed, or redline if no optimal point exists
            const optimalShiftSpeed = calculateOptimalShiftSpeed(car, currentGear);
            const currentSpeedKmh = msToKmh(currentVelocity);

            if (optimalShiftSpeed !== null) {
                return currentSpeedKmh >= optimalShiftSpeed;
            } else {
                // Fall back to redline shift
                return currentRpm >= car.redlineRpm;
            }
        }

        case 'manual':
        default:
            return false;
    }
}

/**
 * Run one step of the simulation
 */
function runSimulationLoop() {
    if (!simulationState.running || simulationState.paused) return;

    const car = getCurrentCar();
    const timeStepMs = parseInt(document.getElementById('timeStep').value) || 20;
    const dt = timeStepMs / 1000; // Convert to seconds
    const shiftMode = document.getElementById('autoShift').value;

    // Calculate physics
    const totalRatio = car.getTotalRatio(simulationState.gear);
    const rpm = calculateEngineRpm(simulationState.velocity, car.wheelRadius, totalRatio);

    // Clamp RPM to valid range
    const clampedRpm = Math.max(car.idleRpm, Math.min(rpm, car.maxRpm));

    // Rev limiter logic: cut power at maxRpm, restore at redlineRpm
    if (clampedRpm >= car.maxRpm) {
        simulationState.revLimiterActive = true;
    } else if (clampedRpm < car.redlineRpm) {
        simulationState.revLimiterActive = false;
    }

    // Calculate engine friction torque (always present when engine is spinning)
    const { numCylinders, bore, stroke, fmepA, fmepB, fmepC } = car.engine;
    const engineDisplacement = calculateEngineDisplacement(numCylinders, bore, stroke);
    const pistonSpeed = calculatePistonSpeed(clampedRpm, stroke);
    const fmep = calculateFMEP(pistonSpeed, fmepA, fmepB, fmepC);
    const frictionTorque = calculateFrictionTorque(fmep, engineDisplacement);

    // Get combustion torque and power from curve (or 0 if rev limiter active)
    let combustionTorque, combustionPower;
    if (simulationState.revLimiterActive) {
        // Rev limiter cuts fuel - no combustion output
        combustionTorque = 0;
        combustionPower = 0;
    } else {
        combustionTorque = interpolateTorque(car.engineCurve, clampedRpm);
        combustionPower = interpolatePower(car.engineCurve, clampedRpm);
    }

    // Net engine torque = combustion torque - friction torque
    const engineTorque = combustionTorque - frictionTorque;
    const enginePower = combustionPower; // Power displayed is still combustion power for reference

    // Auto shift if needed (check before updating velocity)
    if (simulationState.gear < car.getGearCount() - 1) {
        const shouldShift = checkShouldShift(shiftMode, car, clampedRpm, simulationState.velocity);
        if (shouldShift) {
            simulationState.gear++;
        }
    }

    // Calculate forces
    const wheelTorque = calculateWheelTorque(engineTorque, totalRatio, car.drivetrainEfficiency);
    const tractiveForce = calculateTractiveForce(wheelTorque, car.wheelRadius);
    const dragForce = calculateAeroDrag(simulationState.velocity, car.dragCoefficient, car.frontalArea);
    const rollingResistance = calculateRollingResistance(car.mass, car.rollingResistanceCoeff);

    // Calculate acceleration
    const acceleration = calculateAcceleration(tractiveForce, dragForce, rollingResistance, car.mass);

    // Update velocity and position (Euler integration)
    simulationState.velocity += acceleration * dt;
    simulationState.velocity = Math.max(0, simulationState.velocity); // No negative velocity
    simulationState.position += simulationState.velocity * dt;
    simulationState.currentTime += dt;

    // Store data point
    const dataPoint = {
        time: simulationState.currentTime,
        speed: msToKmh(simulationState.velocity),
        acceleration: acceleration,
        rpm: clampedRpm,
        gear: simulationState.gear + 1,
        enginePower: enginePower,
        engineTorque: engineTorque,
        combustionTorque: combustionTorque,
        frictionTorque: frictionTorque,
        position: simulationState.position,
        tractiveForce: tractiveForce,
        rollingResistance: rollingResistance,
        aeroDrag: dragForce
    };
    simulationState.data.push(dataPoint);

    // Update UI
    updateStatusDisplay(dataPoint);
    updateCharts(dataPoint);

    // Check end condition
    if (checkEndCondition(dataPoint)) {
        updateBestResult(dataPoint);
        updateStatusDisplay(dataPoint, true); // Show deltas vs best
        stopSimulation();
        return;
    }

    // Schedule next step
    simulationState.animationId = setTimeout(() => {
        requestAnimationFrame(runSimulationLoop);
    }, timeStepMs);
}

/**
 * Check if simulation end condition is met
 */
function checkEndCondition(dataPoint) {
    const endCondition = document.getElementById('endCondition').value;
    const targetValue = parseFloat(document.getElementById('targetValue').value);

    switch(endCondition) {
        case 'speed':
            return dataPoint.speed >= targetValue;
        case 'distance':
            return dataPoint.position >= targetValue;
        case 'time':
            return dataPoint.time >= targetValue;
        default:
            return false;
    }
}

/**
 * Get the label for a shift mode
 */
function getShiftModeLabel(mode) {
    const labels = {
        'redline': 'At Redline',
        'maxRevs': 'At Max Revs',
        'maxTorque': 'Max Torque',
        'maxPower': 'Max Power',
        'optimalShift': 'Optimal Shift',
        'manual': 'Manual'
    };
    return labels[mode] || mode;
}

/**
 * Update the status settings description based on current settings
 */
function updateStatusSettingsDescription() {
    const car = getCurrentCar();
    const endCondition = document.getElementById('endCondition')?.value || 'speed';
    const targetValue = parseFloat(document.getElementById('targetValue')?.value) || 0;
    const shiftMode = document.getElementById('autoShift')?.value || 'redline';
    const startGearIndex = parseInt(document.getElementById('startGear')?.value) || 0;
    const startSpeed = parseFloat(document.getElementById('startSpeed')?.value) || 0;

    // Get the gear name (startGear select values are 0-indexed to car.gearbox.names)
    const startGearName = car.gearbox.names[startGearIndex] || `Gear ${startGearIndex + 1}`;

    // Get end condition description
    let targetDesc;
    switch(endCondition) {
        case 'speed':
            targetDesc = `target speed of ${targetValue.toFixed(0)} km/h`;
            break;
        case 'distance':
            targetDesc = `target distance of ${targetValue.toFixed(0)} m`;
            break;
        case 'time':
            targetDesc = `target time of ${targetValue.toFixed(1)} s`;
            break;
        default:
            targetDesc = 'target';
    }

    // Get shift mode description
    const shiftModeDesc = getShiftModeLabel(shiftMode).toLowerCase();

    // Build the description with initial speed
    const speedDesc = startSpeed > 0 ? `from ${startSpeed.toFixed(0)} km/h ` : '';
    const description = `Simulation result ${speedDesc}for ${targetDesc} with gear shifting at ${shiftModeDesc} and ${startGearName} as the starting gear.`;

    const descElement = document.getElementById('statusSettingsDescription');
    if (descElement) {
        descElement.textContent = description;
        descElement.style.color = '#ccc'; // Brighter color when showing actual settings
    }
}

/**
 * Update best result when simulation ends
 * @param {Object} dataPoint - Final data point of the simulation
 */
function updateBestResult(dataPoint) {
    const car = getCurrentCar();
    const endCondition = document.getElementById('endCondition').value;
    const targetValue = parseFloat(document.getElementById('targetValue').value);
    const shiftMode = document.getElementById('autoShift').value;
    const startGearIndex = parseInt(document.getElementById('startGear').value);
    const startGearName = car.gearbox.names[startGearIndex] || `Gear ${startGearIndex + 1}`;
    const startSpeed = parseFloat(document.getElementById('startSpeed').value) || 0;

    // Get the current results array for this condition
    let results = bestResults[endCondition];

    // Filter to only keep results with the same target value
    results = results.filter(r => r.targetValue === targetValue);

    // Capture the previous best BEFORE adding the new result (for delta calculations)
    previousBest = results.length > 0 ? { ...results[0], endCondition: endCondition } : null;

    // Create result object with all data
    const newResult = {
        targetValue: targetValue,
        time: dataPoint.time,
        distance: dataPoint.position,
        speed: dataPoint.speed,
        shiftMode: shiftMode,
        shiftModeLabel: getShiftModeLabel(shiftMode),
        startGear: startGearName,
        startSpeed: startSpeed
    };

    // Store as last result for comparison
    lastResult = { ...newResult, endCondition: endCondition };

    // Store a unique ID with the result for tracking simulation data
    newResult._simDataId = Date.now();

    // Store the simulation data temporarily
    const simData = simulationState.data && simulationState.data.length > 0
        ? [...simulationState.data]
        : null;

    // Add the new result
    results.push(newResult);

    // Sort by performance (time ascending for speed/distance, distance descending for time)
    if (endCondition === 'time') {
        results.sort((a, b) => b.distance - a.distance);
    } else {
        results.sort((a, b) => a.time - b.time);
    }

    // Keep only top 5
    results = results.slice(0, MAX_BEST_RESULTS);

    // Save back
    bestResults[endCondition] = results;

    // Initialize bestRunData array if needed
    if (!Array.isArray(bestRunData[endCondition]) || bestRunData[endCondition].length === 0) {
        bestRunData[endCondition] = [];
    }

    // Find the index of the new result in the sorted array
    const newResultIndex = results.findIndex(r => r._simDataId === newResult._simDataId);

    // If the result made it into top 5, store its simulation data
    if (newResultIndex !== -1 && simData) {
        // Insert the simulation data at the correct position
        bestRunData[endCondition].splice(newResultIndex, 0, simData);

        // Keep only top 5 simulation data arrays
        bestRunData[endCondition] = bestRunData[endCondition].slice(0, MAX_BEST_RESULTS);

        // Update the charts
        loadBestRunDataToCharts();
    }

    // Always update display
    updateBestResultDisplay();
}

/**
 * Format a difference value with +/- sign and color (inline style)
 */
function formatDiffInline(diff, unit, lowerIsBetter = true) {
    if (Math.abs(diff) < 0.005) {
        return `<span style="color: #888; font-size: 0.85em; margin-left: 6px;">(±0 ${unit})</span>`;
    }
    const isGood = lowerIsBetter ? diff < 0 : diff > 0;
    const color = isGood ? '#22c55e' : '#ef4444';
    const sign = diff > 0 ? '+' : '';
    return `<span style="color: ${color}; font-size: 0.85em; margin-left: 6px;">(${sign}${diff.toFixed(2)} ${unit})</span>`;
}

/**
 * Update the best results display table
 */
function updateBestResultDisplay() {
    const endCondition = document.getElementById('endCondition').value;
    const container = document.getElementById('bestResultsContainer');
    const results = bestResults[endCondition];

    if (!results || results.length === 0) {
        container.innerHTML = `<p style="color: #888;">No best results yet. Run a simulation to record results.</p>`;
        return;
    }

    // Get the target value from the first result (all results have the same target)
    const targetValue = results[0].targetValue;

    // Get column headers and description based on end condition
    let actualHeader, bestHeader, finalHeader, conditionDesc, targetUnit;
    switch(endCondition) {
        case 'speed':
            actualHeader = 'Actual Speed';
            bestHeader = 'Time';
            finalHeader = 'Distance';
            conditionDesc = 'target speed';
            targetUnit = `${targetValue.toFixed(0)} km/h`;
            break;
        case 'distance':
            actualHeader = 'Actual Distance';
            bestHeader = 'Time';
            finalHeader = 'Final Speed';
            conditionDesc = 'target distance';
            targetUnit = `${targetValue.toFixed(0)} m`;
            break;
        case 'time':
            actualHeader = 'Actual Time';
            bestHeader = 'Distance';
            finalHeader = 'Final Speed';
            conditionDesc = 'target time';
            targetUnit = `${targetValue.toFixed(1)} s`;
            break;
    }

    // Medal emojis for top 3
    const medals = ['🥇', '🥈', '🥉'];

    // Get currently selected index, default to 0 if not set
    const currentSelectedIndex = selectedResultIndex[endCondition] || 0;

    let html = `
        <p style="margin-bottom: 10px;">Top 5 best results for ${conditionDesc} of ${targetUnit}</p>
        <table style="width: 100%; text-align: center;">
            <thead>
                <tr>
                    <th style="width: 50px;">Select</th>
                    <th>#</th>
                    <th>Settings</th>
                    <th>${actualHeader}</th>
                    <th>${bestHeader}</th>
                    <th>${finalHeader}</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach((result, index) => {
        const isFirst = index === 0;
        const isSelected = index === currentSelectedIndex;
        const rowStyle = isSelected ? 'background-color: rgba(34, 197, 94, 0.1);' : '';
        const rankDisplay = index < 3 ? medals[index] : index + 1;

        let actualVal, bestVal, finalVal;
        switch(endCondition) {
            case 'speed':
                actualVal = `${result.speed.toFixed(1)} km/h`;
                bestVal = `${result.time.toFixed(2)} s`;
                finalVal = `${result.distance.toFixed(1)} m`;
                break;
            case 'distance':
                actualVal = `${result.distance.toFixed(1)} m`;
                bestVal = `${result.time.toFixed(2)} s`;
                finalVal = `${result.speed.toFixed(1)} km/h`;
                break;
            case 'time':
                actualVal = `${result.time.toFixed(2)} s`;
                bestVal = `${result.distance.toFixed(1)} m`;
                finalVal = `${result.speed.toFixed(1)} km/h`;
                break;
        }

        html += `
            <tr style="${rowStyle}">
                <td>
                    <input type="radio" name="selectedResult" value="${index}"
                           ${isSelected ? 'checked' : ''}
                           onchange="window.selectResultForComparison(${index})"
                           style="width: 16px; height: 16px; cursor: pointer;">
                </td>
                <td>${rankDisplay}</td>
                <td>${result.startSpeed > 0 ? result.startSpeed.toFixed(0) + ' km/h | ' : ''}${result.shiftModeLabel} | ${result.startGear}</td>
                <td>${actualVal}</td>
                <td style="${isFirst ? 'color: #22c55e; font-weight: bold;' : ''}">${bestVal}</td>
                <td>${finalVal}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/**
 * Reset best result for the current end condition when target value changes
 */
function resetBestResultForCondition() {
    const endCondition = document.getElementById('endCondition').value;
    const targetValue = parseFloat(document.getElementById('targetValue').value);

    // Filter to only keep results with the new target value
    // (This effectively clears results when target changes since there won't be any matches)
    if (bestResults[endCondition] && bestResults[endCondition].length > 0) {
        const firstTargetValue = bestResults[endCondition][0].targetValue;
        if (firstTargetValue !== targetValue) {
            bestResults[endCondition] = [];
            // Also clear best run data for this condition
            bestRunData[endCondition] = [];
            // Reset selected index to 0
            selectedResultIndex[endCondition] = 0;
            loadBestRunDataToCharts();
        }
    }

    updateBestResultDisplay();
}

/**
 * Toggle pause state
 */
function togglePause() {
    if (!simulationState.running) return;

    simulationState.paused = !simulationState.paused;

    if (simulationState.paused) {
        document.getElementById('pauseSimBtn').textContent = '▶ Resume';
        if (simulationState.animationId) {
            clearTimeout(simulationState.animationId);
        }
    } else {
        document.getElementById('pauseSimBtn').textContent = '⏸ Pause';
        runSimulationLoop();
    }
}

/**
 * Stop the simulation
 */
function stopSimulation() {
    simulationState.running = false;
    simulationState.paused = false;

    if (simulationState.animationId) {
        clearTimeout(simulationState.animationId);
    }

    document.getElementById('startSimBtn').disabled = false;
    document.getElementById('pauseSimBtn').disabled = true;
    document.getElementById('pauseSimBtn').textContent = '⏸ Pause';
}

/**
 * Reset the simulation
 */
function resetSimulation() {
    stopSimulation();
    simulationState.data = [];
    simulationState.currentTime = 0;
    simulationState.velocity = 0;
    simulationState.position = 0;

    clearCharts();

    // Reset status display
    document.getElementById('statusTime').textContent = '0.00 s';
    document.getElementById('statusSpeed').textContent = '0.0 km/h';
    document.getElementById('statusDistance').textContent = '0.0 m';
    document.getElementById('statusAccel').textContent = '0.00 m/s²';
    document.getElementById('statusRpm').textContent = '0';
    document.getElementById('statusGear').textContent = '-';

    // Reset status settings description
    const descElement = document.getElementById('statusSettingsDescription');
    if (descElement) {
        descElement.textContent = 'Configure settings and run a simulation.';
        descElement.style.color = '#888';
    }

    // Reset best results, last result, and previous best
    const endCondition = document.getElementById('endCondition').value;
    bestResults[endCondition] = [];
    bestRunData[endCondition] = [];
    selectedResultIndex[endCondition] = 0;
    lastResult = null;
    previousBest = null;
    updateBestResultDisplay();
}

/**
 * Update status display
 * @param {Object} dataPoint - Current data point
 * @param {boolean} showDeltas - Whether to show deltas vs previous best result
 */
function updateStatusDisplay(dataPoint, showDeltas = false) {
    const car = getCurrentCar();
    const endCondition = document.getElementById('endCondition')?.value;

    // Calculate deltas against the PREVIOUS best (captured before adding current result)
    // This allows showing improvement even when current run becomes the new best
    let timeDiff = '', speedDiff = '', distDiff = '';
    if (showDeltas && previousBest) {
        const tDiff = dataPoint.time - previousBest.time;
        const sDiff = dataPoint.speed - previousBest.speed;
        const dDiff = dataPoint.position - previousBest.distance;

        // For time: lower is better (for speed/distance targets)
        // For distance: higher is better (for time target)
        // For speed: context-dependent
        if (endCondition === 'time') {
            // In time mode, higher distance is better
            timeDiff = ''; // Time is fixed
            distDiff = formatDiffInline(dDiff, 'm', false);
            speedDiff = formatDiffInline(sDiff, 'km/h', false);
        } else {
            // In speed/distance mode, lower time is better
            timeDiff = formatDiffInline(tDiff, 's', true);
            distDiff = formatDiffInline(dDiff, 'm', true);
            speedDiff = formatDiffInline(sDiff, 'km/h', false);
        }
    }

    document.getElementById('statusTime').innerHTML = `${dataPoint.time.toFixed(2)} s ${timeDiff}`;
    document.getElementById('statusSpeed').innerHTML = `${dataPoint.speed.toFixed(1)} km/h ${speedDiff}`;
    document.getElementById('statusDistance').innerHTML = `${dataPoint.position.toFixed(1)} m ${distDiff}`;
    document.getElementById('statusAccel').textContent = `${dataPoint.acceleration.toFixed(2)} m/s²`;
    document.getElementById('statusRpm').textContent = `${Math.round(dataPoint.rpm)}`;
    document.getElementById('statusGear').textContent = car.gearbox.names[dataPoint.gear - 1] || dataPoint.gear;
}

/**
 * Update charts with new data point
 */
function updateCharts(dataPoint) {
    const timeLabel = dataPoint.time.toFixed(2);

    // Speed chart
    if (charts.speed) {
        charts.speed.data.labels.push(timeLabel);
        charts.speed.data.datasets[0].data.push(dataPoint.speed);
        charts.speed.update('none');
    }

    // Distance chart
    if (charts.distance) {
        charts.distance.data.labels.push(timeLabel);
        charts.distance.data.datasets[0].data.push(dataPoint.position);
        charts.distance.update('none');
    }

    // Acceleration chart
    if (charts.acceleration) {
        charts.acceleration.data.labels.push(timeLabel);
        charts.acceleration.data.datasets[0].data.push(dataPoint.acceleration);
        charts.acceleration.update('none');
    }

    // Gear chart
    if (charts.gear) {
        charts.gear.data.labels.push(timeLabel);
        charts.gear.data.datasets[0].data.push(dataPoint.gear);
        charts.gear.update('none');
    }

    // RPM chart
    if (charts.rpm) {
        charts.rpm.data.labels.push(timeLabel);
        charts.rpm.data.datasets[0].data.push(dataPoint.rpm);
        charts.rpm.update('none');
    }

    // Power chart
    if (charts.power) {
        charts.power.data.labels.push(timeLabel);
        charts.power.data.datasets[0].data.push(dataPoint.enginePower);
        charts.power.update('none');
    }

    // Torque chart
    if (charts.torque) {
        charts.torque.data.labels.push(timeLabel);
        charts.torque.data.datasets[0].data.push(dataPoint.engineTorque);
        charts.torque.update('none');
    }

    // Combustion Torque chart
    if (charts.combustionTorque) {
        charts.combustionTorque.data.labels.push(timeLabel);
        charts.combustionTorque.data.datasets[0].data.push(dataPoint.combustionTorque);
        charts.combustionTorque.update('none');
    }

    // Friction Torque chart
    if (charts.frictionTorque) {
        charts.frictionTorque.data.labels.push(timeLabel);
        charts.frictionTorque.data.datasets[0].data.push(dataPoint.frictionTorque);
        charts.frictionTorque.update('none');
    }

    // Tractive Force chart
    if (charts.tractiveForce) {
        charts.tractiveForce.data.labels.push(timeLabel);
        charts.tractiveForce.data.datasets[0].data.push(dataPoint.tractiveForce);
        charts.tractiveForce.update('none');
    }

    // Rolling Resistance chart
    if (charts.rollingResistance) {
        charts.rollingResistance.data.labels.push(timeLabel);
        charts.rollingResistance.data.datasets[0].data.push(dataPoint.rollingResistance);
        charts.rollingResistance.update('none');
    }

    // Aero Drag chart
    if (charts.aeroDrag) {
        charts.aeroDrag.data.labels.push(timeLabel);
        charts.aeroDrag.data.datasets[0].data.push(dataPoint.aeroDrag);
        charts.aeroDrag.update('none');
    }
}

/**
 * Clear all charts
 */
function clearCharts() {
    for (const key in charts) {
        if (charts[key]) {
            charts[key].data.labels = [];
            charts[key].data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            charts[key].update('none');
        }
    }
}

