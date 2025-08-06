// Crypto Portfolio Tracker JavaScript

class CryptoPortfolioTracker {
    constructor() {
        this.portfolio = this.loadPortfolio();
        this.coins = [];
        this.charts = {};
        
        this.init();
    }

    async init() {
        await this.loadCoins();
        this.setupEventListeners();
        this.updatePortfolio();
        this.updateCharts();
        this.startPriceUpdates();
        this.loadDarkModePreference();
        this.populateAlertCoins();
        this.updateAlertsList();
    }

    // Load coins from CoinGecko API
    async loadCoins() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
            this.coins = await response.json();
            
            const coinSelect = document.getElementById('coinSelect');
            coinSelect.innerHTML = '<option value="">Select a coin...</option>';
            
            this.coins.forEach(coin => {
                const option = document.createElement('option');
                option.value = coin.id;
                option.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
                coinSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading coins:', error);
            this.showMessage('Error loading coins. Please try again.', 'error');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const addCoinBtn = document.getElementById('addCoinBtn');
        const coinSelect = document.getElementById('coinSelect');
        const coinAmount = document.getElementById('coinAmount');
        const coinPrice = document.getElementById('coinPrice');

        addCoinBtn.addEventListener('click', () => this.addCoin());
        
        // Auto-fill current price when coin is selected
        coinSelect.addEventListener('change', () => {
            const selectedCoin = this.coins.find(coin => coin.id === coinSelect.value);
            if (selectedCoin) {
                coinPrice.value = selectedCoin.current_price;
            }
        });

        // New feature event listeners
        this.setupNewFeatureListeners();
    }

    // Setup new feature event listeners
    setupNewFeatureListeners() {
        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        darkModeToggle.addEventListener('click', () => this.toggleDarkMode());

        // Export data
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => this.exportData());

        // Price alerts
        const addAlertBtn = document.getElementById('addAlertBtn');
        addAlertBtn.addEventListener('click', () => this.addPriceAlert());

        // Quick actions
        const clearPortfolioBtn = document.getElementById('clearPortfolioBtn');
        clearPortfolioBtn.addEventListener('click', () => this.clearPortfolio());

        const backupBtn = document.getElementById('backupBtn');
        backupBtn.addEventListener('click', () => this.backupData());

        const restoreBtn = document.getElementById('restoreBtn');
        restoreBtn.addEventListener('click', () => this.restoreData());
    }

    // Add coin to portfolio
    addCoin() {
        const coinSelect = document.getElementById('coinSelect');
        const coinAmount = document.getElementById('coinAmount');
        const coinPrice = document.getElementById('coinPrice');

        const coinId = coinSelect.value;
        const amount = parseFloat(coinAmount.value);
        const purchasePrice = parseFloat(coinPrice.value);

        if (!coinId || !amount || !purchasePrice) {
            this.showMessage('Please fill in all fields.', 'error');
            return;
        }

        const coin = this.coins.find(c => c.id === coinId);
        if (!coin) {
            this.showMessage('Invalid coin selected.', 'error');
            return;
        }

        // Check if coin already exists in portfolio
        const existingIndex = this.portfolio.findIndex(item => item.id === coinId);
        
        if (existingIndex !== -1) {
            // Update existing coin
            const existing = this.portfolio[existingIndex];
            const totalAmount = existing.amount + amount;
            const totalCost = (existing.amount * existing.purchasePrice) + (amount * purchasePrice);
            const avgPrice = totalCost / totalAmount;
            
            this.portfolio[existingIndex] = {
                ...existing,
                amount: totalAmount,
                purchasePrice: avgPrice
            };
        } else {
            // Add new coin
            this.portfolio.push({
                id: coinId,
                name: coin.name,
                symbol: coin.symbol,
                amount: amount,
                purchasePrice: purchasePrice,
                addedAt: new Date().toISOString()
            });
        }

        this.savePortfolio();
        this.updatePortfolio();
        this.updateCharts();
        
        // Reset form
        coinSelect.value = '';
        coinAmount.value = '';
        coinPrice.value = '';
        
        this.showMessage(`${coin.name} added to portfolio!`, 'success');
    }

    // Remove coin from portfolio
    removeCoin(coinId) {
        this.portfolio = this.portfolio.filter(coin => coin.id !== coinId);
        this.savePortfolio();
        this.updatePortfolio();
        this.updateCharts();
        this.showMessage('Coin removed from portfolio.', 'success');
    }

    // Update portfolio display
    async updatePortfolio() {
        const portfolioCards = document.getElementById('portfolioCards');
        
        if (this.portfolio.length === 0) {
            portfolioCards.innerHTML = `
                <div class="empty-state">
                    <h3>No coins in portfolio</h3>
                    <p>Add your first coin to get started!</p>
                </div>
            `;
            this.updateHeaderStats();
            return;
        }

        // Get current prices for all coins
        const coinIds = this.portfolio.map(coin => coin.id).join(',');
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true`);
            const prices = await response.json();

            let totalValue = 0;
            let totalChange = 0;

            portfolioCards.innerHTML = this.portfolio.map(coin => {
                const currentPrice = prices[coin.id]?.usd || 0;
                const priceChange = prices[coin.id]?.usd_24h_change || 0;
                const currentValue = coin.amount * currentPrice;
                const totalCost = coin.amount * coin.purchasePrice;
                const profitLoss = currentValue - totalCost;
                const profitLossPercent = ((currentValue - totalCost) / totalCost) * 100;

                totalValue += currentValue;
                totalChange += priceChange * (currentValue / totalValue);

                return `
                    <div class="portfolio-card">
                        <div class="card-header">
                            <div class="coin-info">
                                <span class="coin-name">${coin.name}</span>
                                <span class="coin-symbol">${coin.symbol.toUpperCase()}</span>
                            </div>
                            <div class="card-actions">
                                <button class="btn btn-danger" onclick="portfolioTracker.removeCoin('${coin.id}')">Remove</button>
                            </div>
                        </div>
                        <div class="card-stats">
                            <div class="stat-item">
                                <span class="stat-value">$${currentPrice.toFixed(2)}</span>
                                <span class="stat-label">Current Price</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value ${priceChange >= 0 ? 'change-positive' : 'change-negative'}">
                                    ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%
                                </span>
                                <span class="stat-label">24h Change</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${coin.amount.toFixed(6)}</span>
                                <span class="stat-label">Amount</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">$${currentValue.toFixed(2)}</span>
                                <span class="stat-label">Current Value</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value ${profitLoss >= 0 ? 'change-positive' : 'change-negative'}">
                                    ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)}
                                </span>
                                <span class="stat-label">P&L</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value ${profitLossPercent >= 0 ? 'change-positive' : 'change-negative'}">
                                    ${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%
                                </span>
                                <span class="stat-label">P&L %</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            this.updateHeaderStats(totalValue, totalChange);
        } catch (error) {
            console.error('Error updating portfolio:', error);
        }
    }

    // Update header statistics
    updateHeaderStats(totalValue = 0, totalChange = 0) {
        document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
        document.getElementById('totalChange').textContent = `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}%`;
        document.getElementById('totalChange').className = `stat-value ${totalChange >= 0 ? 'change-positive' : 'change-negative'}`;
    }

    // Update charts
    updateCharts() {
        if (this.portfolio.length === 0) return;

        this.updatePieChart();
        this.updateLineChart();
    }

    // Update pie chart for portfolio distribution
    updatePieChart() {
        const ctx = document.getElementById('pieChart').getContext('2d');
        
        const labels = this.portfolio.map(coin => coin.symbol.toUpperCase());
        const data = this.portfolio.map(coin => {
            const currentPrice = this.coins.find(c => c.id === coin.id)?.current_price || 0;
            return coin.amount * currentPrice;
        });

        if (this.charts.pie) {
            this.charts.pie.destroy();
        }

        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#f5576c',
                        '#4facfe',
                        '#00f2fe',
                        '#43e97b',
                        '#38f9d7'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Update line chart for portfolio performance
    updateLineChart() {
        const ctx = document.getElementById('lineChart').getContext('2d');
        
        // Generate sample data for demonstration
        const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const data = [10000, 12000, 11000, 14000, 13000, 15000];

        if (this.charts.line) {
            this.charts.line.destroy();
        }

        this.charts.line = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Portfolio Value',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    // Start automatic price updates
    startPriceUpdates() {
        setInterval(() => {
            this.updatePortfolio();
        }, 30000); // Update every 30 seconds
    }

    // Show message
    showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        document.querySelector('.add-coin-section').insertBefore(messageDiv, document.querySelector('.add-coin-form'));
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Load portfolio from localStorage
    loadPortfolio() {
        const saved = localStorage.getItem('cryptoPortfolio');
        return saved ? JSON.parse(saved) : [];
    }

    // Save portfolio to localStorage
    savePortfolio() {
        localStorage.setItem('cryptoPortfolio', JSON.stringify(this.portfolio));
    }

    // New Feature Methods

    // Toggle dark mode
    toggleDarkMode() {
        const body = document.body;
        const darkModeToggle = document.getElementById('darkModeToggle');
        
        if (body.classList.contains('dark-mode')) {
            body.classList.remove('dark-mode');
            darkModeToggle.textContent = '🌙 Dark Mode';
            localStorage.setItem('darkMode', 'false');
        } else {
            body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️ Light Mode';
            localStorage.setItem('darkMode', 'true');
        }
    }

    // Export portfolio data
    exportData() {
        const data = {
            portfolio: this.portfolio,
            exportDate: new Date().toISOString(),
            totalValue: this.calculateTotalValue()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crypto-portfolio-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('Portfolio data exported successfully!', 'success');
    }

    // Add price alert
    addPriceAlert() {
        const alertCoin = document.getElementById('alertCoin');
        const alertPrice = document.getElementById('alertPrice');
        
        if (!alertCoin.value || !alertPrice.value) {
            this.showMessage('Please select a coin and enter a target price.', 'error');
            return;
        }

        const coin = this.coins.find(c => c.id === alertCoin.value);
        const alert = {
            id: Date.now(),
            coinId: alertCoin.value,
            coinName: coin.name,
            targetPrice: parseFloat(alertPrice.value),
            createdAt: new Date().toISOString()
        };

        const alerts = this.loadAlerts();
        alerts.push(alert);
        localStorage.setItem('priceAlerts', JSON.stringify(alerts));
        
        this.updateAlertsList();
        this.showMessage(`Alert set for ${coin.name} at $${alertPrice.value}!`, 'success');
        
        alertCoin.value = '';
        alertPrice.value = '';
    }

    // Load alerts from localStorage
    loadAlerts() {
        const saved = localStorage.getItem('priceAlerts');
        return saved ? JSON.parse(saved) : [];
    }

    // Update alerts list display
    updateAlertsList() {
        const alertsList = document.getElementById('alertsList');
        const alerts = this.loadAlerts();
        
        alertsList.innerHTML = '';
        
        alerts.forEach(alert => {
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item';
            alertItem.innerHTML = `
                <span>${alert.coinName} - $${alert.targetPrice}</span>
                <button onclick="portfolioTracker.removeAlert(${alert.id})" class="btn btn-danger">Remove</button>
            `;
            alertsList.appendChild(alertItem);
        });
    }

    // Remove alert
    removeAlert(alertId) {
        const alerts = this.loadAlerts();
        const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
        localStorage.setItem('priceAlerts', JSON.stringify(filteredAlerts));
        this.updateAlertsList();
        this.showMessage('Alert removed!', 'success');
    }

    // Clear portfolio
    clearPortfolio() {
        if (confirm('Are you sure you want to clear your entire portfolio? This action cannot be undone.')) {
            this.portfolio = [];
            this.savePortfolio();
            this.updatePortfolio();
            this.updateCharts();
            this.showMessage('Portfolio cleared!', 'success');
        }
    }

    // Backup data
    backupData() {
        const backup = {
            portfolio: this.portfolio,
            alerts: this.loadAlerts(),
            settings: {
                darkMode: localStorage.getItem('darkMode') === 'true'
            },
            backupDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crypto-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('Backup created successfully!', 'success');
    }

    // Restore data
    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const backup = JSON.parse(event.target.result);
                    
                    if (backup.portfolio) {
                        this.portfolio = backup.portfolio;
                        this.savePortfolio();
                    }
                    
                    if (backup.alerts) {
                        localStorage.setItem('priceAlerts', JSON.stringify(backup.alerts));
                    }
                    
                    if (backup.settings && backup.settings.darkMode) {
                        document.body.classList.add('dark-mode');
                        document.getElementById('darkModeToggle').textContent = '☀️ Light Mode';
                    }
                    
                    this.updatePortfolio();
                    this.updateCharts();
                    this.updateAlertsList();
                    
                    this.showMessage('Data restored successfully!', 'success');
                } catch (error) {
                    this.showMessage('Error restoring data. Please check your backup file.', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    // Calculate total portfolio value
    calculateTotalValue() {
        return this.portfolio.reduce((total, coin) => {
            return total + (coin.amount * coin.currentPrice);
        }, 0);
    }

    // Load dark mode preference
    loadDarkModePreference() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').textContent = '☀️ Light Mode';
        }
    }

    // Populate alert coins dropdown
    populateAlertCoins() {
        const alertCoin = document.getElementById('alertCoin');
        if (alertCoin) {
            alertCoin.innerHTML = '<option value="">Select coin...</option>';
            this.coins.forEach(coin => {
                const option = document.createElement('option');
                option.value = coin.id;
                option.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
                alertCoin.appendChild(option);
            });
        }
    }
}

// Initialize the portfolio tracker when page loads
let portfolioTracker;
document.addEventListener('DOMContentLoaded', () => {
    portfolioTracker = new CryptoPortfolioTracker();
}); 