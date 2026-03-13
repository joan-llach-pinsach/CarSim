/**
 * File Utilities for saving and loading JSON data
 */

/**
 * Save data as a JSON file (triggers download)
 * @param {Object} data - The data to save
 * @param {string} filename - The filename (without extension)
 */
export function saveToJsonFile(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Load data from a JSON file
 * @param {Function} onLoad - Callback function called with parsed data
 * @param {Function} onError - Callback function called on error
 */
export function loadFromJsonFile(onLoad, onError) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                onLoad(data);
            } catch (error) {
                if (onError) {
                    onError(`Error parsing JSON: ${error.message}`);
                } else {
                    alert(`Error parsing JSON: ${error.message}`);
                }
            }
        };
        
        reader.onerror = () => {
            if (onError) {
                onError('Error reading file');
            } else {
                alert('Error reading file');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

/**
 * Validate car specifications data
 * @param {Object} data - The data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateCarSpecsData(data) {
    const errors = [];
    
    if (typeof data.mass !== 'number' || data.mass <= 0) {
        errors.push('Invalid mass value');
    }
    
    if (typeof data.dragCoefficient !== 'number' || data.dragCoefficient <= 0) {
        errors.push('Invalid drag coefficient');
    }
    
    if (!data.tire || typeof data.tire.width !== 'number') {
        errors.push('Invalid tire data');
    }
    
    if (!Array.isArray(data.engineCurve) || data.engineCurve.length === 0) {
        errors.push('Invalid or empty engine curve');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate transmission data
 * @param {Object} data - The data to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateTransmissionData(data) {
    const errors = [];
    
    if (typeof data.differentialRatio !== 'number' || data.differentialRatio <= 0) {
        errors.push('Invalid differential ratio');
    }
    
    if (!data.gearbox || !Array.isArray(data.gearbox.ratios) || data.gearbox.ratios.length === 0) {
        errors.push('Invalid gearbox data');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

