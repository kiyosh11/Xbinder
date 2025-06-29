class AnimeKeybindManager {
    constructor() {
        this.isRecording = false;
        this.editingKeybind = null;
        this.settings = {
            navigationMode: 'keyboard',
            followMouse: false,
            showIndicators: true,
            autoScroll: true,
            soundEffects: false,
            highlightStyle: 'anime',
            animationSpeed: 'normal',
            smartNavigation: true,
            skipPromoted: true,
            loopNavigation: false,
            confirmActions: false,
            highlightOpacity: 80,
            quickActions: true
        };
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSettings();
        await this.loadKeybinds();
        this.updateUI();
        this.syncWithContentScript();
    }

    bindEvents() {
        document.getElementById('recordKey').addEventListener('click', () => this.toggleRecording());
        document.getElementById('addKeybind').addEventListener('click', () => this.addKeybind());
        document.getElementById('resetKeybinds').addEventListener('click', () => this.resetKeybinds());
    
        document.getElementById('mouseFollowToggle').addEventListener('click', () => this.toggleSetting('followMouse'));
        document.getElementById('indicatorsToggle').addEventListener('click', () => this.toggleSetting('showIndicators'));
        document.getElementById('autoScrollToggle').addEventListener('click', () => this.toggleSetting('autoScroll'));
        document.getElementById('soundEffectsToggle').addEventListener('click', () => this.toggleSetting('soundEffects'));
        document.getElementById('smartNavToggle').addEventListener('click', () => this.toggleSetting('smartNavigation'));
        document.getElementById('skipPromotedToggle').addEventListener('click', () => this.toggleSetting('skipPromoted'));
        document.getElementById('loopNavToggle').addEventListener('click', () => this.toggleSetting('loopNavigation'));
        document.getElementById('confirmActionsToggle').addEventListener('click', () => this.toggleSetting('confirmActions'));
        document.getElementById('quickActionsToggle').addEventListener('click', () => this.toggleSetting('quickActions'));
        
        document.getElementById('navMode').addEventListener('change', (e) => this.updateSetting('navigationMode', e.target.value));
        document.getElementById('highlightStyle').addEventListener('change', (e) => this.updateSetting('highlightStyle', e.target.value));
        document.getElementById('animationSpeed').addEventListener('change', (e) => this.updateSetting('animationSpeed', e.target.value));
        
        const opacitySlider = document.getElementById('highlightOpacity');
        opacitySlider.addEventListener('input', (e) => {
            this.updateSetting('highlightOpacity', parseInt(e.target.value));
            document.querySelector('.slider-value').textContent = e.target.value + '%';
        });
        
        document.getElementById('searchKeybinds').addEventListener('input', (e) => this.filterKeybinds(e.target.value));
        
        document.getElementById('exportSettings').addEventListener('click', () => this.exportSettings());
        document.getElementById('importSettings').addEventListener('click', () => this.importSettings());
        document.getElementById('exportKeybinds').addEventListener('click', () => this.exportKeybinds());
        document.getElementById('importKeybinds').addEventListener('click', () => this.importKeybinds());
        document.getElementById('importFile').addEventListener('change', (e) => this.handleImportFile(e));
        document.getElementById('resetSettings').addEventListener('click', () => this.resetSettings());
        document.getElementById('resetAll').addEventListener('click', () => this.resetAll());
        
        document.getElementById('setupBasic').addEventListener('click', () => this.setupBasicKeybinds());
        document.getElementById('setupAdvanced').addEventListener('click', () => this.setupAdvancedKeybinds());
        document.getElementById('setupGamer').addEventListener('click', () => this.setupGamerKeybinds());
        document.getElementById('setupPowerUser').addEventListener('click', () => this.setupPowerUserKeybinds());
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    toggleRecording() {
        const btn = document.getElementById('recordKey');
        const input = document.getElementById('keyCombo');
        
        if (this.isRecording) {
            this.isRecording = false;
            btn.textContent = 'Record Key';
            btn.classList.remove('recording');
            const hint = document.querySelector('.recording-hint');
            if (hint) hint.remove();
        } else {
            this.isRecording = true;
            btn.textContent = 'Stop Recording';
            btn.classList.add('recording');
            input.value = '';
            
            const hint = document.createElement('div');
            hint.className = 'recording-hint';
            hint.textContent = '🎯 Press any key combination... (ESC to cancel)';
            btn.parentNode.appendChild(hint);
        }
    }

    handleKeyDown(e) {
        if (!this.isRecording) return;
        
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
            this.toggleRecording();
            return;
        }

        const parts = [];
        if (e.ctrlKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        if (e.metaKey) parts.push('meta');

        const key = e.key.toLowerCase();
        if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
            parts.push(key);
            const combo = parts.join('+');
            document.getElementById('keyCombo').value = combo;
            this.toggleRecording();
        }
    }

    toggleSetting(settingName) {
        this.settings[settingName] = !this.settings[settingName];
        this.updateUI();
        this.saveSettings();
        this.syncWithContentScript();
        
        const messages = {
            followMouse: this.settings.followMouse ? 'Mouse follow enabled 🖱️' : 'Mouse follow disabled ⌨️',
            showIndicators: this.settings.showIndicators ? 'Indicators enabled 📊' : 'Indicators disabled 🔇',
            autoScroll: this.settings.autoScroll ? 'Auto scroll enabled 📜' : 'Auto scroll disabled 🚫',
            soundEffects: this.settings.soundEffects ? 'Sound effects enabled 🔊' : 'Sound effects disabled 🔇',
            smartNavigation: this.settings.smartNavigation ? 'Smart navigation enabled 🧠' : 'Smart navigation disabled 🤖',
            skipPromoted: this.settings.skipPromoted ? 'Skip promoted tweets ⏭️' : 'Include promoted tweets 📢',
            loopNavigation: this.settings.loopNavigation ? 'Loop navigation enabled 🔄' : 'Loop navigation disabled ➡️',
            confirmActions: this.settings.confirmActions ? 'Action confirmation enabled ✅' : 'Action confirmation disabled ⚡',
            quickActions: this.settings.quickActions ? 'Quick actions enabled ⚡' : 'Quick actions disabled 🐌'
        };
        
        this.showNotification(messages[settingName], 'info');
    }

    updateSetting(settingName, value) {
        this.settings[settingName] = value;
        this.saveSettings();
        this.syncWithContentScript();
        
        const messages = {
            navigationMode: `Navigation mode: ${String(value).toUpperCase()} 🎮`,
            highlightStyle: `Highlight style: ${String(value).toUpperCase()} ✨`,
            animationSpeed: `Animation speed: ${String(value).toUpperCase()} ⚡`
        };
        
        if (messages[settingName]) {
            this.showNotification(messages[settingName], 'info');
        }
    }

    updateUI() {
        const toggles = {
            mouseFollowToggle: this.settings.followMouse,
            indicatorsToggle: this.settings.showIndicators,
            autoScrollToggle: this.settings.autoScroll,
            soundEffectsToggle: this.settings.soundEffects,
            smartNavToggle: this.settings.smartNavigation,
            skipPromotedToggle: this.settings.skipPromoted,
            loopNavToggle: this.settings.loopNavigation,
            confirmActionsToggle: this.settings.confirmActions,
            quickActionsToggle: this.settings.quickActions
        };

        Object.entries(toggles).forEach(([id, active]) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.classList.toggle('active', active);
            }
        });

        document.getElementById('navMode').value = this.settings.navigationMode;
        document.getElementById('highlightStyle').value = this.settings.highlightStyle;
        document.getElementById('animationSpeed').value = this.settings.animationSpeed;
        
        document.getElementById('highlightOpacity').value = this.settings.highlightOpacity;
        document.querySelector('.slider-value').textContent = this.settings.highlightOpacity + '%';
    }

    async addKeybind() {
        const name = document.getElementById('keybindName').value.trim() || 'Unnamed Action';
        const keyCombo = document.getElementById('keyCombo').value.trim();
        const action = document.getElementById('action').value;

        if (!keyCombo) {
            this.showNotification('Please record a key combination', 'error');
            return;
        }

        if (!action) {
            this.showNotification('Please select an action', 'error');
            return;
        }

        const keybinds = await this.getKeybinds();
        
        if (keybinds.some(kb => kb.key === keyCombo)) {
            this.showNotification('This key combination is already assigned', 'error');
            return;
        }

        keybinds.push({ 
            key: keyCombo, 
            action, 
            data: { name: name },
            created: Date.now()
        });
        
        await this.saveKeybinds(keybinds);
        
        document.getElementById('keybindName').value = '';
        document.getElementById('keyCombo').value = '';
        document.getElementById('action').value = '';
        
        await this.loadKeybinds();
        this.showNotification('Keybind added successfully! ✨', 'success');
    }

    async editKeybind(keybind) {
        this.editingKeybind = keybind;
        
        const modal = this.createEditModal(keybind);
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('active'), 10);
    }

    createEditModal(keybind) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <h3>Edit Keybind</h3>
                <div class="form-group">
                    <label for="editName">Name:</label>
                    <input type="text" id="editName" value="${keybind.data?.name || 'Unnamed'}" maxlength="50">
                </div>
                <div class="form-group">
                    <label for="editKey">Key Combination:</label>
                    <input type="text" id="editKey" value="${keybind.key}" readonly>
                    <button id="editRecordKey" class="btn-record">Change Key</button>
                </div>
                <div class="button-group">
                    <button id="saveEdit" class="btn-primary">Save Changes</button>
                    <button id="cancelEdit" class="btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        
        modal.querySelector('#editRecordKey').addEventListener('click', () => this.startEditKeyRecording(modal));
        modal.querySelector('#saveEdit').addEventListener('click', () => this.saveKeybindEdit(modal));
        modal.querySelector('#cancelEdit').addEventListener('click', () => this.closeEditModal(modal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeEditModal(modal);
        });
        
        return modal;
    }

    startEditKeyRecording(modal) {
        const btn = modal.querySelector('#editRecordKey');
        const input = modal.querySelector('#editKey');
        
        btn.textContent = 'Press Key...';
        btn.classList.add('recording');
        input.value = '';
        
        const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (e.key === 'Escape') {
                input.value = this.editingKeybind.key;
                btn.textContent = 'Change Key';
                btn.classList.remove('recording');
                document.removeEventListener('keydown', handler, true);
                return;
            }
            
            const parts = [];
            if (e.ctrlKey) parts.push('ctrl');
            if (e.altKey) parts.push('alt');
            if (e.shiftKey) parts.push('shift');
            if (e.metaKey) parts.push('meta');
            
            const key = e.key.toLowerCase();
            if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
                parts.push(key);
                input.value = parts.join('+');
                btn.textContent = 'Change Key';
                btn.classList.remove('recording');
                document.removeEventListener('keydown', handler, true);
            }
        };
        
        document.addEventListener('keydown', handler, true);
    }

    async saveKeybindEdit(modal) {
        const newName = modal.querySelector('#editName').value.trim() || 'Unnamed';
        const newKey = modal.querySelector('#editKey').value.trim();
        
        if (!newKey) {
            this.showNotification('Please set a key combination', 'error');
            return;
        }
        
        const keybinds = await this.getKeybinds();
        const index = keybinds.findIndex(kb => kb.key === this.editingKeybind.key);
        
        if (index !== -1) {
            if (newKey !== this.editingKeybind.key && keybinds.some(kb => kb.key === newKey)) {
                this.showNotification('This key combination is already assigned', 'error');
                return;
            }
            
            keybinds[index].key = newKey;
            keybinds[index].data.name = newName;
            
            await this.saveKeybinds(keybinds);
            await this.loadKeybinds();
            
            this.showNotification('Keybind updated successfully! ✨', 'success');
        }
        
        this.closeEditModal(modal);
    }

    closeEditModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
        this.editingKeybind = null;
    }

    async deleteKeybind(keyCombo) {
        if (confirm('Are you sure you want to delete this keybind?')) {
            const keybinds = await this.getKeybinds();
            const filtered = keybinds.filter(kb => kb.key !== keyCombo);
            await this.saveKeybinds(filtered);
            await this.loadKeybinds();
            this.showNotification('Keybind deleted', 'info');
        }
    }

    filterKeybinds(searchTerm) {
        const items = document.querySelectorAll('.keybind-item');
        const term = searchTerm.toLowerCase();
        
        items.forEach(item => {
            const name = item.querySelector('.keybind-name').textContent.toLowerCase();
            const key = item.querySelector('.keybind-key').textContent.toLowerCase();
            const action = item.querySelector('.keybind-action').textContent.toLowerCase();
            
            const matches = name.includes(term) || key.includes(term) || action.includes(term);
            item.style.display = matches ? 'flex' : 'none';
        });
    }

    async resetKeybinds() {
        if (confirm('Are you sure you want to delete all keybinds? This cannot be undone.')) {
            await this.saveKeybinds([]);
            await this.loadKeybinds();
            this.showNotification('All keybinds reset', 'info');
        }
    }

    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            this.settings = {
                navigationMode: 'keyboard',
                followMouse: false,
                showIndicators: true,
                autoScroll: true,
                soundEffects: false,
                highlightStyle: 'anime',
                animationSpeed: 'normal',
                smartNavigation: true,
                skipPromoted: true,
                loopNavigation: false,
                confirmActions: false,
                highlightOpacity: 80,
                quickActions: true
            };
            this.updateUI();
            this.saveSettings();
            this.syncWithContentScript();
            this.showNotification('Settings reset to default ⚙️', 'info');
        }
    }

    async resetAll() {
        if (confirm('Are you sure you want to reset EVERYTHING? This will delete all keybinds and settings. This cannot be undone!')) {
            await this.saveKeybinds([]);
            await this.resetSettings();
            this.showNotification('Everything has been reset! 🔄', 'info');
        }
    }

    async setupBasicKeybinds() {
        if (confirm('This will add basic keybinds. Continue?')) {
            const basicKeybinds = [
                { key: 'j', action: 'nextTweet', data: { name: 'Next Tweet' } },
                { key: 'k', action: 'prevTweet', data: { name: 'Previous Tweet' } },
                { key: 'l', action: 'like', data: { name: 'Like Tweet' } },
                { key: 'r', action: 'retweet', data: { name: 'Retweet' } },
                { key: 'c', action: 'compose', data: { name: 'Compose Tweet' } },
                { key: 'h', action: 'home', data: { name: 'Go Home' } },
                { key: 's', action: 'search', data: { name: 'Search' } }
            ];
            
            await this.saveKeybinds(basicKeybinds);
            await this.loadKeybinds();
            this.showNotification('Basic keybinds setup complete! ⚡', 'success');
        }
    }

    async setupAdvancedKeybinds() {
        if (confirm('This will add advanced keybinds. Continue?')) {
            const advancedKeybinds = [
                { key: 'j', action: 'nextTweet', data: { name: 'Next Tweet' } },
                { key: 'k', action: 'prevTweet', data: { name: 'Previous Tweet' } },
                { key: 'l', action: 'like', data: { name: 'Like Tweet' } },
                { key: 'r', action: 'retweet', data: { name: 'Retweet' } },
                { key: 'b', action: 'bookmark', data: { name: 'Bookmark' } },
                { key: 'q', action: 'quote', data: { name: 'Quote Tweet' } },
                { key: 'c', action: 'compose', data: { name: 'Compose Tweet' } },
                { key: 'h', action: 'home', data: { name: 'Go Home' } },
                { key: 'e', action: 'explore', data: { name: 'Explore' } },
                { key: 'n', action: 'notifications', data: { name: 'Notifications' } },
                { key: 'm', action: 'messages', data: { name: 'Messages' } },
                { key: 's', action: 'search', data: { name: 'Search' } },
                { key: 'f', action: 'follow', data: { name: 'Follow User' } },
                { key: 'u', action: 'openProfile', data: { name: 'Open Profile' } },
                { key: 't', action: 'openThread', data: { name: 'Open Thread' } },
                { key: 'ctrl+c', action: 'copy', data: { name: 'Copy Link' } },
                { key: 'ctrl+shift+c', action: 'copyText', data: { name: 'Copy Text' } },
                { key: 'ctrl+enter', action: 'newTab', data: { name: 'Open in New Tab' } }
            ];
            
            await this.saveKeybinds(advancedKeybinds);
            await this.loadKeybinds();
            this.showNotification('Advanced keybinds setup complete! 🚀', 'success');
        }
    }

    async setupGamerKeybinds() {
        if (confirm('This will add gamer-style keybinds (WASD + more). Continue?')) {
            const gamerKeybinds = [
                { key: 'w', action: 'prevTweet', data: { name: 'Previous Tweet' } },
                { key: 's', action: 'nextTweet', data: { name: 'Next Tweet' } },
                { key: 'a', action: 'like', data: { name: 'Like Tweet' } },
                { key: 'd', action: 'retweet', data: { name: 'Retweet' } },
                { key: 'space', action: 'openThread', data: { name: 'Open Thread' } },
                { key: 'e', action: 'reply', data: { name: 'Reply' } },
                { key: 'q', action: 'bookmark', data: { name: 'Bookmark' } },
                { key: 'f', action: 'follow', data: { name: 'Follow User' } },
                { key: 'r', action: 'refresh', data: { name: 'Refresh' } },
                { key: 'tab', action: 'switchNavMode', data: { name: 'Switch Mode' } },
                { key: 'shift', action: 'toggleMouseFollow', data: { name: 'Toggle Mouse Follow' } },
                { key: 'ctrl', action: 'compose', data: { name: 'Compose' } },
                { key: '1', action: 'home', data: { name: 'Home' } },
                { key: '2', action: 'explore', data: { name: 'Explore' } },
                { key: '3', action: 'notifications', data: { name: 'Notifications' } },
                { key: '4', action: 'messages', data: { name: 'Messages' } }
            ];
            
            await this.saveKeybinds(gamerKeybinds);
            await this.loadKeybinds();
            this.showNotification('Gamer keybinds setup complete! 🎮', 'success');
        }
    }

    async setupPowerUserKeybinds() {
        if (confirm('This will add power user keybinds with advanced features. Continue?')) {
            const powerUserKeybinds = [
                { key: 'j', action: 'nextTweet', data: { name: 'Next Tweet' } },
                { key: 'k', action: 'prevTweet', data: { name: 'Previous Tweet' } },
                { key: 'g', action: 'firstTweet', data: { name: 'First Tweet' } },
                { key: 'shift+g', action: 'lastTweet', data: { name: 'Last Tweet' } },
                { key: 'ctrl+r', action: 'randomTweet', data: { name: 'Random Tweet' } },          
                { key: 'l', action: 'like', data: { name: 'Like Tweet' } },
                { key: 'r', action: 'retweet', data: { name: 'Retweet' } },
                { key: 'b', action: 'bookmark', data: { name: 'Bookmark' } },
                { key: 'q', action: 'quote', data: { name: 'Quote Tweet' } },
                { key: 'shift+r', action: 'reply', data: { name: 'Reply' } },
                { key: 'f', action: 'follow', data: { name: 'Follow User' } },
                { key: 'shift+f', action: 'unfollow', data: { name: 'Unfollow User' } },
                { key: 'm', action: 'mute', data: { name: 'Mute User' } },
                { key: 'shift+m', action: 'unmute', data: { name: 'Unmute User' } },
                { key: 'h', action: 'home', data: { name: 'Home' } },
                { key: 'e', action: 'explore', data: { name: 'Explore' } },
                { key: 'n', action: 'notifications', data: { name: 'Notifications' } },
                { key: 'p', action: 'profile', data: { name: 'Profile' } },
                { key: 's', action: 'search', data: { name: 'Search' } },
                { key: 'c', action: 'compose', data: { name: 'Compose' } },
                { key: 'ctrl+c', action: 'copy', data: { name: 'Copy Link' } },
                { key: 'ctrl+shift+c', action: 'copyText', data: { name: 'Copy Text' } },
                { key: 'ctrl+enter', action: 'newTab', data: { name: 'Open in New Tab' } },
                { key: 'f11', action: 'fullscreen', data: { name: 'Fullscreen' } },
                { key: 'ctrl+shift+r', action: 'refresh', data: { name: 'Refresh' } },
                { key: 'ctrl+shift+e', action: 'exportTweets', data: { name: 'Export Tweets' } },
                { key: 'ctrl+shift+s', action: 'screenshot', data: { name: 'Screenshot' } },
                { key: 'alt+m', action: 'toggleMouseFollow', data: { name: 'Toggle Mouse Follow' } },
                { key: 'alt+n', action: 'switchNavMode', data: { name: 'Switch Nav Mode' } },
                { key: 'alt+s', action: 'toggleSidebar', data: { name: 'Toggle Sidebar' } },
                { key: 'alt+d', action: 'toggleDarkMode', data: { name: 'Toggle Dark Mode' } }
            ];
            
            await this.saveKeybinds(powerUserKeybinds);
            await this.loadKeybinds();
            this.showNotification('Power user keybinds setup complete! 💪', 'success');
        }
    }

    exportSettings() {
        const data = {
            settings: this.settings,
            keybinds: [],
            exportDate: new Date().toISOString(),
            version: '2.0',
            type: 'full'
        };
        
        this.getKeybinds().then(keybinds => {
            data.keybinds = keybinds;
            this.downloadJSON(data, `anime-x-keybinds-full-${new Date().toISOString().split('T')[0]}.json`);
            this.showNotification('Full settings exported successfully! 📤', 'success');
        });
    }

    exportKeybinds() {
        this.getKeybinds().then(keybinds => {
            const data = {
                keybinds: keybinds,
                exportDate: new Date().toISOString(),
                version: '2.0',
                type: 'keybinds'
            };
            this.downloadJSON(data, `anime-x-keybinds-only-${new Date().toISOString().split('T')[0]}.json`);
            this.showNotification('Keybinds exported successfully! 📋', 'success');
        });
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    importSettings() {
        document.getElementById('importFile').click();
    }

    importKeybinds() {
        document.getElementById('importFile').click();
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.type === 'full' || !data.type) {
                    if (data.settings) {
                        this.settings = { ...this.settings, ...data.settings };
                        this.updateUI();
                        this.saveSettings();
                        this.syncWithContentScript();
                    }
                    
                    if (data.keybinds && Array.isArray(data.keybinds)) {
                        this.saveKeybinds(data.keybinds).then(() => {
                            this.loadKeybinds();
                        });
                    }
                    
                    this.showNotification('Full settings imported successfully! 📥', 'success');
                } else if (data.type === 'keybinds') {
                    if (data.keybinds && Array.isArray(data.keybinds)) {
                        this.saveKeybinds(data.keybinds).then(() => {
                            this.loadKeybinds();
                        });
                        this.showNotification('Keybinds imported successfully! 📋', 'success');
                    }
                } else {
                    this.showNotification('Unknown file format', 'error');
                }
            } catch (error) {
                this.showNotification('Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    async syncWithContentScript() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && (tab.url.includes('x.com') || tab.url.includes('twitter.com'))) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'SETTINGS_UPDATE',
                    settings: this.settings
                });
            }
        } catch (error) {
            console.log('Could not sync with content script:', error);
        }
    }

    async getKeybinds() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['keybinds'], (result) => {
                resolve(result.keybinds || []);
            });
        });
    }

    async saveKeybinds(keybinds) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ keybinds }, resolve);
        });
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['settings'], (result) => {
                this.settings = { ...this.settings, ...result.settings };
                resolve();
            });
        });
    }

    async saveSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ settings: this.settings }, resolve);
        });
    }

    async loadKeybinds() {
        const keybinds = await this.getKeybinds();
        const container = document.getElementById('keybindsList');
        const countElement = document.getElementById('keybindCount');
        
        countElement.textContent = `${keybinds.length} keybind${keybinds.length !== 1 ? 's' : ''}`;
        
        if (keybinds.length === 0) {
            container.innerHTML = '<div class="empty-state">No keybinds configured yet<br>Add some to get started! 🚀</div>';
            return;
        }

        const actionLabels = {
            like: '❤️ Like current tweet',
            retweet: '🔄 Retweet current tweet',
            reply: '💬 Reply to current tweet',
            bookmark: '🔖 Bookmark tweet',
            share: '📤 Share tweet',
            quote: '💭 Quote tweet',
            copy: '🔗 Copy tweet link',
            copyText: '📝 Copy tweet text',
            openThread: '🧵 Open thread',
            openProfile: '👤 Open user profile',
            viewImage: '🖼️ View tweet image',
            analytics: '📊 View analytics',
            embed: '📋 Embed tweet',
            delete: '🗑️ Delete tweet',
            edit: '✏️ Edit tweet',
            pin: '📌 Pin tweet',
            hide: '👁️ Hide tweet',
            report: '🚨 Report tweet',
            follow: '➕ Follow user',
            unfollow: '➖ Unfollow user',
            mute: '🔇 Mute user',
            unmute: '🔊 Unmute user',
            block: '🚫 Block user',
            unblock: '✅ Unblock user',
            addToList: '📋 Add to list',
            viewLists: '📋 View user lists',
            sendDM: '💌 Send DM',
            viewFollowers: '👥 View followers',
            viewFollowing: '👥 View following',
            compose: '✨ Compose new tweet',
            home: '🏠 Go to Home',
            explore: '🔍 Go to Explore',
            notifications: '🔔 Go to Notifications',
            messages: '💌 Go to Messages',
            bookmarks: '🔖 Go to Bookmarks',
            lists: '📋 Go to Lists',
            communities: '🏘️ Go to Communities',
            profile: '👤 Go to Profile',
            settings: '⚙️ Go to Settings',
            search: '🔍 Focus search bar',
            trending: '📈 View trending',
            moments: '⚡ View moments',
            nextTweet: '⬇️ Next tweet',
            prevTweet: '⬆️ Previous tweet',
            firstTweet: '⏫ First tweet',
            lastTweet: '⏬ Last tweet',
            randomTweet: '🎲 Random tweet',
            toggleMouseFollow: '🖱️ Toggle mouse follow',
            switchNavMode: '🎮 Switch navigation mode',
            toggleSidebar: '📱 Toggle sidebar',
            toggleDarkMode: '🌙 Toggle dark mode',
            fullscreen: '🖥️ Toggle fullscreen',
            refresh: '🔄 Refresh page',
            newTab: '🆕 Open in new tab',
            closeTab: '❌ Close tab',
            autoScroll: '🔄 Start auto scroll',
            stopAutoScroll: '⏹️ Stop auto scroll',
            exportTweets: '📤 Export visible tweets',
            screenshot: '📸 Screenshot tweet'
        };

        container.innerHTML = keybinds.map(kb => {
            const actionText = actionLabels[kb.action] || kb.action;
            
            return `
                <div class="keybind-item">
                    <div class="keybind-info">
                        <div class="keybind-name">${kb.data?.name || 'Unnamed Action'}</div>
                        <div class="keybind-key">${kb.key}</div>
                        <div class="keybind-action">${actionText}</div>
                    </div>
                    <div class="keybind-actions">
                        <button class="btn-edit" data-key="${kb.key}">Edit</button>
                        <button class="btn-delete" data-key="${kb.key}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const keybind = keybinds.find(kb => kb.key === btn.dataset.key);
                this.editKeybind(keybind);
            });
        });
        
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this.deleteKeybind(btn.dataset.key));
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            success: 'linear-gradient(135deg, #00d2d3, #f8b500)',
            error: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            info: 'linear-gradient(135deg, #ff6b9d, #c44569)'
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.3s ease;
            max-width: 300px;
            backdrop-filter: blur(10px);
        `;

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    new AnimeKeybindManager();
});