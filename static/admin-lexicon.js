// script/admin-lexicon.js - Lexicon Management Dashboard

const API_URL = 'http://localhost:3000/api';
let allLexiconData = [];
let filteredData = [];
let editingId = null;
let currentPage = 1;
const itemsPerPage = 5;

// Check if user is logged in
function checkAuth() {
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Load all lexicon data
async function loadLexicon() {
    try {
        const response = await fetch(`${API_URL}/lexicon`);
        const data = await response.json();
        
        if (data.success) {
            allLexiconData = data.data;
            filteredData = [...allLexiconData];
            currentPage = 1;
            displayLexicon();
            console.log('✅ Loaded', allLexiconData.length, 'lexicon entries');
        }
    } catch (error) {
        console.error('❌ Error loading lexicon:', error);
    }
}

// Display lexicon in table with pagination
function displayLexicon() {
    const tbody = document.querySelector('#lexiconTable tbody');
    
    if (!tbody) return;
    
    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-brown/60">
                    No lexicon entries found. Add a new term to get started.
                </td>
            </tr>
        `;
        updatePaginationControls();
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map(item => `
        <tr class="hover:bg-beige/60">
            <td class="p-4 font-medium text-brown break-words">${item.descriptor}</td>
            <td class="p-4 text-brown/80 break-words">${item.category}</td>
            <td class="p-4 text-brown/80 break-words">${item.definition}</td>
            <td class="p-4 text-center">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brown/20 text-sm font-semibold text-brown">
                    ${item.intensity}
                </span>
            </td>
            <td class="p-4 text-center space-x-2">
                <button onclick="editLexicon(${item.id})" 
                        class="p-2 rounded-full hover:bg-brown/10 text-brown hover:text-brown/70 transition-colors">
                    <span class="material-symbols-outlined text-base">edit</span>
                </button>
                <button onclick="deleteLexicon(${item.id})" 
                        class="p-2 rounded-full hover:bg-red-100 text-brown hover:text-red-500 transition-colors">
                    <span class="material-symbols-outlined text-base">delete</span>
                </button>
            </td>
        </tr>
    `).join('');
    
    updatePaginationControls();
}

// Update pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginationContainer = document.getElementById('paginationControls');
    
    if (!paginationContainer) return;
    
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredData.length);
    
    paginationContainer.innerHTML = `
        <div class="flex items-center justify-between mt-4">
            <div class="text-sm text-brown/60">
                Showing ${filteredData.length > 0 ? startIndex : 0}-${endIndex} of ${filteredData.length} terms
            </div>
            
            <div class="flex items-center gap-2">
                <button 
                    ${currentPage === 1 ? 'disabled' : ''} 
                    onclick="changePage(${currentPage - 1})"
                    class="px-4 py-2 rounded-lg border border-brown/20 bg-white text-brown hover:bg-beige disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Previous
                </button>
                
                <div class="flex items-center gap-1">
                    ${generatePageNumbers(totalPages)}
                </div>
                
                <button 
                    ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} 
                    onclick="changePage(${currentPage + 1})"
                    class="px-4 py-2 rounded-lg border border-brown/20 bg-white text-brown hover:bg-beige disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Next
                </button>
            </div>
        </div>
    `;
}

// Generate page number buttons
function generatePageNumbers(totalPages) {
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <button 
                onclick="changePage(${i})"
                class="px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    i === currentPage
                        ? 'bg-brown text-white'
                        : 'bg-white text-brown hover:bg-beige border border-brown/20'
                }">
                ${i}
            </button>
        `;
    }
    return html;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayLexicon();
}

// Add new lexicon entry
async function addLexicon(formData) {
    try {
        const response = await fetch(`${API_URL}/lexicon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Lexicon entry added!');
            await loadLexicon(); // Refresh table
            return true;
        } else {
            alert('Failed to add entry: ' + (data.error || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('❌ Error adding lexicon:', error);
        alert('Error adding entry. Please try again.');
        return false;
    }
}

// Edit lexicon entry
function editLexicon(id) {
    const item = allLexiconData.find(i => i.id === id);
    if (!item) return;
    
    // Populate form with existing data
    document.getElementById('descriptor').value = item.descriptor;
    document.getElementById('category').value = item.category;
    document.getElementById('definition').value = item.definition;
    document.getElementById('intensity').value = item.intensity;
    document.getElementById('intensityValue').textContent = item.intensity;
    
    // Change button to "Update"
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Update Term';
    submitBtn.classList.add('bg-brown-light');
    
    // Store editing ID
    editingId = id;
    
    // Scroll to form
    document.querySelector('.lg\\:col-span-1').scrollIntoView({ behavior: 'smooth' });
}

// Update lexicon entry
async function updateLexicon(id, formData) {
    try {
        const response = await fetch(`${API_URL}/lexicon/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Lexicon entry updated!');
            await loadLexicon(); // Refresh table
            return true;
        } else {
            alert('Failed to update entry: ' + (data.error || 'Unknown error'));
            return false;
        }
    } catch (error) {
        console.error('❌ Error updating lexicon:', error);
        alert('Error updating entry. Please try again.');
        return false;
    }
}

// Delete lexicon entry
async function deleteLexicon(id) {
    if (!confirm('Are you sure you want to delete this lexicon entry?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/lexicon/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Lexicon entry deleted!');
            await loadLexicon(); // Refresh table
        } else {
            alert('Failed to delete entry: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('❌ Error deleting lexicon:', error);
        alert('Error deleting entry. Please try again.');
    }
}

// Reset form
function resetForm() {
    document.getElementById('descriptor').value = '';
    document.getElementById('category').value = 'Select Category';
    document.getElementById('definition').value = '';
    document.getElementById('intensity').value = '3';
    document.getElementById('intensityValue').textContent = '3';
    
    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Add Term';
    submitBtn.classList.remove('bg-brown-light');
    
    editingId = null;
}

// Setup form submission
function setupForm() {
    const form = document.querySelector('form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            descriptor: document.getElementById('descriptor').value.trim(),
            category: document.getElementById('category').value,
            definition: document.getElementById('definition').value.trim(),
            intensity: parseInt(document.getElementById('intensity').value)
        };
        
        // Validation
        if (!formData.descriptor || formData.category === 'Select Category' || !formData.definition) {
            alert('Please fill in all fields');
            return;
        }
        
        let success = false;
        
        if (editingId) {
            // Update existing entry
            success = await updateLexicon(editingId, formData);
        } else {
            // Add new entry
            success = await addLexicon(formData);
        }
        
        if (success) {
            resetForm();
        }
    });
    
    // Cancel button
    document.querySelector('button[type="button"]').addEventListener('click', resetForm);
}

// Setup intensity slider
function setupIntensitySlider() {
    const intensityRange = document.getElementById("intensity");
    const intensityValue = document.getElementById("intensityValue");

    intensityRange.addEventListener("input", () => {
        intensityValue.textContent = intensityRange.value;
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        loadLexicon();
        setupForm();
        setupIntensitySlider();
    }
});

// Make functions globally accessible for onclick handlers
window.editLexicon = editLexicon;
window.deleteLexicon = deleteLexicon;
window.changePage = changePage;