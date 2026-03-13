/**
 * Car Model - Defines the car data structure and default values
 */

import { calculateWheelRadius, calculateFrontalArea } from './physics.js';

/**
 * Default car configuration (based on a typical sports sedan)
 */
export const defaultCarConfig = {
    // Basic specs
    name: "Default Sports Sedan",
    mass: 1500, // kg
    
    // Aerodynamics
    dragCoefficient: 0.32,
    frontalAreaCoeff: 0.85, // Shape coefficient for frontal area calculation
    frontalArea: 2.28, // m² (calculated from width × height × coeff)
    width: 1.85, // m
    height: 1.45, // m
    
    // Rolling resistance
    rollingResistanceCoeff: 0.012,
    
    // Drivetrain efficiency (typically 0.85-0.95)
    drivetrainEfficiency: 0.88,
    
    // Tire dimensions (225/50 R17)
    tire: {
        width: 225, // mm
        aspectRatio: 50, // %
        rimDiameter: 17 // inches
    },
    
    // Engine curves (RPM, Torque in Nm, Power in HP)
    engineCurve: [
        { rpm: 1000, torque: 180, power: 24 },
        { rpm: 2000, torque: 250, power: 67 },
        { rpm: 3000, torque: 320, power: 129 },
        { rpm: 4000, torque: 350, power: 188 },
        { rpm: 5000, torque: 340, power: 229 },
        { rpm: 6000, torque: 320, power: 258 },
        { rpm: 6500, torque: 300, power: 262 },
        { rpm: 7000, torque: 270, power: 254 }
    ],
    
    // Engine limits
    idleRpm: 800,
    maxRpm: 7200,
    redlineRpm: 7000,

    // Engine geometry (for friction torque calculation)
    engine: {
        numCylinders: 4,
        bore: 86,      // mm
        stroke: 86,    // mm (square engine)
        // FMEP constants: FMEP = a + b*Up + c*Up^2 (Up = piston speed in m/s)
        fmepA: 0.3,    // bar (typical 0.2-0.4)
        fmepB: 0.03,   // bar/(m/s) (typical 0.02-0.05)
        fmepC: 0.001   // bar/(m/s)^2 (typical 0.0005-0.002)
    },

    // Gearbox (6-speed manual)
    gearbox: {
        ratios: [3.82, 2.36, 1.69, 1.31, 1.00, 0.82],
        names: ["1st", "2nd", "3rd", "4th", "5th", "6th"],
        finalDrives: [3.73, 3.73, 3.73, 3.73, 3.73, 3.73], // Per-gear final drive ratios
        usePreviousFinalDrive: [false, true, true, true, true, true] // Whether to use previous gear's final drive
    },

    // Legacy differential ratio (for backwards compatibility)
    differentialRatio: 3.73
};

/**
 * Car class - represents a complete car configuration
 */
export class Car {
    constructor(config = defaultCarConfig) {
        this.name = config.name;
        this.mass = config.mass;
        this.dragCoefficient = config.dragCoefficient;
        this.width = config.width;
        this.height = config.height;
        this.frontalAreaCoeff = config.frontalAreaCoeff || 0.85;
        this.frontalArea = config.frontalArea || (config.width * config.height * this.frontalAreaCoeff);
        this.rollingResistanceCoeff = config.rollingResistanceCoeff;
        this.drivetrainEfficiency = config.drivetrainEfficiency;
        this.tire = { ...config.tire };
        this.engineCurve = [...config.engineCurve];
        this.idleRpm = config.idleRpm;
        this.maxRpm = config.maxRpm;
        this.redlineRpm = config.redlineRpm;

        // Engine geometry for friction torque calculation
        this.engine = config.engine ? { ...config.engine } : {
            numCylinders: 4,
            bore: 86,
            stroke: 86,
            fmepA: 0.3,
            fmepB: 0.03,
            fmepC: 0.001
        };

        // Initialize gearbox with per-gear final drives
        const numGears = config.gearbox.ratios.length;
        const defaultFinalDrive = config.differentialRatio || 3.73;

        this.gearbox = {
            ratios: [...config.gearbox.ratios],
            names: [...config.gearbox.names],
            finalDrives: config.gearbox.finalDrives
                ? [...config.gearbox.finalDrives]
                : new Array(numGears).fill(defaultFinalDrive),
            usePreviousFinalDrive: config.gearbox.usePreviousFinalDrive
                ? [...config.gearbox.usePreviousFinalDrive]
                : [false, ...new Array(numGears - 1).fill(true)]
        };

        // Legacy support
        this.differentialRatio = config.differentialRatio || this.gearbox.finalDrives[0];
        
        // Calculate derived values
        this.wheelRadius = calculateWheelRadius(
            this.tire.width,
            this.tire.aspectRatio,
            this.tire.rimDiameter
        );
    }
    
    /**
     * Get the gear ratio for a specific gear
     * @param {number} gearIndex - 0-based gear index
     * @returns {number} Gear ratio
     */
    getGearRatio(gearIndex) {
        if (gearIndex < 0 || gearIndex >= this.gearbox.ratios.length) {
            return 1;
        }
        return this.gearbox.ratios[gearIndex];
    }
    
    /**
     * Get final drive ratio for a specific gear
     * @param {number} gearIndex - 0-based gear index
     * @returns {number} Final drive ratio
     */
    getFinalDrive(gearIndex) {
        if (gearIndex < 0 || gearIndex >= this.gearbox.ratios.length) {
            return this.differentialRatio;
        }

        // If using previous gear's final drive, find the actual value
        if (gearIndex > 0 && this.gearbox.usePreviousFinalDrive[gearIndex]) {
            return this.getFinalDrive(gearIndex - 1);
        }

        return this.gearbox.finalDrives[gearIndex] || this.differentialRatio;
    }

    /**
     * Get total gear ratio (gearbox * final drive)
     * @param {number} gearIndex - 0-based gear index
     * @returns {number} Total ratio
     */
    getTotalRatio(gearIndex) {
        return this.getGearRatio(gearIndex) * this.getFinalDrive(gearIndex);
    }
    
    /**
     * Get number of gears
     * @returns {number} Number of gears
     */
    getGearCount() {
        return this.gearbox.ratios.length;
    }
    
    /**
     * Find peak torque RPM
     * @returns {number} RPM at peak torque
     */
    getPeakTorqueRpm() {
        let maxTorque = 0;
        let peakRpm = this.engineCurve[0]?.rpm || 0;
        
        for (const point of this.engineCurve) {
            if (point.torque > maxTorque) {
                maxTorque = point.torque;
                peakRpm = point.rpm;
            }
        }
        return peakRpm;
    }
    
    /**
     * Find peak power RPM
     * @returns {number} RPM at peak power
     */
    getPeakPowerRpm() {
        let maxPower = 0;
        let peakRpm = this.engineCurve[0]?.rpm || 0;
        
        for (const point of this.engineCurve) {
            if (point.power > maxPower) {
                maxPower = point.power;
                peakRpm = point.rpm;
            }
        }
        return peakRpm;
    }
    
    /**
     * Export car configuration as JSON
     * @returns {Object} Car configuration object
     */
    toJSON() {
        return {
            name: this.name,
            mass: this.mass,
            dragCoefficient: this.dragCoefficient,
            width: this.width,
            height: this.height,
            frontalAreaCoeff: this.frontalAreaCoeff,
            frontalArea: this.frontalArea,
            rollingResistanceCoeff: this.rollingResistanceCoeff,
            drivetrainEfficiency: this.drivetrainEfficiency,
            tire: { ...this.tire },
            engineCurve: [...this.engineCurve],
            idleRpm: this.idleRpm,
            maxRpm: this.maxRpm,
            redlineRpm: this.redlineRpm,
            engine: { ...this.engine },
            gearbox: {
                ratios: [...this.gearbox.ratios],
                names: [...this.gearbox.names],
                finalDrives: [...this.gearbox.finalDrives],
                usePreviousFinalDrive: [...this.gearbox.usePreviousFinalDrive]
            },
            differentialRatio: this.differentialRatio
        };
    }
}

// Global car instance
let currentCar = new Car();

/**
 * Get the current car instance
 * @returns {Car} Current car
 */
export function getCurrentCar() {
    return currentCar;
}

/**
 * Update the current car instance
 * @param {Object} config - New car configuration
 */
export function updateCurrentCar(config) {
    currentCar = new Car(config);
    return currentCar;
}

