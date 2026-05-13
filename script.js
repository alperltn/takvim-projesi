import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
// ============================================
// Toast Notification System
// ============================================

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    });
}

// ============================================
// Firebase Initialization
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyCRtRsjUFYfg6gPOLGNrtwOHcf0p5IJokg",
  authDomain: "takvim-projesi-8abe3.firebaseapp.com",
  projectId: "takvim-projesi-8abe3",
  storageBucket: "takvim-projesi-8abe3.firebasestorage.app",
  messagingSenderId: "1006157428202",
  appId: "1:1006157428202:web:501d76f4602f1bc95dee93"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// Global variable to access calendar instance
let calendarInstance;

// ============================================
// Calendar Application (Vanilla JavaScript)
// ============================================

class Calendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.notes = {}; // Store notes from Firestore
        
        // DOM Elements
        this.calendarGrid = document.getElementById('calendarGrid');
        this.monthYearElement = document.getElementById('monthYear');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.todayBtn = document.getElementById('todayBtn');

        // Event Listeners
        this.prevBtn.addEventListener('click', () => this.previousMonth());
        this.nextBtn.addEventListener('click', () => this.nextMonth());
        this.todayBtn.addEventListener('click', () => this.goToToday());

        // Initial Render
        this.render();
    }

    /**
     * Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
     * But we need Monday as first day (0), so we adjust
     */
    getFirstDayOfMonth(date) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        // Convert Sunday (0) to Monday (6) format
        return firstDay === 0 ? 6 : firstDay - 1;
    }

    /**
     * Get the number of days in a month
     */
    getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    /**
     * Get the number of days in previous month
     */
    getDaysInPreviousMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    }

    /**
     * Format month and year for display
     */
    formatMonthYear(date) {
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    /**
     * Check if a date is today
     */
    isToday(year, month, day) {
        const today = new Date();
        return (
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate()
        );
    }

    /**
     * Check if a date is selected
     */
    isSelected(year, month, day) {
        if (!this.selectedDate) return false;
        return (
            year === this.selectedDate.getFullYear() &&
            month === this.selectedDate.getMonth() &&
            day === this.selectedDate.getDate()
        );
    }

    /**
     * Format date as YYYY-MM-DD for Firestore
     */
    formatDateForFirestore(year, month, day) {
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
    }

    /**
     * Load notes from Firestore
     */
    async loadNotesFromFirestore() {
        try {
            // Check if user is logged in
            const currentUser = auth.currentUser;
            if (!currentUser) {
                // If no user is logged in, clear notes
                this.notes = {};
                console.log('📛 Giriş yapılmadığı için notlar temizlendi.');
                return;
            }
            
            // Load notes from user-specific path: users/[USER_ID]/notes
            const notesCollection = collection(db, 'users', currentUser.uid, 'notes');
            const querySnapshot = await getDocs(notesCollection);
            
            this.notes = {};
            querySnapshot.forEach((doc) => {
                this.notes[doc.id] = doc.data().text;
            });
            
            console.log('📥 Firestore\'dan notlar yüklendi:', this.notes);
        } catch (error) {
            console.error('❌ Firestore\'dan veri çekilirken hata:', error);
        }
    }

    /**
     * Create a day element
     */
    createDayElement(day, month, year, isCurrentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day';

        // Add day number
        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        // Add classes for styling
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        } else {
            // Check if weekend (Saturday = 5, Sunday = 6 in getDay())
            const dayOfWeek = new Date(year, month, day).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayElement.classList.add('weekend');
            }
        }

        if (isCurrentMonth && this.isToday(year, month, day)) {
            dayElement.classList.add('today');
        }

        if (isCurrentMonth && this.isSelected(year, month, day)) {
            dayElement.classList.add('selected');
        }

        // Load note from Firestore if exists
        if (isCurrentMonth) {
            const dateKey = this.formatDateForFirestore(year, month, day);
            const savedNote = this.notes[dateKey];
            
            if (savedNote) {
                const notePreview = document.createElement('span');
                notePreview.className = 'note-preview';
                notePreview.textContent = savedNote;
                dayElement.appendChild(notePreview);
            }
        }

        // Add click event for selection
        if (isCurrentMonth) {
            dayElement.addEventListener('click', () => {
                this.selectDate(new Date(year, month, day));
            });
        }

        return dayElement;
    }

    /**
     * Render the calendar
     */
    render() {
        // Clear grid
        this.calendarGrid.innerHTML = '';

        // Update header
        this.monthYearElement.textContent = this.formatMonthYear(this.currentDate);

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDay = this.getFirstDayOfMonth(this.currentDate);
        const daysInMonth = this.getDaysInMonth(this.currentDate);
        const daysInPreviousMonth = this.getDaysInPreviousMonth(this.currentDate);

        // Add days from previous month
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPreviousMonth - i;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            this.calendarGrid.appendChild(
                this.createDayElement(day, prevMonth, prevYear, false)
            );
        }

        // Add days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            this.calendarGrid.appendChild(
                this.createDayElement(day, month, year, true)
            );
        }

        // Add days from next month to complete the grid
        const totalCells = this.calendarGrid.children.length;
        const remainingCells = 35 - totalCells; // 7x5 = 35 cells

        for (let day = 1; day <= remainingCells; day++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            this.calendarGrid.appendChild(
                this.createDayElement(day, nextMonth, nextYear, false)
            );
        }
    }

    /**
     * Navigate to previous month
     */
    async previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        await this.loadNotesFromFirestore();
        this.render();
    }

    /**
     * Navigate to next month
     */
    async nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        await this.loadNotesFromFirestore();
        this.render();
    }

    /**
     * Go to today
     */
    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.render();
    }

    /**
     * Select a date and open modal
     */
    selectDate(date) {
        // Check if user is logged in
        if (!auth.currentUser) {
            showToast('Not eklemek için lütfen giriş yapın!', 'error');
            return;
        }
        
        this.selectedDate = date;
        this.openNoteModal(date);
    }

    /**
     * Open note modal for selected date
     */
    openNoteModal(date) {
        const modalOverlay = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const noteTextarea = document.getElementById('notetextarea');
        const dateStr = this.formatDateForModal(date);
        const dateKey = this.formatDateForFirestore(date.getFullYear(), date.getMonth(), date.getDate());
        const savedNote = this.notes[dateKey];
        
        modalTitle.textContent = `${dateStr} - Gün Notu`;
        noteTextarea.value = savedNote || '';
        document.getElementById('charCount').textContent = (savedNote || '').length;
        
        // Store date in modal for later reference
        modalOverlay.dataset.selectedDate = JSON.stringify({
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate()
        });
        
        modalOverlay.classList.add('active');
        
        // Focus textarea
        noteTextarea.focus();
    }

    /**
     * Format date for modal title
     */
    formatDateForModal(date) {
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        
        return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    }
}

// ============================================
// Modal Management
// ============================================

class NoteModal {
    constructor() {
        this.modalOverlay = document.getElementById('modalOverlay');
        this.noteModal = document.getElementById('noteModal');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.textarea = document.getElementById('notetextarea');
        this.charCount = document.getElementById('charCount');

        this.attachEventListeners();
    }

    /**
     * Attach event listeners to modal elements
     */
    attachEventListeners() {
        // Close button click
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        
        // Cancel button click
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        
        // Save button click
        this.saveBtn.addEventListener('click', () => this.saveNote());
        

        
        // Character count update
        this.textarea.addEventListener('input', () => {
            this.charCount.textContent = this.textarea.value.length;
        });
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    /**
     * Close the modal
     */
    closeModal() {
        this.modalOverlay.classList.remove('active');
        this.textarea.value = '';
        this.charCount.textContent = '0';
    }

    /**
     * Save the note to Firestore
     */
    async saveNote() {
        const noteText = this.textarea.value.trim();
        const modalTitle = document.getElementById('modalTitle').textContent;
        const selectedDateData = JSON.parse(this.modalOverlay.dataset.selectedDate);
        const dateId = `${selectedDateData.year}-${String(selectedDateData.month + 1).padStart(2, '0')}-${String(selectedDateData.day).padStart(2, '0')}`;
        const currentUser = auth.currentUser;
        
        // Check if user is logged in
        if (!currentUser) {
            showToast('Not kaydetmek için lütfen giriş yapın!', 'error');
            return;
        }
        
        try {
            // Save to user-specific path: users/[USER_ID]/notes
            if (noteText) {
                // Save to Firestore
                await setDoc(doc(db, 'users', currentUser.uid, 'notes', dateId), { text: noteText });
                showToast("Not kaydedildi!", 'success');
                console.log('🔥 FIRESTORE\'A YAZILDI!');
                console.log('Kullanıcı:', currentUser.uid);
                console.log('Tarih:', dateId);
                console.log('Not İçeriği:', noteText);
                
                // Update local notes cache
                calendarInstance.notes[dateId] = noteText;
            } else {
                // Delete empty note
                await deleteDoc(doc(db, 'users', currentUser.uid, 'notes', dateId));
                delete calendarInstance.notes[dateId];
                showToast("Not silindi!", 'success');
                console.log("🗑️ Not tamamen silindi!");
            }
        } catch (error) {
            console.error('❌ Firestore\'a yazarken hata oluştu:', error);
        }
        
        // Re-render calendar to show the updated note
        if (calendarInstance) {
            calendarInstance.render();
        }
        
        this.closeModal();
    }
}

// ============================================
// Initialize Calendar and Modal on DOM Load
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    loadThemeSettings();
    calendarInstance = new Calendar();
    new NoteModal();
    
    // Load notes from Firestore on page load
    await calendarInstance.loadNotesFromFirestore();
    calendarInstance.render();
});

// ==========================================
// KİMLİK DOĞRULAMA (AUTHENTICATION) İŞLEMLERİ
// ==========================================

const registerUsername = document.getElementById('registerUsername');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const authForm = document.getElementById('authForm');
const authModalOverlay = document.getElementById('authModalOverlay');
const authModalTitle = document.getElementById('authModalTitle');
const authSubmitButton = document.getElementById('authSubmitButton');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const profileIcon = document.getElementById('profileIcon');
const userNameDisplay = document.getElementById('userNameDisplay');
const mainSettingsView = document.getElementById('mainSettingsView');
const themeSettingsView = document.getElementById('themeSettingsView');
const openThemeSettingsBtn = document.getElementById('openThemeSettingsBtn');
const backToMainBtn = document.getElementById('backToMainBtn');
const bgColorInput = document.getElementById('bgColor');
const uiTextColorInput = document.getElementById('uiTextColor');
const noteTextColorInput = document.getElementById('noteTextColor');
const uiFontSelect = document.getElementById('uiFont');
const noteFontSelect = document.getElementById('noteFont');
const fontSizeInput = document.getElementById('fontSize');
const themeModeButton = document.querySelector('#themeModeToggle .toggle-button');

const authInputFields = [registerUsername, emailInput, passwordInput];
const loginButton = document.getElementById('login-btn') || authSubmitButton;
const registerButton = document.getElementById('register-btn') || authSubmitButton;

authInputFields.forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (authMode === 'login') {
                loginButton.click();
            } else {
                registerButton.click();
            }
        }
    });
});
const settingsBtn = document.getElementById('settingsBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const logoutBtn = document.getElementById('logoutBtn');
let authMode = 'login';
const themeStorageKeys = {
    bgColor: 'savedBgColor',
    uiText: 'savedUiColor',
    noteText: 'savedNoteColor',
    uiFont: 'savedUiFont',
    noteFont: 'savedNoteFont',
    fontSize: 'savedFontSize',
    themeMode: 'savedThemeMode'
};
const defaultThemeSettings = {
    bgColor: '#1a1a1a',
    uiText: '#ffffff',
    noteText: '#ffffff',
    uiFont: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    noteFont: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: '16',
    themeMode: 'dark'
};

function getSavedThemeValue(key, fallback) {
    const saved = localStorage.getItem(key);
    return saved !== null ? saved : fallback;
}

function applyThemeSettings(settings) {
    document.documentElement.style.setProperty('--bg-color', settings.bgColor);
    document.documentElement.style.setProperty('--ui-text', settings.uiText);
    document.documentElement.style.setProperty('--note-text', settings.noteText);
    document.documentElement.style.setProperty('--ui-font', settings.uiFont);
    document.documentElement.style.setProperty('--note-font', settings.noteFont);
    document.documentElement.style.setProperty('--global-font-size', `${settings.fontSize}px`);

    if (themeModeButton) {
        themeModeButton.classList.toggle('active', settings.themeMode === 'dark');
        themeModeButton.textContent = settings.themeMode === 'dark' ? 'Karanlık' : 'Aydınlık';
    }
}

function saveThemeValue(key, value) {
    localStorage.setItem(key, value);
}

function loadThemeSettings() {
    const settings = {
        bgColor: getSavedThemeValue(themeStorageKeys.bgColor, defaultThemeSettings.bgColor),
        uiText: getSavedThemeValue(themeStorageKeys.uiText, defaultThemeSettings.uiText),
        noteText: getSavedThemeValue(themeStorageKeys.noteText, defaultThemeSettings.noteText),
        uiFont: getSavedThemeValue(themeStorageKeys.uiFont, defaultThemeSettings.uiFont),
        noteFont: getSavedThemeValue(themeStorageKeys.noteFont, defaultThemeSettings.noteFont),
        fontSize: getSavedThemeValue(themeStorageKeys.fontSize, defaultThemeSettings.fontSize),
        themeMode: getSavedThemeValue(themeStorageKeys.themeMode, defaultThemeSettings.themeMode)
    };

    applyThemeSettings(settings);

    if (bgColorInput) bgColorInput.value = settings.bgColor;
    if (uiTextColorInput) uiTextColorInput.value = settings.uiText;
    if (noteTextColorInput) noteTextColorInput.value = settings.noteText;
    if (uiFontSelect) uiFontSelect.value = settings.uiFont;
    if (noteFontSelect) noteFontSelect.value = settings.noteFont;
    if (fontSizeInput) fontSizeInput.value = settings.fontSize;

    return settings;
}

function updateThemeSetting(storageKey, cssVariable, value) {
    document.documentElement.style.setProperty(cssVariable, value);
    saveThemeValue(storageKey, value);
}

function openAuthModal() {
    authModalOverlay.classList.add('active');
    authModalOverlay.setAttribute('aria-hidden', 'false');
    emailInput.focus();
}

function closeAuthModal() {
    authModalOverlay.classList.remove('active');
    authModalOverlay.setAttribute('aria-hidden', 'true');
}

function showThemeSettingsView() {
    mainSettingsView?.classList.add('hidden');
    themeSettingsView?.classList.remove('hidden');
}

function openSidebar() {
    showMainSettingsView();
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

function getUserInitials(displayName) {
    if (!displayName) {
        return '👤';
    }
    const parts = displayName.trim().split(/\s+/);
    const initials = parts.map(part => part[0].toUpperCase()).slice(0, 2).join('');
    return initials || '👤';
}

function setAuthMode(mode) {
    authMode = mode;
    if (mode === 'login') {
        authModalTitle.textContent = 'Giriş Yap';
        authSubmitButton.textContent = 'Giriş Yap';
        toggleAuthMode.textContent = 'Kayıt Olun';
        registerUsername.classList.remove('visible');
        registerUsername.value = '';
    } else {
        authModalTitle.textContent = 'Yeni Hesap Oluştur';
        authSubmitButton.textContent = 'Kayıt Ol';
        toggleAuthMode.textContent = 'Giriş Yapın';
        registerUsername.classList.add('visible');
    }
}

profileIcon.addEventListener('click', () => {
    if (auth.currentUser) {
        openSidebar();
    } else {
        setAuthMode('login');
        openAuthModal();
    }
});

settingsBtn.addEventListener('click', () => {
    openSidebar();
});

openThemeSettingsBtn?.addEventListener('click', () => {
    showThemeSettingsView();
});

backToMainBtn?.addEventListener('click', () => {
    showMainSettingsView();
});

bgColorInput?.addEventListener('input', (event) => {
    updateThemeSetting(themeStorageKeys.bgColor, '--bg-color', event.target.value);
});

uiTextColorInput?.addEventListener('input', (event) => {
    updateThemeSetting(themeStorageKeys.uiText, '--ui-text', event.target.value);
});

noteTextColorInput?.addEventListener('input', (event) => {
    updateThemeSetting(themeStorageKeys.noteText, '--note-text', event.target.value);
});

uiFontSelect?.addEventListener('input', (event) => {
    updateThemeSetting(themeStorageKeys.uiFont, '--ui-font', event.target.value);
});

noteFontSelect?.addEventListener('input', (event) => {
    updateThemeSetting(themeStorageKeys.noteFont, '--note-font', event.target.value);
});

fontSizeInput?.addEventListener('input', (event) => {
    updateThemeSetting(themeStorageKeys.fontSize, '--global-font-size', `${event.target.value}px`);
});

themeModeButton?.addEventListener('click', () => {
    const currentMode = getSavedThemeValue(themeStorageKeys.themeMode, defaultThemeSettings.themeMode);
    const nextMode = currentMode === 'dark' ? 'light' : 'dark';
    saveThemeValue(themeStorageKeys.themeMode, nextMode);

    const uiColor = nextMode === 'dark' ? '#ffffff' : '#111827';
    const bgColor = nextMode === 'dark' ? '#1a1a1a' : '#f3f4f6';

    updateThemeSetting(themeStorageKeys.uiText, '--ui-text', uiColor);
    updateThemeSetting(themeStorageKeys.bgColor, '--bg-color', bgColor);

    if (bgColorInput) {
        bgColorInput.value = bgColor;
    }
    if (uiTextColorInput) {
        uiTextColorInput.value = uiColor;
    }

    if (themeModeButton) {
        themeModeButton.classList.toggle('active', nextMode === 'dark');
        themeModeButton.textContent = nextMode === 'dark' ? 'Karanlık' : 'Aydınlık';
    }
});

closeSidebarBtn.addEventListener('click', () => {
    closeSidebar();
});

sidebarOverlay.addEventListener('click', () => {
    closeSidebar();
});

logoutBtn.addEventListener('click', async () => {
    closeSidebar();
    try {
        await signOut(auth);
        showToast('Çıkış yapıldı.', 'success');
    } catch (error) {
        showToast('Çıkış Hatası: ' + error.message, 'error');
    }
});

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showToast('Lütfen e-posta ve şifre girin!', 'error');
        return;
    }

    if (authMode === 'login') {
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                showToast('Başarıyla giriş yapıldı!', 'success');
                closeAuthModal();
                authForm.reset();
                emailInput.value = '';
                passwordInput.value = '';
            })
            .catch((error) => {
                showToast('Giriş Hatası: ' + error.message, 'error');
            });
    } else {
        const username = registerUsername.value.trim();
        if (!username) {
            showToast('Lütfen kullanıcı adı girin!', 'error');
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                return updateProfile(userCredential.user, {
                    displayName: username
                });
            })
            .then(() => {
                showToast(`Hoş geldin, ${username}`, 'success');
                closeAuthModal();
                authForm.reset();
                registerUsername.value = '';
                emailInput.value = '';
                passwordInput.value = '';
            })
            .catch((error) => {
                showToast('Kayıt Hatası: ' + error.message, 'error');
            });
    }
});

toggleAuthMode.addEventListener('click', () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
});

authModalOverlay.addEventListener('click', (event) => {
    if (event.target === authModalOverlay) {
        closeAuthModal();
    }
});

// 4. Kullanıcı Durumunu Dinleme (Giriş yaptı mı, yapmadı mı?)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userNameDisplay.textContent = user.displayName || 'Kullanıcı';
        profileIcon.querySelector('.profile-icon-text').textContent = getUserInitials(user.displayName || user.email);
        closeAuthModal();
        closeSidebar();
        
        // Load user's notes when logged in
        if (calendarInstance) {
            await calendarInstance.loadNotesFromFirestore();
            calendarInstance.render();
        }
    } else {
        userNameDisplay.textContent = '';
        profileIcon.querySelector('.profile-icon-text').textContent = '👤';
        closeSidebar();
        setAuthMode('login');
        openAuthModal();
        
        // Clear notes when logged out
        if (calendarInstance) {
            calendarInstance.notes = {};
            calendarInstance.render();
        }
    }
});