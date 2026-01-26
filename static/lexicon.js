// script/lexicon.js - Database Integration for Lexicon Page

const FLASK_API = '/predict';

// Pagination settings
let currentPage = 1;
const itemsPerPage = 5;
let filteredData = [];
let allLexiconData = [];

// Fetch lexicon data from database
async function fetchLexiconData() {
    try {
        const response = await fetch(`${API_URL}/lexicon`);
        const data = await response.json();
        
        if (data.success) {
            allLexiconData = data.data;
            filteredData = [...allLexiconData];
            console.log('✅ Loaded', allLexiconData.length, 'lexicon entries from database');
            renderTable();
        } else {
            throw new Error(data.error || 'Failed to fetch lexicon data');
        }
    } catch (error) {
        console.error('❌ Error fetching lexicon data:', error);
        console.log('Using sample data as fallback');
        useFallbackData();
    }
}

// Fallback to empty state if database is unavailable
function useFallbackData() {
    console.log('⚠️ Database connection failed - showing empty state');
    allLexiconData = [];
    filteredData = [];
    renderTable();
}

// Populate table
function renderTable() {
    const tableBody = document.getElementById('lexiconTable');
    const noResults = document.getElementById('noResults');
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '';
        noResults.classList.remove('hidden');
        updatePaginationInfo();
        return;
    }
    
    noResults.classList.add('hidden');
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    tableBody.innerHTML = pageData.map(item => `
        <tr class="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors">
            <td class="px-5 py-3 text-sm font-medium text-text-light dark:text-text-dark break-words">
                ${item.descriptor}
            </td>
            <td class="px-5 py-3 text-sm text-text-muted-light dark:text-text-muted-dark break-words">
                ${item.category}
            </td>
            <td class="px-5 py-3 text-sm text-text-light dark:text-text-dark break-words">
                ${item.definition}
            </td>
            <td class="px-5 py-3 text-center">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-sm font-semibold text-primary">
                    ${item.intensity}
                </span>
            </td>
        </tr>
    `).join('');
    
    updatePaginationInfo();
    updatePaginationControls();
}

// Update pagination info
function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredData.length);
    
    document.getElementById('showingStart').textContent = filteredData.length > 0 ? startIndex : 0;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('totalItems').textContent = filteredData.length;
}

// Update pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageNumbers = document.getElementById('pageNumbers');
    
    // Enable/disable buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            i === currentPage
                ? 'bg-primary text-white'
                : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark hover:bg-primary/10 dark:hover:bg-primary/20 border border-primary/20'
        }`;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderTable();
        });
        pageNumbers.appendChild(pageBtn);
    }
}

// Filter function
function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    filteredData = allLexiconData.filter(item => {
        const matchesSearch = item.descriptor.toLowerCase().includes(searchTerm) || 
                            item.definition.toLowerCase().includes(searchTerm);
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    currentPage = 1; // Reset to first page when filtering
    renderTable();
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', filterTable);
document.getElementById('categoryFilter').addEventListener('change', filterTable);
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});
document.getElementById('nextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

// Initialize - Load data from database when page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchLexiconData();
});