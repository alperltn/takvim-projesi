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
    calendarInstance = new Calendar();
    new NoteModal();
    
    // Load notes from Firestore on page load
    await calendarInstance.loadNotesFromFirestore();
    calendarInstance.render();
});

// ==========================================
// KİMLİK DOĞRULAMA (AUTHENTICATION) İŞLEMLERİ
// ==========================================

const usernameInput = document.getElementById('username-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userStatus = document.getElementById('user-status');

// 1. Kayıt Olma İşlemi
registerBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if(!username || !email || !password) {
        showToast("Lütfen kullanıcı adı, e-posta ve şifre girin!", 'error');
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
        })
        .catch((error) => {
            showToast("Kayıt Hatası: " + error.message, 'error');
        });
});

// 2. Giriş Yapma İşlemi
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if(!email || !password) {
        showToast("Lütfen e-posta ve şifre girin!", 'error');
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            showToast("Başarıyla giriş yapıldı!", 'success');
        })
        .catch((error) => {
            showToast("Giriş Hatası: " + error.message, 'error');
        });
});

// 3. Çıkış Yapma İşlemi
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        showToast("Çıkış yapıldı.", 'success');
    });
});

// 4. Kullanıcı Durumunu Dinleme (Giriş yaptı mı, yapmadı mı?)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Kullanıcı giriş yapmışsa arayüzü güncelle
        userStatus.textContent = "Hoş geldin, " + (user.displayName || user.email);
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        usernameInput.style.display = 'none';
        emailInput.style.display = 'none';
        passwordInput.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        
        // Load user's notes when logged in
        if (calendarInstance) {
            await calendarInstance.loadNotesFromFirestore();
            calendarInstance.render();
        }
    } else {
        // Kullanıcı giriş yapmamışsa
        userStatus.textContent = "Giriş Yapılmadı";
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        usernameInput.style.display = 'inline-block';
        emailInput.style.display = 'inline-block';
        passwordInput.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        
        // Clear notes when logged out
        if (calendarInstance) {
            calendarInstance.notes = {};
            calendarInstance.render();
        }
    }
});