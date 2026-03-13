/**
 * Main Application Entry Point
 * Car Acceleration Simulator
 */

import { renderCarSpecsTab } from './tabs/carSpecsTab.js';
import { renderTransmissionTab } from './tabs/transmissionTab.js';
import { renderSimulationTab, onLeaveSimulationTab } from './tabs/simulationTab.js';

// Track the currently active tab
let currentTab = 'car-specs';

/**
 * Initialize the application
 */
function initApp() {
    console.log('Car Acceleration Simulator - Initializing...');
    
    // Setup tab navigation
    setupTabNavigation();
    
    // Render the initial tab (Car Specifications)
    renderActiveTab('car-specs');
    
    console.log('Car Acceleration Simulator - Ready!');
}

/**
 * Setup tab navigation event listeners
 */
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get tab ID
            const tabId = button.dataset.tab;
            console.log('[App] Tab clicked:', tabId, 'currentTab:', currentTab);

            // If we're leaving the simulation tab, save its state first
            if (currentTab === 'simulation' && tabId !== 'simulation') {
                console.log('[App] Leaving simulation tab, calling onLeaveSimulationTab()');
                onLeaveSimulationTab();
            }

            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            button.classList.add('active');

            // Hide all panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active');
            });

            // Show selected panel
            const selectedPanel = document.getElementById(tabId);
            if (selectedPanel) {
                selectedPanel.classList.add('active');
            }

            // Render the tab content
            renderActiveTab(tabId);

            // Update current tab tracker
            currentTab = tabId;
        });
    });
}

/**
 * Render content for the active tab
 * @param {string} tabId - The ID of the tab to render
 */
function renderActiveTab(tabId) {
    const container = document.getElementById(tabId);
    
    if (!container) {
        console.error(`Tab container not found: ${tabId}`);
        return;
    }
    
    switch (tabId) {
        case 'car-specs':
            renderCarSpecsTab(container);
            break;
        case 'transmission':
            renderTransmissionTab(container);
            break;
        case 'simulation':
            renderSimulationTab(container);
            break;
        default:
            console.warn(`Unknown tab: ${tabId}`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Export for extensibility
export { renderActiveTab };

