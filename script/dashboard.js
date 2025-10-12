// script/dashboard.js - Analytics Dashboard

const API_URL = 'http://localhost:3000/api';

// Check if user is logged in
function checkAuth() {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Load analytics data
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/analytics/summary`);
        const data = await response.json();
        
        if (data.success) {
            updateCharts(data.data);
            console.log('✅ Analytics loaded:', data.data);
        }
    } catch (error) {
        console.error('❌ Error loading analytics:', error);
    }
}

// Load sensory notes data
async function loadSensoryNotes() {
    try {
        const response = await fetch(`${API_URL}/analytics/sensory-notes`);
        const data = await response.json();
        
        if (data.success) {
            updateSensoryNotes(data.data);
        }
    } catch (error) {
        console.error('❌ Error loading sensory notes:', error);
    }
}

// Update charts with real data
function updateCharts(analyticsData) {
    // Predictions Over Time Chart
    const days = analyticsData.predictionsByDay.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    });
    const counts = analyticsData.predictionsByDay.map(d => d.count);
    
    new Chart(document.getElementById("predictionsChart"), {
        type: "bar",
        data: {
            labels: days.length > 0 ? days : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [{
                label: "Predictions",
                data: counts.length > 0 ? counts : [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: "#8B4513",
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } } 
        }
    });
    
    // Prediction Results Breakdown
    const liberica = analyticsData.resultsBreakdown.find(r => 
        r.final_result && r.final_result.toLowerCase().includes('liberica')
    )?.count || 0;
    
    const total = analyticsData.resultsBreakdown.reduce((sum, r) => sum + r.count, 0);
    const notLiberica = total - liberica;
    
    new Chart(document.getElementById("resultsChart"), {
        type: "doughnut",
        data: {
            labels: ["Coffee Liberica", "Not Coffee Liberica"],
            datasets: [{
                data: [liberica, notLiberica],
                backgroundColor: ["#8B4513", "#EDE5DD"],
            }]
        },
        options: { 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom" } } 
        }
    });
}

// Update sensory notes section
function updateSensoryNotes(notes) {
    const container = document.querySelector('.bg-white.border.border-brown\\/10.rounded-xl.p-6.shadow-sm .space-y-3');
    
    if (!container || notes.length === 0) return;
    
    // Calculate total for percentages
    const total = notes.reduce((sum, note) => sum + note.count, 0);
    
    container.innerHTML = notes.map(note => {
        const percentage = Math.round((note.count / total) * 100);
        return `
            <div>
                <div class="flex justify-between mb-1 text-brown/80">
                    <span>${note.category}</span><span>${percentage}%</span>
                </div>
                <div class="h-2 bg-brown/10 rounded-full">
                    <div class="h-2 bg-brown rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        loadAnalytics();
        loadSensoryNotes();
    }
});
