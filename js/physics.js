/**
 * Physics Engine for Car Acceleration Simulation
 * All units are in SI: meters, seconds, kg, N, W
 * Speeds are converted from km/h to m/s internally
 */

// Constants
export const GRAVITY = 9.81; // m/s²
export const AIR_DENSITY = 1.225; // kg/m³ at sea level

/**
 * Convert km/h to m/s
 * @param {number} kmh - Speed in km/h
 * @returns {number} Speed in m/s
 */
export function kmhToMs(kmh) {
    return kmh / 3.6;
}

/**
 * Convert m/s to km/h
 * @param {number} ms - Speed in m/s
 * @returns {number} Speed in km/h
 */
export function msToKmh(ms) {
    return ms * 3.6;
}

/**
 * Convert HP to Watts
 * @param {number} hp - Power in HP
 * @returns {number} Power in Watts
 */
export function hpToWatts(hp) {
    return hp * 745.7;
}

/**
 * Convert Watts to HP
 * @param {number} watts - Power in Watts
 * @returns {number} Power in HP
 */
export function wattsToHp(watts) {
    return watts / 745.7;
}

/**
 * Convert RPM to rad/s
 * @param {number} rpm - Angular velocity in RPM
 * @returns {number} Angular velocity in rad/s
 */
export function rpmToRadS(rpm) {
    return rpm * (2 * Math.PI / 60);
}

/**
 * Calculate wheel radius from tire dimensions
 * Tire format: width/aspectRatio Rrim (e.g., 225/50 R17)
 * @param {number} width - Tire width in mm
 * @param {number} aspectRatio - Aspect ratio (percentage)
 * @param {number} rimDiameter - Rim diameter in inches
 * @returns {number} Wheel radius in meters
 */
export function calculateWheelRadius(width, aspectRatio, rimDiameter) {
    const sidewallHeight = (width * aspectRatio / 100) / 1000; // Convert to meters
    const rimRadius = (rimDiameter * 25.4 / 1000) / 2; // Convert inches to meters, then radius
    return rimRadius + sidewallHeight;
}

/**
 * Calculate frontal area estimation
 * @param {number} width - Vehicle width in meters
 * @param {number} height - Vehicle height in meters
 * @returns {number} Estimated frontal area in m²
 */
export function calculateFrontalArea(width, height) {
    // Typical coefficient is around 0.8-0.85 for cars
    return width * height * 0.85;
}

/**
 * Calculate aerodynamic drag force
 * Fd = 0.5 * ρ * Cd * A * v²
 * @param {number} velocity - Vehicle velocity in m/s
 * @param {number} cd - Drag coefficient
 * @param {number} frontalArea - Frontal area in m²
 * @returns {number} Drag force in N
 */
export function calculateAeroDrag(velocity, cd, frontalArea) {
    return 0.5 * AIR_DENSITY * cd * frontalArea * velocity * velocity;
}

/**
 * Calculate rolling resistance force
 * Fr = Crr * m * g
 * @param {number} mass - Vehicle mass in kg
 * @param {number} crr - Rolling resistance coefficient (typically 0.01-0.015 for car tires)
 * @returns {number} Rolling resistance force in N
 */
export function calculateRollingResistance(mass, crr) {
    return crr * mass * GRAVITY;
}

/**
 * Calculate total gear ratio (gearbox * differential)
 * @param {number} gearRatio - Current gear ratio
 * @param {number} differentialRatio - Differential ratio
 * @returns {number} Total gear ratio
 */
export function calculateTotalGearRatio(gearRatio, differentialRatio) {
    return gearRatio * differentialRatio;
}

/**
 * Calculate wheel torque from engine torque
 * @param {number} engineTorque - Engine torque in Nm
 * @param {number} totalGearRatio - Total gear ratio
 * @param {number} drivetrainEfficiency - Drivetrain efficiency (typically 0.85-0.95)
 * @returns {number} Wheel torque in Nm
 */
export function calculateWheelTorque(engineTorque, totalGearRatio, drivetrainEfficiency = 0.88) {
    return engineTorque * totalGearRatio * drivetrainEfficiency;
}

/**
 * Calculate tractive force at wheels
 * @param {number} wheelTorque - Wheel torque in Nm
 * @param {number} wheelRadius - Wheel radius in meters
 * @returns {number} Tractive force in N
 */
export function calculateTractiveForce(wheelTorque, wheelRadius) {
    return wheelTorque / wheelRadius;
}

/**
 * Calculate engine RPM from vehicle speed
 * @param {number} velocityMs - Vehicle velocity in m/s
 * @param {number} wheelRadius - Wheel radius in meters
 * @param {number} totalGearRatio - Total gear ratio
 * @returns {number} Engine RPM
 */
export function calculateEngineRpm(velocityMs, wheelRadius, totalGearRatio) {
    const wheelAngularVelocity = velocityMs / wheelRadius; // rad/s
    const engineAngularVelocity = wheelAngularVelocity * totalGearRatio;
    return engineAngularVelocity * 60 / (2 * Math.PI);
}

/**
 * Calculate vehicle speed from engine RPM
 * @param {number} rpm - Engine RPM
 * @param {number} wheelRadius - Wheel radius in meters
 * @param {number} totalGearRatio - Total gear ratio
 * @returns {number} Vehicle velocity in m/s
 */
export function calculateVelocityFromRpm(rpm, wheelRadius, totalGearRatio) {
    const engineAngularVelocity = rpmToRadS(rpm);
    const wheelAngularVelocity = engineAngularVelocity / totalGearRatio;
    return wheelAngularVelocity * wheelRadius;
}

/**
 * Calculate net acceleration
 * a = (Ftractive - Fdrag - Frolling) / m
 * @param {number} tractiveForce - Tractive force in N
 * @param {number} dragForce - Aerodynamic drag force in N
 * @param {number} rollingResistance - Rolling resistance force in N
 * @param {number} mass - Vehicle mass in kg
 * @returns {number} Acceleration in m/s²
 */
export function calculateAcceleration(tractiveForce, dragForce, rollingResistance, mass) {
    const netForce = tractiveForce - dragForce - rollingResistance;
    return netForce / mass;
}

/**
 * Interpolate torque from engine curve
 * @param {Array} torqueCurve - Array of {rpm, torque} objects
 * @param {number} rpm - Current RPM
 * @returns {number} Interpolated torque in Nm
 */
export function interpolateTorque(torqueCurve, rpm) {
    if (torqueCurve.length === 0) return 0;

    // Sort by RPM
    const sorted = [...torqueCurve].sort((a, b) => a.rpm - b.rpm);

    // Below minimum RPM
    if (rpm <= sorted[0].rpm) return sorted[0].torque;

    // Above maximum RPM
    if (rpm >= sorted[sorted.length - 1].rpm) return sorted[sorted.length - 1].torque;

    // Find interpolation points
    for (let i = 0; i < sorted.length - 1; i++) {
        if (rpm >= sorted[i].rpm && rpm <= sorted[i + 1].rpm) {
            const ratio = (rpm - sorted[i].rpm) / (sorted[i + 1].rpm - sorted[i].rpm);
            return sorted[i].torque + ratio * (sorted[i + 1].torque - sorted[i].torque);
        }
    }

    return 0;
}

/**
 * Interpolate power from engine curve
 * @param {Array} powerCurve - Array of {rpm, power} objects (power in HP)
 * @param {number} rpm - Current RPM
 * @returns {number} Interpolated power in HP
 */
export function interpolatePower(powerCurve, rpm) {
    if (powerCurve.length === 0) return 0;

    const sorted = [...powerCurve].sort((a, b) => a.rpm - b.rpm);

    if (rpm <= sorted[0].rpm) return sorted[0].power;
    if (rpm >= sorted[sorted.length - 1].rpm) return sorted[sorted.length - 1].power;

    for (let i = 0; i < sorted.length - 1; i++) {
        if (rpm >= sorted[i].rpm && rpm <= sorted[i + 1].rpm) {
            const ratio = (rpm - sorted[i].rpm) / (sorted[i + 1].rpm - sorted[i].rpm);
            return sorted[i].power + ratio * (sorted[i + 1].power - sorted[i].power);
        }
    }

    return 0;
}

/**
 * Calculate engine displacement (Vd) in m³
 * Vd = n_cylinders * π * bore² * stroke / 4
 * @param {number} numCylinders - Number of cylinders
 * @param {number} boreMm - Bore diameter in mm
 * @param {number} strokeMm - Stroke length in mm
 * @returns {number} Engine displacement in m³
 */
export function calculateEngineDisplacement(numCylinders, boreMm, strokeMm) {
    // Convert mm to m
    const boreM = boreMm / 1000;
    const strokeM = strokeMm / 1000;
    return numCylinders * Math.PI * boreM * boreM * strokeM / 4;
}

/**
 * Calculate piston average speed (Up) in m/s
 * Up = 2 * rpm * stroke / 60000 (with rpm in rev/min and stroke in mm)
 * @param {number} rpm - Engine RPM
 * @param {number} strokeMm - Stroke length in mm
 * @returns {number} Piston average speed in m/s
 */
export function calculatePistonSpeed(rpm, strokeMm) {
    return 2 * rpm * strokeMm / 60000;
}

/**
 * Calculate Friction Mean Effective Pressure (FMEP) in bar
 * FMEP = a + b*Up + c*Up²
 * @param {number} pistonSpeed - Piston average speed in m/s
 * @param {number} a - Constant term (bar), typically 0.2-0.4
 * @param {number} b - Linear coefficient (bar/(m/s)), typically 0.02-0.05
 * @param {number} c - Quadratic coefficient (bar/(m/s)²), typically 0.0005-0.002
 * @returns {number} FMEP in bar
 */
export function calculateFMEP(pistonSpeed, a, b, c) {
    return a + b * pistonSpeed + c * pistonSpeed * pistonSpeed;
}

/**
 * Calculate engine friction torque in Nm
 * T_friction = (FMEP * Vd) / (4 * π)
 * Note: FMEP must be converted from bar to Pa (1 bar = 100000 Pa)
 * @param {number} fmepBar - FMEP in bar
 * @param {number} displacementM3 - Engine displacement in m³
 * @returns {number} Friction torque in Nm (positive value representing loss)
 */
export function calculateFrictionTorque(fmepBar, displacementM3) {
    const fmepPa = fmepBar * 100000; // Convert bar to Pa
    return (fmepPa * displacementM3) / (4 * Math.PI);
}

/**
 * Calculate net engine torque (combustion - friction)
 * @param {number} combustionTorque - Torque from combustion in Nm
 * @param {number} frictionTorque - Friction torque loss in Nm
 * @returns {number} Net engine torque in Nm
 */
export function calculateNetEngineTorque(combustionTorque, frictionTorque) {
    return combustionTorque - frictionTorque;
}

/**
 * Determine optimal gear for given speed
 * @param {number} velocityMs - Current velocity in m/s
 * @param {number} wheelRadius - Wheel radius in meters
 * @param {Array} gearRatios - Array of gear ratios
 * @param {number} differentialRatio - Differential ratio
 * @param {number} maxRpm - Maximum engine RPM
 * @param {number} optimalRpm - Optimal RPM for power (typically peak power RPM)
 * @returns {number} Optimal gear index (0-based)
 */
export function determineOptimalGear(velocityMs, wheelRadius, gearRatios, differentialRatio, maxRpm, optimalRpm) {
    let bestGear = 0;
    let bestRpmDiff = Infinity;

    for (let i = 0; i < gearRatios.length; i++) {
        const totalRatio = gearRatios[i] * differentialRatio;
        const rpm = calculateEngineRpm(velocityMs, wheelRadius, totalRatio);

        // Skip if RPM exceeds max
        if (rpm > maxRpm) continue;

        // Find gear closest to optimal RPM without exceeding max
        const rpmDiff = Math.abs(rpm - optimalRpm);
        if (rpmDiff < bestRpmDiff && rpm > 1000) { // Minimum 1000 RPM
            bestRpmDiff = rpmDiff;
            bestGear = i;
        }
    }

    return bestGear;
}

