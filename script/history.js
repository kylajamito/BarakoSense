// script/history.js - History Dashboard

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

// Load history data for a specific type
async function loadHistory(type) {
    try {
        const response = await fetch(`${API_URL}/history/${type}`);
        const data = await response.json();
        
        if (data.success) {
            displayHistory(type, data.data);
            console.log(`✅ Loaded ${data.data.length} ${type} records`);
        }
    } catch (error) {
        console.error(`❌ Error loading ${type} history:`, error);
    }
}

// Display history in table
function displayHistory(type, records) {
    const tbody = document.querySelector(`#${type} tbody`);
    
    if (!tbody) return;
    
    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-brown/60">
                    No ${type} data available
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = records.map(record => {
        const imageUrl = record.image ? `http://localhost:3000/uploads/${record.image}` : 'https://via.placeholder.com/40';
        const date = new Date(record.date_predicted);
        const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
        const formattedTime = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <tr class="hover:bg-beige/60">
                <td class="px-6 py-4">
                    <img class="h-10 w-10 rounded-full object-cover" 
                         src="${imageUrl}" 
                         alt="${type} image"
                         onerror="this.src='https://via.placeholder.com/40'" />
                </td>
                <td class="px-6 py-4 text-sm text-brown font-medium">
                    ${record.prediction || 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-brown/70">
                    ${record.confidence ? record.confidence + '%' : 'N/A'}
                </td>
                <td class="px-6 py-4 text-sm text-brown/70">
                    ${formattedDate} ${formattedTime}
                </td>
            </tr>
        `;
    }).join('');
}

// Tab switching logic
function setupTabs() {
    const tabs = document.querySelectorAll(".tab");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            // Update tab styles
            tabs.forEach(t => {
                t.classList.remove("active", "border-brown", "text-brown");
                t.classList.add("border-transparent", "text-brown/60");
            });

            tab.classList.add("active", "border-brown", "text-brown");
            tab.classList.remove("text-brown/60");

            // Show corresponding content
            const tabType = tab.dataset.tab;
            contents.forEach(c => c.classList.add("hidden"));
            document.getElementById(tabType).classList.remove("hidden");
            
            // Load data for selected tab
            loadHistory(tabType);
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        setupTabs();
        // Load initial data (leaves)
        loadHistory('leaves');
    }
});
