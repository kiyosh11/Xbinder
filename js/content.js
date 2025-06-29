class AnimeXKeybinds {
    constructor() {
        this.keybinds = [];
        this.currentTweetIndex = 0;
        this.tweets = [];
        this.isReady = false;
        this.highlightBox = null;
        this.navIndicator = null;
        this.tweetCounter = null;
        this.mouseX = 0;
        this.mouseY = 0;
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
        
        console.log('Xbinder: Extension loaded');
        this.init();
    }

    async init() {
        try {
            await this.loadKeybinds();
            await this.loadSettings();
            this.createUI();
            this.bindKeyEvents();
            this.bindMouseEvents();
            this.observeTweets();
            this.isReady = true;
            console.log('🌸 Anime X.com Keybinds: Initialized with', this.keybinds.length, 'keybinds');
        
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.onChanged.addListener((changes, namespace) => {
                    if (namespace === 'sync') {
                        if (changes.keybinds) {
                            this.keybinds = changes.keybinds.newValue || [];
                            console.log('Xbinder: Updated keybinds:', this.keybinds);
                        }
                        if (changes.settings) {
                            this.settings = { ...this.settings, ...changes.settings.newValue };
                            this.updateUI();
                        }
                    }
                });
            }
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                    if (message.type === 'SETTINGS_UPDATE') {
                        this.settings = { ...this.settings, ...message.settings };
                        this.updateUI();
                        this.updateHighlightStyle();
                    }
                });
            }
        } catch (error) {
            console.error('Xbinder: Initialization error:', error);
        }
    }

    async loadKeybinds() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.sync.get(['keybinds'], (result) => {
                    this.keybinds = result.keybinds || [];
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async loadSettings() {
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.sync.get(['settings'], (result) => {
                    this.settings = { ...this.settings, ...result.settings };
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    createUI() {
        this.highlightBox = document.createElement('div');
        this.highlightBox.className = 'anime-tweet-highlight';
        this.highlightBox.style.display = 'none';
        this.updateHighlightStyle();
        document.body.appendChild(this.highlightBox);

        if (this.settings.showIndicators) {
            this.navIndicator = document.createElement('div');
            this.navIndicator.className = 'anime-nav-indicator';
            this.navIndicator.textContent = 'Navigation Mode: ' + this.settings.navigationMode.toUpperCase();
            document.body.appendChild(this.navIndicator);

            this.tweetCounter = document.createElement('div');
            this.tweetCounter.className = 'anime-tweet-counter';
            this.tweetCounter.textContent = '0 / 0';
            document.body.appendChild(this.tweetCounter);
        }
    }

    updateHighlightStyle() {
        if (!this.highlightBox) return;
        this.highlightBox.className = 'anime-tweet-highlight';
        this.highlightBox.classList.add(`style-${this.settings.highlightStyle}`);
        this.highlightBox.classList.add(`speed-${this.settings.animationSpeed}`);    
        this.highlightBox.style.opacity = this.settings.highlightOpacity / 100;
        if (this.settings.followMouse) {
            this.highlightBox.classList.add('mouse-follow');
        }
    }

    updateUI() {
        if (this.navIndicator) {
            this.navIndicator.textContent = 'Navigation Mode: ' + this.settings.navigationMode.toUpperCase();
            this.navIndicator.style.display = this.settings.showIndicators ? 'block' : 'none';
        }
        
        if (this.tweetCounter) {
            this.tweetCounter.style.display = this.settings.showIndicators ? 'block' : 'none';
        }
        
        this.updateHighlightStyle();
    }

    bindKeyEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.contentEditable === 'true' ||
                e.target.getAttribute('contenteditable') === 'true') {
                return;
            }

            const combo = this.getKeyCombo(e);
            const keybind = this.keybinds.find(kb => kb.key === combo);
            
            if (keybind) {
                console.log('Executing action:', keybind.action, 'for key:', combo);
                e.preventDefault();
                e.stopPropagation();
                
                if (this.settings.confirmActions && ['like', 'retweet', 'follow', 'block', 'mute'].includes(keybind.action)) {
                    if (confirm(`Confirm action: ${keybind.data?.name || keybind.action}?`)) {
                        this.executeAction(keybind.action, keybind.data);
                    }
                } else {
                    this.executeAction(keybind.action, keybind.data);
                }
                
                this.showNavIndicator();
            }
        }, true);
    }

    bindMouseEvents() {
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            
            if (this.settings.followMouse) {
                this.updateHighlightPosition();
            }
        });

        if (this.settings.navigationMode === 'mouse' || this.settings.navigationMode === 'both') {
            document.addEventListener('click', (e) => {
                const tweet = e.target.closest('article[data-testid="tweet"]');
                if (tweet && this.tweets.includes(tweet)) {
                    this.currentTweetIndex = this.tweets.indexOf(tweet);
                    this.highlightCurrentTweet();
                    this.updateTweetCounter();
                }
            });
        }
    }

    updateHighlightPosition() {
        if (!this.highlightBox || !this.settings.followMouse) return;
        const size = 200; 
        const x = this.mouseX - size / 2;
        const y = this.mouseY - size / 2;   
        this.highlightBox.style.display = 'block';
        this.highlightBox.style.left = x + 'px';
        this.highlightBox.style.top = y + 'px';
        this.highlightBox.style.width = size + 'px';
        this.highlightBox.style.height = size + 'px';
        this.highlightBox.style.position = 'fixed';
        this.highlightBox.style.pointerEvents = 'none';
        this.highlightBox.style.zIndex = '9999';
        this.highlightBox.style.borderRadius = '50%';
    }

    getKeyCombo(e) {
        const parts = [];
        if (e.ctrlKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');
        if (e.metaKey) parts.push('meta');
        parts.push(e.key.toLowerCase());
        return parts.join('+');
    }

    observeTweets() {
        this.updateTweetList();
        setInterval(() => this.updateTweetList(), 2000);
    }

    updateTweetList() {
        const tweetSelectors = [
            'article[data-testid="tweet"]',
            'div[data-testid="tweet"]',
            'article[role="article"]',
            '[data-testid="cellInnerDiv"] article'
        ];
        
        let tweets = [];
        for (const selector of tweetSelectors) {
            tweets = Array.from(document.querySelectorAll(selector));
            if (tweets.length > 0) break;
        }
        
        this.tweets = tweets.filter(tweet => {
            const isPromoted = tweet.textContent.includes('Promoted') || tweet.textContent.includes('Ad');
            const hasLikeButton = tweet.querySelector('[data-testid="like"], [aria-label*="like" i]');
            
            if (this.settings.skipPromoted && isPromoted) {
                return false;
            }
            
            return hasLikeButton;
        });
        
        if (this.currentTweetIndex >= this.tweets.length) {
            this.currentTweetIndex = Math.max(0, this.tweets.length - 1);
        }
        
        this.highlightCurrentTweet();
        this.updateTweetCounter();
    }

    highlightCurrentTweet() {
        if (!this.highlightBox || this.settings.followMouse) return;

        const tweet = this.getCurrentTweet();
        if (tweet) {
            const rect = tweet.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            this.highlightBox.style.display = 'block';
            this.highlightBox.style.position = 'absolute';
            this.highlightBox.style.left = (rect.left + scrollLeft - 10) + 'px';
            this.highlightBox.style.top = (rect.top + scrollTop - 10) + 'px';
            this.highlightBox.style.width = (rect.width + 20) + 'px';
            this.highlightBox.style.height = (rect.height + 20) + 'px';
            this.highlightBox.style.borderRadius = '16px';
        } else {
            this.highlightBox.style.display = 'none';
        }
    }

    updateTweetCounter() {
        if (this.tweetCounter) {
            this.tweetCounter.textContent = `${this.currentTweetIndex + 1} / ${this.tweets.length}`;
        }
    }

    showNavIndicator() {
        if (this.navIndicator && this.settings.showIndicators) {
            this.navIndicator.classList.add('show');
            setTimeout(() => {
                this.navIndicator?.classList.remove('show');
            }, 2000);
        }
    }

    executeAction(action, data) {
        console.log('Executing action:', action, data);
        
        switch (action) {
            case 'like':
                this.likeTweet();
                break;
            case 'retweet':
                this.retweetTweet();
                break;
            case 'reply':
                this.replyToTweet();
                break;
            case 'bookmark':
                this.bookmarkTweet();
                break;
            case 'share':
                this.shareTweet();
                break;
            case 'quote':
                this.quoteTweet();
                break;
            case 'copy':
                this.copyTweetLink();
                break;
            case 'copyText':
                this.copyTweetText();
                break;
            case 'openThread':
                this.openThread();
                break;
            case 'openProfile':
                this.openProfile();
                break;
            case 'viewImage':
                this.viewImage();
                break;
            case 'analytics':
                this.viewAnalytics();
                break;
            case 'embed':
                this.embedTweet();
                break;
            case 'delete':
                this.deleteTweet();
                break;
            case 'edit':
                this.editTweet();
                break;
            case 'pin':
                this.pinTweet();
                break;
            case 'hide':
                this.hideTweet();
                break;
            case 'report':
                this.reportTweet();
                break;
            case 'follow':
                this.followUser();
                break;
            case 'unfollow':
                this.unfollowUser();
                break;
            case 'mute':
                this.muteUser();
                break;
            case 'unmute':
                this.unmuteUser();
                break;
            case 'block':
                this.blockUser();
                break;
            case 'unblock':
                this.unblockUser();
                break;
            case 'addToList':
                this.addToList();
                break;
            case 'viewLists':
                this.viewLists();
                break;
            case 'sendDM':
                this.sendDM();
                break;
            case 'viewFollowers':
                this.viewFollowers();
                break;
            case 'viewFollowing':
                this.viewFollowing();
                break;
            case 'compose':
                this.composeTweet();
                break;
            case 'home':
                this.navigateTo('/home');
                break;
            case 'explore':
                this.navigateTo('/explore');
                break;
            case 'notifications':
                this.navigateTo('/notifications');
                break;
            case 'messages':
                this.navigateTo('/messages');
                break;
            case 'bookmarks':
                this.navigateTo('/i/bookmarks');
                break;
            case 'lists':
                this.navigateTo('/i/lists');
                break;
            case 'communities':
                this.navigateTo('/i/communities');
                break;
            case 'profile':
                this.goToProfile();
                break;
            case 'settings':
                this.navigateTo('/settings');
                break;
            case 'search':
                this.focusSearch();
                break;
            case 'trending':
                this.viewTrending();
                break;
            case 'moments':
                this.viewMoments();
                break;
            case 'nextTweet':
                this.nextTweet();
                break;
            case 'prevTweet':
                this.prevTweet();
                break;
            case 'firstTweet':
                this.firstTweet();
                break;
            case 'lastTweet':
                this.lastTweet();
                break;
            case 'randomTweet':
                this.randomTweet();
                break;
            case 'toggleMouseFollow':
                this.toggleMouseFollow();
                break;
            case 'switchNavMode':
                this.switchNavigationMode();
                break;
            case 'toggleSidebar':
                this.toggleSidebar();
                break;
            case 'toggleDarkMode':
                this.toggleDarkMode();
                break;
            case 'fullscreen':
                this.toggleFullscreen();
                break;
            case 'refresh':
                this.refreshPage();
                break;
            case 'newTab':
                this.openInNewTab();
                break;
            case 'closeTab':
                this.closeTab();
                break;
            case 'autoScroll':
                this.startAutoScroll();
                break;
            case 'stopAutoScroll':
                this.stopAutoScroll();
                break;
            case 'exportTweets':
                this.exportTweets();
                break;
            case 'screenshot':
                this.screenshotTweet();
                break;
            default:
                console.warn('🌸 Unknown action:', action);
        }
    }

    getCurrentTweet() {
        if (this.settings.followMouse) {
            const elements = document.elementsFromPoint(this.mouseX, this.mouseY);
            for (const element of elements) {
                const tweet = element.closest('article[data-testid="tweet"]');
                if (tweet && this.tweets.includes(tweet)) {
                    return tweet;
                }
            }
        }
        return this.tweets[this.currentTweetIndex];
    }

    likeTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const likeSelectors = [
            '[data-testid="like"]',
            '[aria-label*="Like" i]',
            '[aria-label*="like" i]',
            'button[data-testid="like"]',
            '[role="button"][aria-label*="like" i]'
        ];
        
        for (const selector of likeSelectors) {
            const likeButton = tweet.querySelector(selector);
            if (likeButton) {
                likeButton.click();
                this.showActionFeedback('❤️ Liked!');
                this.playSound('like');
                return;
            }
        }
    }

    retweetTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const retweetButton = tweet.querySelector('[data-testid="retweet"], [aria-label*="Retweet"], [aria-label*="retweet"]');
        if (retweetButton) {
            retweetButton.click();
            setTimeout(() => {
                const retweetOption = document.querySelector('[data-testid="retweetConfirm"], [role="menuitem"]:has-text("Retweet")');
                if (retweetOption) {
                    retweetOption.click();
                    this.showActionFeedback('🔄 Retweeted!');
                    this.playSound('retweet');
                }
            }, 100);
        }
    }

    quoteTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const retweetButton = tweet.querySelector('[data-testid="retweet"], [aria-label*="Retweet"], [aria-label*="retweet"]');
        if (retweetButton) {
            retweetButton.click();
            setTimeout(() => {
                const quoteOption = document.querySelector('[data-testid="quotetweet"], [role="menuitem"]:has-text("Quote"), [role="menuitem"]:has-text("Quote Tweet")');
                if (quoteOption) {
                    quoteOption.click();
                    this.showActionFeedback('💭 Quote tweet opened!');
                    this.playSound('quote');
                } else {
                    const directQuoteBtn = document.querySelector('a[href*="/compose/tweet?url="], [aria-label*="Quote"]');
                    if (directQuoteBtn) {
                        directQuoteBtn.click();
                        this.showActionFeedback('💭 Quote tweet opened!');
                        this.playSound('quote');
                    }
                }
            }, 100);
        }
    }

    replyToTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const replyButton = tweet.querySelector('[data-testid="reply"], [aria-label*="Reply"], [aria-label*="reply"]');
        if (replyButton) {
            replyButton.click();
            this.showActionFeedback('💬 Reply opened!');
            this.playSound('reply');
        }
    }

    bookmarkTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const bookmarkButton = tweet.querySelector('[data-testid="bookmark"], [aria-label*="Bookmark"], [aria-label*="bookmark"]');
        if (bookmarkButton) {
            bookmarkButton.click();
            this.showActionFeedback('🔖 Bookmarked!');
            this.playSound('bookmark');
        }
    }

    shareTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const shareButton = tweet.querySelector('[data-testid="share"], [aria-label*="Share"], [aria-label*="share"]');
        if (shareButton) {
            shareButton.click();
            this.showActionFeedback('📤 Share menu opened!');
            this.playSound('share');
        }
    }

    copyTweetLink() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        if (tweetLink) {
            const url = tweetLink.href;
            navigator.clipboard.writeText(url).then(() => {
                this.showActionFeedback('🔗 Link copied!');
                this.playSound('copy');
            });
        }
    }

    copyTweetText() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const tweetText = tweet.querySelector('[data-testid="tweetText"], [lang]');
        if (tweetText) {
            navigator.clipboard.writeText(tweetText.textContent).then(() => {
                this.showActionFeedback('📝 Text copied!');
                this.playSound('copy');
            });
        }
    }

    openThread() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        if (tweetLink) {
            tweetLink.click();
            this.showActionFeedback('🧵 Thread opened!');
            this.playSound('thread');
        }
    }

    openProfile() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const profileLink = tweet.querySelector('a[href*="/"][role="link"]:not([href*="/status/"])');
        if (profileLink) {
            profileLink.click();
            this.showActionFeedback('👤 Profile opened!');
            this.playSound('navigate');
        }
    }

    viewImage() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const imageLink = tweet.querySelector('a[href*="/photo/"], img[src*="media"]');
        if (imageLink) {
            imageLink.click();
            this.showActionFeedback('🖼️ Image opened!');
            this.playSound('view');
        }
    }

    viewAnalytics() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const analyticsButton = tweet.querySelector('[data-testid="analytics"], [aria-label*="analytics" i]');
        if (analyticsButton) {
            analyticsButton.click();
            this.showActionFeedback('📊 Analytics opened!');
            this.playSound('analytics');
        }
    }

    embedTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const embedButton = document.querySelector('[role="menuitem"]:has-text("Embed"), [data-testid*="embed"]');
                if (embedButton) {
                    embedButton.click();
                    this.showActionFeedback('📋 Embed opened!');
                    this.playSound('embed');
                }
            }, 100);
        }
    }

    deleteTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const deleteButton = document.querySelector('[data-testid*="delete"], [role="menuitem"]:has-text("Delete")');
                if (deleteButton) {
                    deleteButton.click();
                    this.showActionFeedback('🗑️ Delete initiated!');
                    this.playSound('delete');
                }
            }, 100);
        }
    }

    editTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const editButton = document.querySelector('[data-testid*="edit"], [role="menuitem"]:has-text("Edit")');
                if (editButton) {
                    editButton.click();
                    this.showActionFeedback('✏️ Edit opened!');
                    this.playSound('edit');
                }
            }, 100);
        }
    }

    pinTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const pinButton = document.querySelector('[data-testid*="pin"], [role="menuitem"]:has-text("Pin")');
                if (pinButton) {
                    pinButton.click();
                    this.showActionFeedback('📌 Tweet pinned!');
                    this.playSound('pin');
                }
            }, 100);
        }
    }

    hideTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const hideButton = document.querySelector('[role="menuitem"]:has-text("Hide"), [data-testid*="hide"]');
                if (hideButton) {
                    hideButton.click();
                    this.showActionFeedback('👁️ Tweet hidden!');
                    this.playSound('hide');
                }
            }, 100);
        }
    }

    reportTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const reportButton = document.querySelector('[role="menuitem"]:has-text("Report"), [data-testid*="report"]');
                if (reportButton) {
                    reportButton.click();
                    this.showActionFeedback('🚨 Report opened!');
                    this.playSound('report');
                }
            }, 100);
        }
    }

    followUser() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        const followSelectors = [
            '[data-testid*="follow"]:not([data-testid*="unfollow"])',
            '[aria-label*="Follow"]:not([aria-label*="Unfollow"])',
            'button:has-text("Follow"):not(:has-text("Unfollow"))',
            '[role="button"]:has-text("Follow"):not(:has-text("Following"))'
        ];
        
        for (const selector of followSelectors) {
            const followButton = tweet.querySelector(selector) || document.querySelector(selector);
            if (followButton && followButton.textContent.includes('Follow') && !followButton.textContent.includes('Following')) {
                followButton.click();
                this.showActionFeedback('➕ User followed!');
                this.playSound('follow');
                return;
            }
        }
    }

    unfollowUser() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        const unfollowSelectors = [
            '[data-testid*="unfollow"]',
            '[aria-label*="Unfollow"]',
            'button:has-text("Following")',
            '[role="button"]:has-text("Following")'
        ];
        
        for (const selector of unfollowSelectors) {
            const unfollowButton = tweet.querySelector(selector) || document.querySelector(selector);
            if (unfollowButton) {
                unfollowButton.click();
                this.showActionFeedback('➖ User unfollowed!');
                this.playSound('unfollow');
                return;
            }
        }
    }

    muteUser() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const muteButton = document.querySelector('[data-testid*="mute"], [role="menuitem"]:has-text("Mute")');
                if (muteButton) {
                    muteButton.click();
                    this.showActionFeedback('🔇 User muted!');
                    this.playSound('mute');
                }
            }, 100);
        }
    }

    unmuteUser() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const unmuteButton = document.querySelector('[role="menuitem"]:has-text("Unmute"), [data-testid*="unmute"]');
                if (unmuteButton) {
                    unmuteButton.click();
                    this.showActionFeedback('🔊 User unmuted!');
                    this.playSound('unmute');
                }
            }, 100);
        }
    }

    blockUser() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const blockButton = document.querySelector('[data-testid*="block"], [role="menuitem"]:has-text("Block")');
                if (blockButton) {
                    blockButton.click();
                    this.showActionFeedback('🚫 User blocked!');
                    this.playSound('block');
                }
            }, 100);
        }
    }

    unblockUser() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const unblockButton = document.querySelector('[role="menuitem"]:has-text("Unblock"), [data-testid*="unblock"]');
                if (unblockButton) {
                    unblockButton.click();
                    this.showActionFeedback('✅ User unblocked!');
                    this.playSound('unblock');
                }
            }, 100);
        }
    }

    addToList() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const moreButton = tweet.querySelector('[data-testid="caret"], [aria-label*="More"]');
        if (moreButton) {
            moreButton.click();
            setTimeout(() => {
                const listButton = document.querySelector('[role="menuitem"]:has-text("Add"), [role="menuitem"]:has-text("List")');
                if (listButton) {
                    listButton.click();
                    this.showActionFeedback('📋 Add to list opened!');
                    this.playSound('list');
                }
            }, 100);
        }
    }

    viewLists() {
        this.navigateTo('/i/lists');
        this.showActionFeedback('📋 Lists opened!');
        this.playSound('navigate');
    }

    sendDM() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const shareButton = tweet.querySelector('[data-testid="share"], [aria-label*="Share"]');
        if (shareButton) {
            shareButton.click();
            setTimeout(() => {
                const dmButton = document.querySelector('[role="menuitem"]:has-text("message"), [role="menuitem"]:has-text("DM")');
                if (dmButton) {
                    dmButton.click();
                    this.showActionFeedback('💌 DM opened!');
                    this.playSound('dm');
                }
            }, 100);
        }
    }

    viewFollowers() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const profileLink = tweet.querySelector('a[href*="/"][role="link"]:not([href*="/status/"])');
        if (profileLink) {
            const username = profileLink.href.split('/').pop();
            window.location.href = `https://x.com/${username}/followers`;
            this.showActionFeedback('👥 Followers opened!');
            this.playSound('navigate');
        }
    }

    viewFollowing() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const profileLink = tweet.querySelector('a[href*="/"][role="link"]:not([href*="/status/"])');
        if (profileLink) {
            const username = profileLink.href.split('/').pop();
            window.location.href = `https://x.com/${username}/following`;
            this.showActionFeedback('👥 Following opened!');
            this.playSound('navigate');
        }
    }

    composeTweet() {
        const composeSelectors = [
            '[data-testid="SideNav_NewTweet_Button"]',
            '[data-testid="tweetButtonInline"]',
            'a[href="/compose/tweet"]',
            '[aria-label*="Post" i]',
            '[aria-label*="Tweet" i]',
            'button[data-testid*="tweet" i]'
        ];
        
        for (const selector of composeSelectors) {
            const btn = document.querySelector(selector);
            if (btn) {
                btn.click();
                this.showActionFeedback('✨ Compose opened!');
                this.playSound('compose');
                return;
            }
        }
    }

    navigateTo(path) {
        if (window.location.pathname !== path) {
            window.location.href = `https://x.com${path}`;
        }
    }

    goToProfile() {
        const profileLink = document.querySelector('[data-testid="AppTabBar_Profile_Link"], a[href*="/"][aria-label*="Profile"]');
        if (profileLink) {
            profileLink.click();
            this.showActionFeedback('👤 Profile opened!');
            this.playSound('navigate');
        }
    }

    focusSearch() {
        const searchInputs = [
            '[data-testid="SearchBox_Search_Input"]',
            'input[placeholder*="Search"]',
            'input[aria-label*="Search"]'
        ];
        
        for (const selector of searchInputs) {
            const input = document.querySelector(selector);
            if (input) {
                input.focus();
                this.showActionFeedback('🔍 Search focused!');
                this.playSound('focus');
                return;
            }
        }
    }

    viewTrending() {
        this.navigateTo('/explore/tabs/trending');
        this.showActionFeedback('📈 Trending opened!');
        this.playSound('navigate');
    }

    viewMoments() {
        this.navigateTo('/i/moments');
        this.showActionFeedback('⚡ Moments opened!');
        this.playSound('navigate');
    }

    nextTweet() {
        if (this.tweets.length === 0) return;
        
        if (this.settings.loopNavigation && this.currentTweetIndex >= this.tweets.length - 1) {
            this.currentTweetIndex = 0;
        } else {
            this.currentTweetIndex = Math.min(this.currentTweetIndex + 1, this.tweets.length - 1);
        }
        
        this.highlightCurrentTweet();
        this.updateTweetCounter();
        
        if (this.settings.autoScroll) {
            const tweet = this.getCurrentTweet();
            if (tweet) {
                tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        this.playSound('navigate');
    }

    prevTweet() {
        if (this.tweets.length === 0) return;
        
        if (this.settings.loopNavigation && this.currentTweetIndex <= 0) {
            this.currentTweetIndex = this.tweets.length - 1;
        } else {
            this.currentTweetIndex = Math.max(this.currentTweetIndex - 1, 0);
        }
        
        this.highlightCurrentTweet();
        this.updateTweetCounter();
        
        if (this.settings.autoScroll) {
            const tweet = this.getCurrentTweet();
            if (tweet) {
                tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        this.playSound('navigate');
    }

    firstTweet() {
        if (this.tweets.length === 0) return;
        
        this.currentTweetIndex = 0;
        this.highlightCurrentTweet();
        this.updateTweetCounter();
        
        if (this.settings.autoScroll) {
            const tweet = this.getCurrentTweet();
            if (tweet) {
                tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        this.showActionFeedback('⏫ First tweet!');
        this.playSound('navigate');
    }

    lastTweet() {
        if (this.tweets.length === 0) return;
        
        this.currentTweetIndex = this.tweets.length - 1;
        this.highlightCurrentTweet();
        this.updateTweetCounter();
        
        if (this.settings.autoScroll) {
            const tweet = this.getCurrentTweet();
            if (tweet) {
                tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        this.showActionFeedback('⏬ Last tweet!');
        this.playSound('navigate');
    }

    randomTweet() {
        if (this.tweets.length === 0) return;
        
        this.currentTweetIndex = Math.floor(Math.random() * this.tweets.length);
        this.highlightCurrentTweet();
        this.updateTweetCounter();
        
        if (this.settings.autoScroll) {
            const tweet = this.getCurrentTweet();
            if (tweet) {
                tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        this.showActionFeedback('🎲 Random tweet!');
        this.playSound('navigate');
    }

    toggleMouseFollow() {
        this.settings.followMouse = !this.settings.followMouse;
        this.updateUI();
        this.saveSettings();
        
        if (this.settings.followMouse) {
            this.updateHighlightPosition();
        } else {
            this.highlightCurrentTweet();
        }
        
        this.showActionFeedback(this.settings.followMouse ? '🖱️ Mouse follow ON' : '⌨️ Mouse follow OFF');
        this.playSound('toggle');
    }

    switchNavigationMode() {
        const modes = ['keyboard', 'mouse', 'both'];
        const currentIndex = modes.indexOf(this.settings.navigationMode);
        this.settings.navigationMode = modes[(currentIndex + 1) % modes.length];
        this.updateUI();
        this.saveSettings();
        this.showActionFeedback(`🎮 Mode: ${this.settings.navigationMode.toUpperCase()}`);
        this.playSound('switch');
    }

    toggleSidebar() {
        const sidebar = document.querySelector('[data-testid="sidebarColumn"], nav[role="navigation"]');
        if (sidebar) {
            sidebar.style.display = sidebar.style.display === 'none' ? '' : 'none';
            this.showActionFeedback('📱 Sidebar toggled!');
            this.playSound('toggle');
        }
    }

    toggleDarkMode() {
        const darkModeButton = document.querySelector('[data-testid="settingsModalDialog"] [role="button"]');
        if (darkModeButton) {
            darkModeButton.click();
            this.showActionFeedback('🌙 Dark mode toggled!');
            this.playSound('toggle');
        }
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
            this.showActionFeedback('🖥️ Exited fullscreen!');
        } else {
            document.documentElement.requestFullscreen();
            this.showActionFeedback('🖥️ Entered fullscreen!');
        }
        this.playSound('toggle');
    }

    refreshPage() {
        window.location.reload();
    }

    openInNewTab() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        if (tweetLink) {
            window.open(tweetLink.href, '_blank');
            this.showActionFeedback('🆕 Opened in new tab!');
            this.playSound('navigate');
        }
    }

    closeTab() {
        window.close();
    }

    startAutoScroll() {
        if (this.autoScrollInterval) return;
        
        this.autoScrollInterval = setInterval(() => {
            window.scrollBy(0, 100);
        }, 1000);
        
        this.showActionFeedback('🔄 Auto scroll started!');
        this.playSound('scroll');
    }

    stopAutoScroll() {
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
            this.showActionFeedback('⏹️ Auto scroll stopped!');
            this.playSound('stop');
        }
    }

    exportTweets() {
        const tweets = this.tweets.map(tweet => {
            const text = tweet.querySelector('[data-testid="tweetText"], [lang]')?.textContent || '';
            const author = tweet.querySelector('[data-testid="User-Name"]')?.textContent || '';
            const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
            return { text, author, link };
        });
        
        const data = JSON.stringify(tweets, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tweets-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showActionFeedback('📤 Tweets exported!');
        this.playSound('export');
    }

    screenshotTweet() {
        const tweet = this.getCurrentTweet();
        if (!tweet) return;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const rect = tweet.getBoundingClientRect();
        const scale = 2;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        const renderElement = (element, offsetX = 0, offsetY = 0) => {
            const elementRect = element.getBoundingClientRect();
            const x = elementRect.left - rect.left + offsetX;
            const y = elementRect.top - rect.top + offsetY;
            
            const styles = window.getComputedStyle(element);
            ctx.fillStyle = styles.color || '#000000';
            ctx.font = `${styles.fontSize} ${styles.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                ctx.fillStyle = styles.backgroundColor;
                ctx.fillRect(x, y, elementRect.width, elementRect.height);
                ctx.fillStyle = styles.color || '#000000';
            }
            
            if (element.textContent && element.children.length === 0) {
                const lines = element.textContent.split('\n');
                const lineHeight = parseInt(styles.lineHeight) || parseInt(styles.fontSize) * 1.2;
                
                lines.forEach((line, index) => {
                    ctx.fillText(line, x, y + (index * lineHeight));
                });
            }
            
            Array.from(element.children).forEach(child => {
                renderElement(child, offsetX, offsetY);
            });
        };
        
        try {
            renderElement(tweet);
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tweet-screenshot-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
                
                this.showActionFeedback('📸 Screenshot saved!');
                this.playSound('screenshot');
            }, 'image/png');
        } catch (error) {
            console.error('Screenshot failed:', error);
            this.showActionFeedback('❌ Screenshot failed!');
        }
    }

    playSound(type) {
        if (!this.settings.soundEffects) return;
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            const frequencies = {
                like: 800,
                retweet: 600,
                reply: 700,
                compose: 900,
                navigate: 400,
                scroll: 300,
                toggle: 500,
                switch: 650,
                bookmark: 750,
                share: 550,
                mute: 200,
                block: 150,
                follow: 850,
                thread: 720,
                focus: 480,
                quote: 680,
                copy: 520,
                view: 580,
                analytics: 620,
                embed: 560,
                delete: 180,
                edit: 640,
                pin: 780,
                hide: 320,
                report: 280,
                unfollow: 450,
                unmute: 600,
                unblock: 550,
                list: 720,
                dm: 820,
                export: 880,
                screenshot: 920,
                stop: 250
            };
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('Audio not supported:', error);
        }
    }

    showActionFeedback(message) {
        const feedback = document.createElement('div');
        const speedMultiplier = {
            slow: 1.5,
            normal: 1,
            fast: 0.7,
            instant: 0.3
        }[this.settings.animationSpeed] || 1;
        
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(255, 107, 157, 0.95), rgba(196, 69, 105, 0.95));
            color: white;
            padding: 16px 24px;
            border-radius: 25px;
            font-family: 'Segoe UI', sans-serif;
            font-weight: 600;
            font-size: 16px;
            z-index: 10001;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(255, 107, 157, 0.4);
            animation: feedbackPop ${0.6 * speedMultiplier}s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        `;
        
        feedback.textContent = message;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 1500 * speedMultiplier);
    }

    async saveSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({ settings: this.settings });
        }
    }
}
const style = document.createElement('style');
style.textContent = `
    @keyframes feedbackPop {
        0% { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(0.8); 
        }
        50% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1.1); 
        }
        100% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1); 
        }
    }
`;
document.head.appendChild(style);
function initializeExtension() {
    setTimeout(() => {
        console.log('Xbinder: Initializing extension...');
        window.animeXKeybinds = new AnimeXKeybinds();
    }, 2000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('Page navigation detected, updating...');
        setTimeout(() => {
            if (window.animeXKeybinds) {
                window.animeXKeybinds.updateTweetList();
            }
        }, 1000);
    }
}).observe(document, {subtree: true, childList: true});