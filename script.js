import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// ============================================
// Firebase Initialization
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyCnpI8HBaJnuacISYSdi_lmMHMGsw-ZeUU",
  authDomain: "takvim-projesi-97d11.firebaseapp.com",
  projectId: "takvim-projesi-97d11",
  storageBucket: "takvim-projesi-97d11.firebasestorage.app",
  messagingSenderId: "68068279737",
  appId: "1:68068279737:web:f4c211926782170c5e2268"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global variable to access calendar instance
let calendarInstance;

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
// Firestore User Data Functions
// ============================================

/**
 * Save user settings to Firestore
 */
async function saveUserSettings(uid, settings) {
    try {
        await setDoc(doc(db, 'users', uid), {
            settings: settings,
            lastUpdated: new Date()
        }, { merge: true });
        console.log('✅ Tema ayarları Firestore\'a kaydedildi');
    } catch (error) {
        console.error('❌ Tema ayarları kaydedilirken hata:', error);
    }
}

/**
 * Load user settings from Firestore
 */
async function loadUserSettings(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists() && userDoc.data().settings) {
            console.log('✅ Tema ayarları Firestore\'dan yüklendi');
            return userDoc.data().settings;
        }
    } catch (error) {
        console.error('❌ Tema ayarları yüklenirken hata:', error);
    }
    return null;
}

/**
 * Save profile picture to Firestore
 */
async function saveProfilePicture(uid, imageData) {
    try {
        await setDoc(doc(db, 'users', uid), {
            profilePic: imageData
        }, { merge: true });
        console.log('✅ Profil fotoğrafı Firestore\'a kaydedildi');
    } catch (error) {
        console.error('❌ Profil fotoğrafı kaydedilirken hata:', error);
    }
}

/**
 * Load profile picture from Firestore
 */
async function loadProfilePicture(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists() && userDoc.data().profilePic) {
            console.log('✅ Profil fotoğrafı Firestore\'dan yüklendi');
            return userDoc.data().profilePic;
        }
    } catch (error) {
        console.error('❌ Profil fotoğrafı yüklenirken hata:', error);
    }
    return null;
}

/**
 * Save user profile info to Firestore
 */
async function saveUserProfile(uid, username, email) {
    try {
        await setDoc(doc(db, 'users', uid), {
            username: username,
            email: email,
            lastUpdated: new Date()
        }, { merge: true });
        console.log('✅ Kullanıcı profili Firestore\'a kaydedildi');
    } catch (error) {
        console.error('❌ Kullanıcı profili kaydedilirken hata:', error);
    }
}

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
        this.prevBtn?.addEventListener('click', () => this.previousMonth());
        this.nextBtn?.addEventListener('click', () => this.nextMonth());
        this.todayBtn?.addEventListener('click', () => this.goToToday());

        // Initial Render
        this.render();
    }

    getFirstDayOfMonth(date) {
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return firstDay === 0 ? 6 : firstDay - 1;
    }

    getDaysInMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    getDaysInPreviousMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    }

    formatMonthYear(date) {
        const months = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    isToday(year, month, day) {
        const today = new Date();
        return (
            year === today.getFullYear() &&
            month === today.getMonth() &&
            day === today.getDate()
        );
    }

    isSelected(year, month, day) {
        if (!this.selectedDate) return false;
        return (
            year === this.selectedDate.getFullYear() &&
            month === this.selectedDate.getMonth() &&
            day === this.selectedDate.getDate()
        );
    }

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
            const currentUser = auth.currentUser;
            if (!currentUser) {
                this.notes = {};
                console.log('📛 Giriş yapılmadığı için notlar temizlendi.');
                return;
            }
            
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

    createDayElement(day, month, year, isCurrentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'day';

        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        } else {
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

        if (isCurrentMonth) {
            dayElement.addEventListener('click', () => {
                this.selectDate(new Date(year, month, day));
            });
        }

        return dayElement;
    }

    render() {
        this.calendarGrid.innerHTML = '';
        this.monthYearElement.textContent = this.formatMonthYear(this.currentDate);

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDay = this.getFirstDayOfMonth(this.currentDate);
        const daysInMonth = this.getDaysInMonth(this.currentDate);
        const daysInPreviousMonth = this.getDaysInPreviousMonth(this.currentDate);

        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPreviousMonth - i;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            this.calendarGrid.appendChild(
                this.createDayElement(day, prevMonth, prevYear, false)
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            this.calendarGrid.appendChild(
                this.createDayElement(day, month, year, true)
            );
        }

        const totalCells = this.calendarGrid.children.length;
        const remainingCells = 35 - totalCells;

        for (let day = 1; day <= remainingCells; day++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            this.calendarGrid.appendChild(
                this.createDayElement(day, nextMonth, nextYear, false)
            );
        }
    }

    async previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        await this.loadNotesFromFirestore();
        this.render();
    }

    async nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        await this.loadNotesFromFirestore();
        this.render();
    }

    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.render();
    }

    selectDate(date) {
        if (!auth.currentUser) {
            showToast('Not eklemek için lütfen giriş yapın!', 'error');
            return;
        }
        
        this.selectedDate = date;
        this.openNoteModal(date);
    }

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
        
        modalOverlay.dataset.selectedDate = JSON.stringify({
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate()
        });
        
        modalOverlay.classList.add('active');
        noteTextarea.focus();
    }

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

    attachEventListeners() {
        this.closeModalBtn?.addEventListener('click', () => this.closeModal());
        this.cancelBtn?.addEventListener('click', () => this.closeModal());
        this.saveBtn?.addEventListener('click', () => this.saveNote());
        
        this.textarea?.addEventListener('input', () => {
            this.charCount.textContent = this.textarea.value.length;
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    closeModal() {
        this.modalOverlay.classList.remove('active');
        this.textarea.value = '';
        this.charCount.textContent = '0';
    }

    async saveNote() {
        const noteText = this.textarea.value.trim();
        const selectedDateData = JSON.parse(this.modalOverlay.dataset.selectedDate);
        const dateId = `${selectedDateData.year}-${String(selectedDateData.month + 1).padStart(2, '0')}-${String(selectedDateData.day).padStart(2, '0')}`;
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
            showToast('Not kaydetmek için lütfen giriş yapın!', 'error');
            return;
        }
        
        try {
            if (noteText) {
                await setDoc(doc(db, 'users', currentUser.uid, 'notes', dateId), { text: noteText });
                showToast("Not kaydedildi!", 'success');
                console.log('🔥 FIRESTORE\'A YAZILDI!');
                console.log('Kullanıcı:', currentUser.uid);
                console.log('Tarih:', dateId);
                console.log('Not İçeriği:', noteText);
                
                calendarInstance.notes[dateId] = noteText;
            } else {
                await deleteDoc(doc(db, 'users', currentUser.uid, 'notes', dateId));
                delete calendarInstance.notes[dateId];
                showToast("Not silindi!", 'success');
                console.log("🗑️ Not tamamen silindi!");
            }
        } catch (error) {
            console.error('❌ Firestore\'a yazarken hata oluştu:', error);
        }
        
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
const profileSettingsView = document.getElementById('profileSettingsView');
const editUsernameView = document.getElementById('editUsernameView');
const editEmailView = document.getElementById('editEmailView');
const editPasswordView = document.getElementById('editPasswordView');
const openThemeSettingsBtn = document.getElementById('openThemeSettingsBtn');
const backToMainBtn = document.getElementById('backToMainBtn');
const backToMainFromProfileBtn = document.getElementById('backToMainFromProfileBtn');
const backToProfileFromUsernameBtn = document.getElementById('backToProfileFromUsernameBtn');
const backToProfileFromEmailBtn = document.getElementById('backToProfileFromEmailBtn');
const backToProfileFromPasswordBtn = document.getElementById('backToProfileFromPasswordBtn');
const profileMenuBtn = document.getElementById('profileMenuBtn');
const bgColorInput = document.getElementById('bgColor');
const uiTextColorInput = document.getElementById('uiTextColor');
const noteTextColorInput = document.getElementById('noteTextColor');
const uiFontSelect = document.getElementById('uiFont');
const noteFontSelect = document.getElementById('noteFont');
const fontSizeInput = document.getElementById('fontSize');
const themeModeButton = document.querySelector('#themeModeToggle .toggle-button');
const displayUsername = document.getElementById('displayUsername');
const displayEmail = document.getElementById('displayEmail');
const editUsernameLink = document.getElementById('editUsernameLink');
const editEmailLink = document.getElementById('editEmailLink');
const editPasswordLink = document.getElementById('editPasswordLink');
const editUsernameInput = document.getElementById('editUsernameInput');
const editEmailInput = document.getElementById('editEmailInput');
const editPasswordInput = document.getElementById('editPasswordInput');
const saveUsernameBtn = document.getElementById('saveUsernameBtn');
const saveEmailBtn = document.getElementById('saveEmailBtn');
const savePasswordBtn = document.getElementById('savePasswordBtn');
const profileDropdown = document.getElementById('profileDropdown');
const logoutBtn = document.getElementById('logoutBtn');
const settingsBtn = document.getElementById('settingsBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const profileImageInput = document.getElementById('profileImageInput');
const profileImagePreview = document.getElementById('profileImagePreview');
const updateProfileBtn = document.getElementById('updateProfileBtn');

let authMode = 'login';

const defaultThemeSettings = {
    bgColor: '#1a1a1a',
    uiText: '#ffffff',
    noteText: '#ffffff',
    uiFont: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    noteFont: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: '16',
    themeMode: 'dark'
};

// ============================================
// Theme Settings Management
// ============================================

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

async function loadThemeSettings() {
    const currentUser = auth.currentUser;
    let settings = defaultThemeSettings;
    
    if (currentUser) {
        const firestoreSettings = await loadUserSettings(currentUser.uid);
        if (firestoreSettings) {
            settings = firestoreSettings;
        }
    }

    applyThemeSettings(settings);

    if (bgColorInput) bgColorInput.value = settings.bgColor;
    if (uiTextColorInput) uiTextColorInput.value = settings.uiText;
    if (noteTextColorInput) noteTextColorInput.value = settings.noteText;
    if (uiFontSelect) uiFontSelect.value = settings.uiFont;
    if (noteFontSelect) noteFontSelect.value = settings.noteFont;
    if (fontSizeInput) fontSizeInput.value = settings.fontSize;

    // Load profile picture
    if (currentUser) {
        const profilePic = await loadProfilePicture(currentUser.uid);
        if (profilePic && profileImagePreview) {
            profileImagePreview.src = profilePic;
            profileImagePreview.style.display = 'block';
            updateProfileIcon(profilePic);
        }
    }

    return settings;
}

async function updateThemeSettingAndSave(key, cssVariable, value) {
    document.documentElement.style.setProperty(cssVariable, value);
    
    const currentUser = auth.currentUser;
    if (currentUser) {
        const settings = await loadUserSettings(currentUser.uid) || defaultThemeSettings;
        const settingKey = {
            'savedBgColor': 'bgColor',
            'savedUiColor': 'uiText',
            'savedNoteColor': 'noteText',
            'savedUiFont': 'uiFont',
            'savedNoteFont': 'noteFont',
            'savedFontSize': 'fontSize',
            'savedThemeMode': 'themeMode'
        }[key];
        
        if (settingKey) {
            settings[settingKey] = value;
            await saveUserSettings(currentUser.uid, settings);
        }
    }
}

// ============================================
// Auth Modal Functions
// ============================================

function openAuthModal() {
    authModalOverlay.classList.add('active');
    authModalOverlay.setAttribute('aria-hidden', 'false');
    emailInput.focus();
}

function closeAuthModal() {
    authModalOverlay.classList.remove('active');
    authModalOverlay.setAttribute('aria-hidden', 'true');
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

// ============================================
// Settings Panel Functions
// ============================================

function showThemeSettingsView() {
    mainSettingsView?.classList.add('hidden');
    themeSettingsView?.classList.remove('hidden');
}

function showMainSettingsView() {
    mainSettingsView?.classList.remove('hidden');
    themeSettingsView?.classList.add('hidden');
    profileSettingsView?.classList.add('hidden');
}

function showProfileSettingsView() {
    mainSettingsView?.classList.add('hidden');
    profileSettingsView?.classList.remove('hidden');
    editUsernameView?.classList.add('hidden');
    editEmailView?.classList.add('hidden');
    editPasswordView?.classList.add('hidden');
    loadProfileDisplay();
}

function showEditUsernameView() {
    profileSettingsView?.classList.add('hidden');
    editUsernameView?.classList.remove('hidden');
    editUsernameInput.value = displayUsername.textContent || '';
    editUsernameInput.focus();
}

function showEditEmailView() {
    profileSettingsView?.classList.add('hidden');
    editEmailView?.classList.remove('hidden');
    editEmailInput.value = displayEmail.textContent || '';
    editEmailInput.focus();
}

function showEditPasswordView() {
    profileSettingsView?.classList.add('hidden');
    editPasswordView?.classList.remove('hidden');
    editPasswordInput.value = '';
    editPasswordInput.focus();
}

function toggleProfileDropdown() {
    if (profileDropdown) {
        profileDropdown.classList.toggle('show');
    }
}

function closeProfileDropdown() {
    if (profileDropdown) {
        profileDropdown.classList.remove('show');
    }
}

function loadProfileDisplay() {
    if (displayUsername) {
        displayUsername.textContent = auth.currentUser?.displayName || 'Kullanıcı';
    }
    if (displayEmail) {
        displayEmail.textContent = auth.currentUser?.email || '';
    }
}

function openSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    showMainSettingsView();
    sidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    if (!sidebar || !sidebarOverlay) return;
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

function updateProfileIcon(imageSrc) {
    if (!imageSrc || !profileIcon) {
        return;
    }
    
    try {
        profileIcon.innerHTML = '';
        const img = document.createElement('img');
        img.src = imageSrc;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        img.alt = 'Profil Fotoğrafı';
        profileIcon.appendChild(img);
    } catch (error) {
        console.warn('Profil fotoğrafı yüklenirken hata oluştu:', error);
    }
}

function getUserInitials(displayName) {
    if (!displayName) {
        return '👤';
    }
    const parts = displayName.trim().split(/\s+/);
    const initials = parts.map(part => part[0].toUpperCase()).slice(0, 2).join('');
    return initials || '👤';
}

// ============================================
// Event Listeners - Auth
// ============================================

const authInputFields = [registerUsername, emailInput, passwordInput];
const loginButton = document.getElementById('login-btn') || authSubmitButton;
const registerButton = document.getElementById('register-btn') || authSubmitButton;

authInputFields.forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            authSubmitButton.click();
        }
    });
});

authForm?.addEventListener('submit', async (event) => {
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
                }).then(() => {
                    // Save user data to Firestore
                    return saveUserProfile(userCredential.user.uid, username, email);
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

toggleAuthMode?.addEventListener('click', () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
});

authModalOverlay?.addEventListener('click', (event) => {
    if (event.target === authModalOverlay) {
        closeAuthModal();
    }
});

if (profileIcon) {
    profileIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (auth.currentUser) {
            toggleProfileDropdown();
        } else {
            setAuthMode('login');
            openAuthModal();
        }
    });
}

// ============================================
// Event Listeners - Settings
// ============================================

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        openSidebar();
    });
}

if (openThemeSettingsBtn) {
    openThemeSettingsBtn.addEventListener('click', () => {
        showThemeSettingsView();
    });
}

if (backToMainBtn) {
    backToMainBtn.addEventListener('click', () => {
        showMainSettingsView();
    });
}

if (profileMenuBtn) {
    profileMenuBtn.addEventListener('click', () => {
        showProfileSettingsView();
    });
}

if (backToMainFromProfileBtn) {
    backToMainFromProfileBtn.addEventListener('click', () => {
        showMainSettingsView();
    });
}

if (editUsernameLink) {
    editUsernameLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditUsernameView();
    });
}

if (editEmailLink) {
    editEmailLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditEmailView();
    });
}

if (editPasswordLink) {
    editPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showEditPasswordView();
    });
}

if (backToProfileFromUsernameBtn) {
    backToProfileFromUsernameBtn.addEventListener('click', () => {
        showProfileSettingsView();
    });
}

if (backToProfileFromEmailBtn) {
    backToProfileFromEmailBtn.addEventListener('click', () => {
        showProfileSettingsView();
    });
}

if (backToProfileFromPasswordBtn) {
    backToProfileFromPasswordBtn.addEventListener('click', () => {
        showProfileSettingsView();
    });
}

if (saveUsernameBtn) {
    saveUsernameBtn.addEventListener('click', async () => {
        const newUsername = editUsernameInput.value.trim();
        if (newUsername && auth.currentUser) {
            try {
                await updateProfile(auth.currentUser, { displayName: newUsername });
                await saveUserProfile(auth.currentUser.uid, newUsername, auth.currentUser.email);
                displayUsername.textContent = newUsername;
                if (userNameDisplay) {
                    userNameDisplay.textContent = newUsername;
                }
                showToast('Kullanıcı adı güncellendi!', 'success');
                showProfileSettingsView();
            } catch (error) {
                showToast('Hata: ' + error.message, 'error');
            }
        } else {
            showToast('Lütfen bir kullanıcı adı girin.', 'error');
        }
    });
}

if (saveEmailBtn) {
    saveEmailBtn.addEventListener('click', async () => {
        const newEmail = editEmailInput.value.trim();
        if (newEmail && newEmail.includes('@') && auth.currentUser) {
            try {
                await saveUserProfile(auth.currentUser.uid, auth.currentUser.displayName, newEmail);
                displayEmail.textContent = newEmail;
                showToast('Email güncellendi!', 'success');
                showProfileSettingsView();
            } catch (error) {
                showToast('Hata: ' + error.message, 'error');
            }
        } else {
            showToast('Lütfen geçerli bir email adresi girin.', 'error');
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        closeProfileDropdown();
        closeSidebar();
        try {
            await signOut(auth);
            applyThemeSettings(defaultThemeSettings);
            if (bgColorInput) bgColorInput.value = defaultThemeSettings.bgColor;
            if (uiTextColorInput) uiTextColorInput.value = defaultThemeSettings.uiText;
            if (noteTextColorInput) noteTextColorInput.value = defaultThemeSettings.noteText;
            if (uiFontSelect) uiFontSelect.value = defaultThemeSettings.uiFont;
            if (noteFontSelect) noteFontSelect.value = defaultThemeSettings.noteFont;
            if (fontSizeInput) fontSizeInput.value = defaultThemeSettings.fontSize;
            if (themeModeButton) {
                themeModeButton.classList.toggle('active', defaultThemeSettings.themeMode === 'dark');
                themeModeButton.textContent = defaultThemeSettings.themeMode === 'dark' ? 'Karanlık' : 'Aydınlık';
            }
            if (profileImagePreview) {
                profileImagePreview.src = '';
                profileImagePreview.style.display = 'none';
            }
            showToast('Çıkış yapıldı.', 'success');
        } catch (error) {
            showToast('Çıkış Hatası: ' + error.message, 'error');
        }
    });
}

document.addEventListener('click', (e) => {
    if (profileDropdown && !profileDropdown.contains(e.target) && !profileIcon.contains(e.target)) {
        closeProfileDropdown();
    }
});

// ============================================
// Event Listeners - Profile Picture
// ============================================

if (profileImageInput && profileImagePreview) {
    profileImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Data = e.target.result;
                const image = new Image();
                image.onload = async () => {
                    const maxDimension = 500;
                    let { width, height } = image;
                    const ratio = Math.min(maxDimension / width, maxDimension / height, 1);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0, width, height);

                    const compressedData = canvas.toDataURL('image/jpeg', 0.6);
                    profileImagePreview.src = compressedData;
                    profileImagePreview.style.display = 'block';

                    const user = auth.currentUser;
                    if (user) {
                        try {
                            await setDoc(doc(db, 'users', user.uid), {
                                profilePic: compressedData
                            }, { merge: true });
                            console.log('✅ Profil fotoğrafı Firestore\'a kaydedildi');
                        } catch (error) {
                            console.error('❌ Profil fotoğrafı kaydedilirken hata:', error);
                            showToast('Profil fotoğrafı kaydedilemedi.', 'error');
                        }
                    }
                };
                image.onerror = () => {
                    showToast('Görsel yüklenirken hata oluştu.', 'error');
                };
                image.src = base64Data;
            };
            reader.readAsDataURL(file);
        }
    });
}

if (updateProfileBtn) {
    updateProfileBtn.addEventListener('click', async (e) => {
        const button = e.currentTarget;
        button.disabled = true;
        const previousText = button.textContent;
        button.textContent = 'Güncelleniyor...';

        try {
            const user = auth.currentUser;
            if (!user) {
                showToast('Lütfen önce giriş yapın.', 'error');
                return;
            }

            const username = (editUsernameInput?.value?.trim()) || displayUsername?.textContent?.trim() || '';
            let profilePic = null;
            if (profileImagePreview && profileImagePreview.src && profileImagePreview.src.startsWith('data:image')) {
                profilePic = profileImagePreview.src;
            }

            const payload = {};
            if (username) payload.username = username;
            if (profilePic) payload.profilePic = profilePic;

            if (Object.keys(payload).length === 0) {
                showToast('Güncellenecek profil verisi bulunamadı.', 'error');
                return;
            }

            await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
            if (profilePic) {
                updateProfileIcon(profilePic);
            }
            if (username && user.displayName !== username) {
                await updateProfile(user, { displayName: username });
            }
            showToast('Profil güncellendi', 'success');
        } catch (error) {
            console.error('❌ Profil güncellenirken hata:', error);
            showToast('Profil güncellenirken hata oluştu.', 'error');
        } finally {
            button.disabled = false;
            button.textContent = previousText || 'Güncelle';
        }
    });
}

// ============================================
// Event Listeners - Theme Settings
// ============================================

bgColorInput?.addEventListener('input', (event) => {
    updateThemeSettingAndSave('savedBgColor', '--bg-color', event.target.value);
});

uiTextColorInput?.addEventListener('input', (event) => {
    updateThemeSettingAndSave('savedUiColor', '--ui-text', event.target.value);
});

noteTextColorInput?.addEventListener('input', (event) => {
    updateThemeSettingAndSave('savedNoteColor', '--note-text', event.target.value);
});

uiFontSelect?.addEventListener('input', (event) => {
    updateThemeSettingAndSave('savedUiFont', '--ui-font', event.target.value);
});

noteFontSelect?.addEventListener('input', (event) => {
    updateThemeSettingAndSave('savedNoteFont', '--note-font', event.target.value);
});

fontSizeInput?.addEventListener('input', (event) => {
    updateThemeSettingAndSave('savedFontSize', '--global-font-size', `${event.target.value}px`);
});

themeModeButton?.addEventListener('click', async () => {
    const currentSettings = await loadUserSettings(auth.currentUser?.uid) || defaultThemeSettings;
    const currentMode = currentSettings.themeMode || 'dark';
    const nextMode = currentMode === 'dark' ? 'light' : 'dark';

    const uiColor = nextMode === 'dark' ? '#ffffff' : '#111827';
    const bgColor = nextMode === 'dark' ? '#1a1a1a' : '#f3f4f6';

    await updateThemeSettingAndSave('savedUiColor', '--ui-text', uiColor);
    await updateThemeSettingAndSave('savedBgColor', '--bg-color', bgColor);
    
    if (auth.currentUser) {
        const settings = await loadUserSettings(auth.currentUser.uid) || defaultThemeSettings;
        settings.themeMode = nextMode;
        await saveUserSettings(auth.currentUser.uid, settings);
    }

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

if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
        closeSidebar();
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        closeSidebar();
    });
}

// ============================================
// Auth State Listener
// ============================================

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in
        if (userNameDisplay) {
            userNameDisplay.textContent = user.displayName || 'Kullanıcı';
        }
        
        // Load and apply profile picture
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        if (userData.profilePic && profileIcon) {
            updateProfileIcon(userData.profilePic);
            if (profileImagePreview) {
                profileImagePreview.src = userData.profilePic;
                profileImagePreview.style.display = 'block';
            }
        } else if (profileIcon) {
            profileIcon.innerHTML = '';
            const iconSpan = document.createElement('span');
            iconSpan.className = 'profile-icon-text';
            iconSpan.textContent = getUserInitials(user.displayName || user.email);
            profileIcon.appendChild(iconSpan);
        }
        
        // Fill profile settings
        const profileUsername = document.getElementById('profileUsername');
        const profileEmail = document.getElementById('profileEmail');
        if (profileUsername) profileUsername.value = user.displayName || '';
        if (profileEmail) profileEmail.value = user.email || '';
        
        closeAuthModal();
        closeSidebar();
        
        // Load user's theme settings
        await loadThemeSettings();
        
        // Load user's notes
        if (calendarInstance) {
            await calendarInstance.loadNotesFromFirestore();
            calendarInstance.render();
        }
    } else {
        // User is logged out
        userNameDisplay.textContent = '';
        if (profileIcon) {
            profileIcon.innerHTML = '<span class="profile-icon-text">👤</span>';
        }
        
        // Reset theme to defaults
        applyThemeSettings(defaultThemeSettings);
        if (bgColorInput) bgColorInput.value = defaultThemeSettings.bgColor;
        if (uiTextColorInput) uiTextColorInput.value = defaultThemeSettings.uiText;
        if (noteTextColorInput) noteTextColorInput.value = defaultThemeSettings.noteText;
        if (uiFontSelect) uiFontSelect.value = defaultThemeSettings.uiFont;
        if (noteFontSelect) noteFontSelect.value = defaultThemeSettings.noteFont;
        if (fontSizeInput) fontSizeInput.value = defaultThemeSettings.fontSize;
        if (themeModeButton) {
            themeModeButton.classList.toggle('active', defaultThemeSettings.themeMode === 'dark');
            themeModeButton.textContent = defaultThemeSettings.themeMode === 'dark' ? 'Karanlık' : 'Aydınlık';
        }
        
        if (profileImagePreview) {
            profileImagePreview.src = '';
            profileImagePreview.style.display = 'none';
        }
        
        closeSidebar();
        setAuthMode('login');
        openAuthModal();
        
        // Clear notes
        if (calendarInstance) {
            calendarInstance.notes = {};
            calendarInstance.render();
        }
    }
});
