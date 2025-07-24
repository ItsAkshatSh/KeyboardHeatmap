class KeyboardHeatmap {
    constructor() {
        this.keyData = {};
        this.liveKeyData = {};
        this.sessionData = {};
        this.isLiveMode = true;
        this.totalKeyPresses = 0;
        this.sessionKeyPresses = 0;
        this.sessionStartTime = Date.now();
        this.lastSessionReset = Date.now();
        this.isMinimized = false;
        this.sessionWords = 0;
        this.sessionCorrectKeys = 0;
        this.sessionTotalKeys = 0;
        this.liveDecayRate = 0.95;
        this.liveDecayInterval = 100;
        this.inactivityThreshold = 30000;
        this.lastKeyPressTime = Date.now();
        
        this.initializeElements();
        this.bindEvents();
        this.startLiveDecay();
        this.startSessionTimer();
        this.detectInactivity();
        
        this.typingArea.focus();
    }
    
    initializeElements() {
        this.typingArea = document.getElementById('typingArea');
        this.toggleModeBtn = document.getElementById('toggleMode');
        this.clearDataBtn = document.getElementById('clearData');
        this.exportImageBtn = document.getElementById('exportImage');
        this.minimizeBtn = document.getElementById('minimizeBtn');
        this.restoreBtn = document.getElementById('restoreBtn');
        this.totalKeysSpan = document.getElementById('totalKeys');
        this.mostUsedSpan = document.getElementById('mostUsed');
        this.currentModeSpan = document.getElementById('currentMode');
        this.keyboardContainer = document.getElementById('keyboardContainer');
        this.sessionStats = document.getElementById('sessionStats');
        this.minimizePanel = document.getElementById('minimizePanel');
        
        this.sessionTime = document.getElementById('sessionTime');
        this.sessionKeys = document.getElementById('sessionKeys');
        this.sessionWPM = document.getElementById('sessionWPM');
        this.sessionAccuracy = document.getElementById('sessionAccuracy');
        this.sessionTopKey = document.getElementById('sessionTopKey');
        
        this.miniTotalKeys = document.getElementById('miniTotalKeys');
        this.miniSessionKeys = document.getElementById('miniSessionKeys');
        this.miniWPM = document.getElementById('miniWPM');
        this.miniMostUsed = document.getElementById('miniMostUsed');
        
        this.keyElements = {};
        document.querySelectorAll('.key').forEach(keyEl => {
            const keyCode = keyEl.dataset.key;
            if (keyCode) {
                this.keyElements[keyCode.toLowerCase()] = keyEl;
            }
        });
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.addEventListener('keyup', (e) => this.handleKeyRelease(e));
        
        this.toggleModeBtn.addEventListener('click', () => this.toggleMode());
        this.clearDataBtn.addEventListener('click', () => this.clearData());
        this.exportImageBtn.addEventListener('click', () => this.exportHeatmap());
        this.minimizeBtn.addEventListener('click', () => this.minimize());
        this.restoreBtn.addEventListener('click', () => this.restore());
        
        this.typingArea.addEventListener('input', (e) => {
            this.trackTypingSession(e);
            this.updateStats();
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onWindowHidden();
            } else {
                this.onWindowVisible();
            }
        });
    }
    
    handleKeyPress(event) {
        const key = this.normalizeKey(event.key);
        this.lastKeyPressTime = Date.now();
        
        if (['F5', 'F11', 'F12'].includes(event.key)) {
            event.preventDefault();
        }
        
        this.trackKeyPress(key);
        
        if (!this.isMinimized) {
            this.showKeyPress(key);
        }
        
        this.updateHeatmap();
        this.updateStats();
        this.updateSessionStats();
    }
    
    handleKeyRelease(event) {
        const key = this.normalizeKey(event.key);
        if (!this.isMinimized) {
            this.hideKeyPress(key);
        }
    }
    
    trackTypingSession(event) {
        const text = event.target.value;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        this.sessionWords = words.length;
        
        this.sessionTotalKeys++;
        if (event.inputType !== 'deleteContentBackward') {
            this.sessionCorrectKeys++;
        }
    }
    
    trackKeyPress(key) {
        if (!this.keyData[key]) {
            this.keyData[key] = 0;
        }
        this.keyData[key]++;
        
        if (!this.sessionData[key]) {
            this.sessionData[key] = 0;
        }
        this.sessionData[key]++;
        
        if (!this.liveKeyData[key]) {
            this.liveKeyData[key] = 0;
        }
        this.liveKeyData[key] = Math.min(this.liveKeyData[key] + 5, 100);
        
        this.totalKeyPresses++;
        this.sessionKeyPresses++;
    }
    
    updateSessionStats() {
        const sessionDuration = (Date.now() - this.sessionStartTime) / 1000 / 60; // minutes
        const wpm = sessionDuration > 0 ? Math.round(this.sessionWords / sessionDuration) : 0;
        const accuracy = this.sessionTotalKeys > 0 ? 
            Math.round((this.sessionCorrectKeys / this.sessionTotalKeys) * 100) : 100;
        
        if (this.sessionKeys) this.sessionKeys.textContent = this.sessionKeyPresses.toLocaleString();
        if (this.sessionWPM) this.sessionWPM.textContent = wpm;
        if (this.sessionAccuracy) this.sessionAccuracy.textContent = `${accuracy}%`;
        
        const sessionEntries = Object.entries(this.sessionData);
        if (sessionEntries.length > 0) {
            const mostUsed = sessionEntries.reduce((a, b) => a[1] > b[1] ? a : b);
            const keyName = mostUsed[0] === ' ' ? 'SPACE' : mostUsed[0].toUpperCase();
            if (this.sessionTopKey) this.sessionTopKey.textContent = keyName;
        }
        
        if (this.miniTotalKeys) this.miniTotalKeys.textContent = this.totalKeyPresses.toLocaleString();
        if (this.miniSessionKeys) this.miniSessionKeys.textContent = this.sessionKeyPresses.toLocaleString();
        if (this.miniWPM) this.miniWPM.textContent = wpm;
        
        const entries = Object.entries(this.keyData);
        if (entries.length > 0 && this.miniMostUsed) {
            const mostUsed = entries.reduce((a, b) => a[1] > b[1] ? a : b);
            const keyName = mostUsed[0] === ' ' ? 'SPC' : mostUsed[0].toUpperCase();
            this.miniMostUsed.textContent = keyName;
        }
    }
    
    startSessionTimer() {
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.sessionTime) {
                this.sessionTime.textContent = timeString;
            }
        }, 1000);
    }
    
    detectInactivity() {
        setInterval(() => {
            const timeSinceLastKey = Date.now() - this.lastKeyPressTime;
            
            if (timeSinceLastKey > this.inactivityThreshold && this.sessionKeyPresses > 0) {
                this.showSessionSummary();
                this.resetSession();
            }
        }, 5000); 
    }
    
    showSessionSummary() {
        if (this.sessionKeyPresses === 0) return;
        
        const sessionDuration = (Date.now() - this.sessionStartTime) / 1000 / 60;
        const wpm = sessionDuration > 0 ? Math.round(this.sessionWords / sessionDuration) : 0;
        const accuracy = this.sessionTotalKeys > 0 ? 
            Math.round((this.sessionCorrectKeys / this.sessionTotalKeys) * 100) : 100;
        
        if (this.sessionStats) {
            this.sessionStats.classList.add('active');
            setTimeout(() => {
                this.sessionStats.classList.remove('active');
            }, 10000); 
        }
    }
    
    resetSession() {
        this.sessionData = {};
        this.sessionKeyPresses = 0;
        this.sessionStartTime = Date.now();
        this.sessionWords = 0;
        this.sessionCorrectKeys = 0;
        this.sessionTotalKeys = 0;
        this.lastSessionReset = Date.now();
    }
    
    minimize() {
        this.isMinimized = true;
        document.body.classList.add('minimized');
        this.minimizeBtn.textContent = 'Minimized';
    }
    
    restore() {
        this.isMinimized = false;
        document.body.classList.remove('minimized');
        this.minimizeBtn.textContent = 'Minimize';
        this.updateHeatmap();
        this.typingArea.focus();
    }
    
    onWindowHidden() {
        console.log('App minimized - continuing background tracking');
    }
    
    onWindowVisible() {
        if (!this.isMinimized) {
            this.updateHeatmap();
            this.updateStats();
        }
        this.updateSessionStats();
    }
    
    normalizeKey(key) {
        const keyMap = {
            ' ': ' ',
            'Control': 'Control',
            'Shift': 'Shift',
            'Alt': 'Alt',
            'Meta': 'Meta',
            'Enter': 'Enter',
            'Backspace': 'Backspace',
            'Tab': 'Tab',
            'Escape': 'Escape',
            'CapsLock': 'CapsLock',
            'ContextMenu': 'ContextMenu'
        };
        
        if (keyMap.hasOwnProperty(key)) {
            return keyMap[key];
        }
        
        return key.toLowerCase();
    }
    
    trackKeyPress(key) {
        if (!this.keyData[key]) {
            this.keyData[key] = 0;
        }
        this.keyData[key]++;
        
        if (!this.liveKeyData[key]) {
            this.liveKeyData[key] = 0;
        }
        this.liveKeyData[key] = Math.min(this.liveKeyData[key] + 5, 100); // Cap at 100
        
        this.totalKeyPresses++;
        this.sessionKeyPresses++;
    }
    
    showKeyPress(key) {
        const keyElement = this.getKeyElement(key);
        if (keyElement) {
            keyElement.classList.add('key-pressed');
            setTimeout(() => {
                keyElement.classList.remove('key-pressed');
            }, 150);
        }
    }
    
    hideKeyPress(key) {
        const keyElement = this.getKeyElement(key);
        if (keyElement) {
            keyElement.classList.remove('key-pressed');
        }
    }
    
    getKeyElement(key) {
        if (this.keyElements[key.toLowerCase()]) {
            return this.keyElements[key.toLowerCase()];
        }
        
        const specialKeys = {
            ' ': ' ',
            'control': 'Control',
            'shift': 'Shift',
            'alt': 'Alt',
            'meta': 'Meta',
            'enter': 'Enter',
            'backspace': 'Backspace',
            'tab': 'Tab',
            'escape': 'Escape',
            'capslock': 'CapsLock',
            'contextmenu': 'ContextMenu'
        };
        
        const mappedKey = specialKeys[key.toLowerCase()];
        if (mappedKey && this.keyElements[mappedKey.toLowerCase()]) {
            return this.keyElements[mappedKey.toLowerCase()];
        }
        
        return null;
    }
    
    updateHeatmap() {
        const dataToUse = this.isLiveMode ? this.liveKeyData : this.keyData;
        const maxValue = Math.max(...Object.values(dataToUse), 1);
        
        document.querySelectorAll('.key').forEach(keyEl => {
            for (let i = 1; i <= 10; i++) {
                keyEl.classList.remove(`heat-${i}`);
            }
        });
        
        Object.entries(dataToUse).forEach(([key, count]) => {
            const keyElement = this.getKeyElement(key);
            if (keyElement && count > 0) {
                const intensity = Math.ceil((count / maxValue) * 10);
                keyElement.classList.add(`heat-${Math.min(intensity, 10)}`);
            }
        });
    }
    
    updateStats() {
        this.totalKeysSpan.textContent = this.totalKeyPresses.toLocaleString();
        
        const dataToUse = this.isLiveMode ? this.liveKeyData : this.keyData;
        const entries = Object.entries(dataToUse);
        if (entries.length > 0) {
            const mostUsed = entries.reduce((a, b) => a[1] > b[1] ? a : b);
            const keyName = mostUsed[0] === ' ' ? 'SPACE' : mostUsed[0].toUpperCase();
            this.mostUsedSpan.textContent = `${keyName} (${Math.round(mostUsed[1])})`;
        } else {
            this.mostUsedSpan.textContent = '-';
        }
        
        this.currentModeSpan.textContent = this.isLiveMode ? 'Live View' : 'Cumulative';
    }
    
    toggleMode() {
        this.isLiveMode = !this.isLiveMode;
        this.toggleModeBtn.textContent = this.isLiveMode ? 'Switch to Cumulative' : 'Switch to Live View';
        this.updateHeatmap();
        this.updateStats();
    }
    
    clearData() {
        if (confirm('Are you sure you want to clear all keyboard data?')) {
            this.keyData = {};
            this.liveKeyData = {};
            this.sessionData = {};
            this.totalKeyPresses = 0;
            this.sessionKeyPresses = 0;
            this.sessionWords = 0;
            this.sessionCorrectKeys = 0;
            this.sessionTotalKeys = 0;
            this.sessionStartTime = Date.now();
            this.updateHeatmap();
            this.updateStats();
            this.updateSessionStats();
            this.typingArea.value = '';
            this.typingArea.focus();
        }
    }
    
    getHeatColor(intensity) {
        const colors = [
            '#0f0f0f',   
            '#1e293b',   
            '#0f172a',   
            '#312e81',   
            '#3730a3',  
            '#4f46e5',  
            '#6366f1', 
            '#8b5cf6', 
            '#06b6d4',   
            '#10b981',   
            '#f59e0b'    
        ];
        return colors[Math.min(intensity, 10)];
    }
    
    startLiveDecay() {
        setInterval(() => {
            if (this.isLiveMode && !this.isMinimized) {
                Object.keys(this.liveKeyData).forEach(key => {
                    this.liveKeyData[key] *= this.liveDecayRate;
                    if (this.liveKeyData[key] < 0.1) {
                        delete this.liveKeyData[key];
                    }
                });
                this.updateHeatmap();
                this.updateStats();
            }
        }, this.liveDecayInterval);
    }
    
    exportHeatmap() {
        const canvas = document.getElementById('exportCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 1200;
        canvas.height = 700;
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#e4e4e7';
        ctx.font = 'bold 36px Inter, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Keyboard Heatmap', canvas.width / 2, 60);
        
        ctx.font = '18px Inter, Arial';
        ctx.fillStyle = '#71717a';
        const mode = this.isLiveMode ? 'Live View' : 'Cumulative';
        const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000 / 60);
        ctx.fillText(`${mode} | Total: ${this.totalKeyPresses.toLocaleString()} keys | Session: ${sessionDuration}min`, 
                     canvas.width / 2, 90);
        
        const keyboardRect = this.keyboardContainer.getBoundingClientRect();
        const scale = Math.min(1000 / keyboardRect.width, 350 / keyboardRect.height);
        
        const startX = (canvas.width - keyboardRect.width * scale) / 2;
        const startY = 130;
        
        const dataToUse = this.isLiveMode ? this.liveKeyData : this.keyData;
        const maxValue = Math.max(...Object.values(dataToUse), 1);
        
        document.querySelectorAll('.key').forEach(keyEl => {
            const rect = keyEl.getBoundingClientRect();
            const keyboardContainerRect = this.keyboardContainer.getBoundingClientRect();
            
            const x = startX + (rect.left - keyboardContainerRect.left) * scale;
            const y = startY + (rect.top - keyboardContainerRect.top) * scale;
            const width = rect.width * scale;
            const height = rect.height * scale;
            
            const keyCode = keyEl.dataset.key;
            const keyValue = dataToUse[keyCode?.toLowerCase()] || 0;
            const intensity = keyValue > 0 ? Math.ceil((keyValue / maxValue) * 10) : 0;
            
            ctx.fillStyle = this.getHeatColor(intensity);
            ctx.fillRect(x, y, width, height);
            
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
            
            ctx.fillStyle = intensity > 5 ? '#ffffff' : '#a1a1aa';
            ctx.font = `${Math.min(width / 4, height / 3, 11)}px Inter, Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const keyText = keyEl.textContent.split('\n')[0] || keyEl.textContent;
            ctx.fillText(keyText, x + width / 2, y + height / 2);
        });
        
        this.drawModernLegend(ctx, 50, startY + 380, maxValue);
        
        const link = document.createElement('a');
        link.download = `keyboard-heatmap-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }
    
    drawModernLegend(ctx, x, y, maxValue) {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(x - 10, y - 30, 300, 160);
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 10, y - 30, 300, 160);
        
        ctx.fillStyle = '#e4e4e7';
        ctx.font = 'bold 16px Inter, Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Heat Intensity', x, y - 10);
        
        const legendHeight = 12;
        const legendWidth = 24;
        
        for (let i = 0; i <= 10; i++) {
            const legendY = y + 10 + i * (legendHeight + 3);
            
            ctx.fillStyle = this.getHeatColor(i);
            ctx.fillRect(x, legendY, legendWidth, legendHeight);
            
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, legendY, legendWidth, legendHeight);
            
            ctx.fillStyle = '#a1a1aa';
            ctx.font = '12px Inter, Arial';
            if (i === 0) {
                ctx.fillText('No usage', x + legendWidth + 12, legendY + legendHeight / 2 + 4);
            } else {
                const value = Math.round((i / 10) * maxValue);
                ctx.fillText(`${value}+ presses`, x + legendWidth + 12, legendY + legendHeight / 2 + 4);
            }
        }
        
        ctx.fillStyle = '#71717a';
        ctx.font = '14px Inter, Arial';
        ctx.fillText('Session Statistics:', x + 150, y - 10);
        
        const sessionDuration = (Date.now() - this.sessionStartTime) / 1000 / 60;
        const wpm = sessionDuration > 0 ? Math.round(this.sessionWords / sessionDuration) : 0;
        
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '12px Inter, Arial';
        ctx.fillText(`Duration: ${Math.floor(sessionDuration)}m`, x + 150, y + 20);
        ctx.fillText(`WPM: ${wpm}`, x + 150, y + 40);
        ctx.fillText(`Keys: ${this.sessionKeyPresses.toLocaleString()}`, x + 150, y + 60);
        ctx.fillText(`Words: ${this.sessionWords}`, x + 150, y + 80);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new KeyboardHeatmap();
});
