// === YENİ: FIREBASE KURULUMU ===
const firebaseConfig = {
    apiKey: "AIzaSyAxPdX6t-m5caIprX6dYl9irtzXTqdRprU",
    authDomain: "fate-roller-denememiz.firebaseapp.com",
    projectId: "fate-roller-denememiz",
    storageBucket: "fate-roller-denememiz.firebasestorage.app",
    messagingSenderId: "697467987785",
    appId: "1:697467987785:web:02f69e0071d0c3e3b45c98",
    measurementId: "G-X7TNS9FL43"
};

// Firebase'i başlat
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// ==================================
// === DİL DESTEĞİ ALTYAPISI ===
let currentLang = localStorage.getItem('fateLang') || 'tr';

// === GÜNCELLENMİŞ T() FONKSİYONU (Parametre Destekli) ===
function t(key, params = {}) {
    // 1. Anahtarı bul
    let text = "";
    if (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) {
        text = TRANSLATIONS[currentLang][key];
    } else {
        return key; // Çeviri yoksa anahtarı (veya metni) olduğu gibi döndür
    }

    // 2. Varsa parametreleri {parametre} yerlerine yerleştir
    // Örn: "Hoşgeldin {name}" -> "Hoşgeldin Ahmet"
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });

    return text;
}

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('fateLang', lang);
    applyTranslations();
    
    populateSkillManager();
    populateSkillSelector();
    renderStunts();
    renderRollLog(); 
    updateUIFromData(); 
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
    document.documentElement.lang = currentLang;
    // === OYUN MODU BAŞLIKLARINI GÜNCELLE ===
    // Kartların üzerine 'data-title' özelliği ekliyoruz, CSS buradan okuyacak.
    const cardAspects = document.getElementById('card-aspects');
    if (cardAspects) cardAspects.setAttribute('data-title', t('card_aspects')); // "Aspektler"

    const cardSkills = document.getElementById('card-skills');
    if (cardSkills) cardSkills.setAttribute('data-title', t('card_skills'));   // "Beceriler"

    const cardStunts = document.getElementById('card-stunts');
    if (cardStunts) cardStunts.setAttribute('data-title', t('card_stunts'));   // "Yetenekler"
}

// === VERİ ===
const DEFAULT_FATE_SKILLS = [
    "Academics", "Athletics", "Burglary", "Contacts", "Crafts", "Deceive", "Drive",
    "Empathy", "Fight", "Investigate", "Lore", "Notice", "Physique",
    "Provoke", "Rapport", "Resources", "Shoot", "Stealth", "Will"
];
let FATE_SKILLS = [...DEFAULT_FATE_SKILLS]; // Değiştirilebilir aktif liste
let tempCampaignSkills = [...DEFAULT_FATE_SKILLS]; // Kampanya oluştururken kullanılan geçici liste
// YENİ: Beceri Piramidi Limitleri
const SKILL_PYRAMID_LIMITS = {
    4: 1, // 1 adet +4
    3: 2, // 2 adet +3
    2: 3, // 3 adet +2
    1: 4  // 4 adet +1
};

const fateLadderDescriptors = {
    "8": "Efsanevi!", "7": "İnanılmaz!", "6": "Şahane!", "5": "Muhteşem!",
    "4": "Harika!", "3": "Güzel!", "2": "İyi!", "1": "Eh",
    "0": "Sıradan", "-1": "Zayıf", "-2": "Kötü", "-3": "Rezalet!",
    "-4": "Felaket!"
};

let characterData = {};
let characterList = []; // Tüm karakterlerin listesini tutacak dizi
let activeCharacterIndex = 0; // O an seçili olan karakterin index'i
let campaignData = {};
let rollHistory = [];
let lastRoll = { total: 0, descriptor: "", logEntry: null };
let saveToastTimer = null; // Kaydetme bildiriminin zamanlayıcısını tutar

let currentManagedCampaignId = null;
let liveCharacterListener = null;
let liveAspectListener = null;
let liveSubmissionListener = null;
let firebaseSaveTimer = null; // Firebase frenleme sistemi


function getDefaultCharacter() {
    const defaultSkills = {};
    FATE_SKILLS.forEach(skill => {
        defaultSkills[skill] = 0;
    });
    const defaultRefresh = 3;
    return {
        name: "", description: "", refresh: defaultRefresh,
        currentFatePoints: defaultRefresh,
        highConcept: "", trouble: "",
        relationship: "", aspect1: "", aspect2: "",
        skills: defaultSkills,
        stunts: [],
        stress: { physical: [false, false, false, false], mental: [false, false, false, false] },
        consequences: { mild: "", moderate: "", severe: "", mildExtra: "" }
    };
}
function getDefaultCampaign() {
    return {
        campaignName: "",
        gmFatePoints: 1,
        situationAspects: []
    };
}
// === BECERİ YÖNETİM SİSTEMİ ===

// 1. Küresel Beceri Listesini Güncelle (Oyuncu Bağlanınca)
function updateSkillList(newSkillsArray) {
    if (newSkillsArray && Array.isArray(newSkillsArray) && newSkillsArray.length > 0) {
        FATE_SKILLS = [...newSkillsArray];
    } else {
        FATE_SKILLS = [...DEFAULT_FATE_SKILLS];
    }
    // Arayüzü yenile
    populateSkillManager();
    populateSkillSelector();
    renderRollLog(); 
}

// 2. GM Beceri Editörünü Ekrana Çiz
function renderCampaignSkillEditor() {
    campaignSkillChipsContainer.innerHTML = "";
    
    tempCampaignSkills.forEach((skill, index) => {
        const chip = document.createElement('div');
        chip.className = 'skill-chip';
        
        // Beceri ismi (Çeviri varsa çevir, yoksa olduğu gibi yaz)
        let displayName = t(`skill_${skill.toLowerCase()}`);
        if (displayName === `skill_${skill.toLowerCase()}`) displayName = skill;
        
        chip.innerHTML = `<span>${displayName}</span>`;
        
        // Silme Butonu (X)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'skill-chip-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => { removeSkillFromEditor(index); };
        
        chip.appendChild(removeBtn);
        campaignSkillChipsContainer.appendChild(chip);
    });
}

function addSkillToEditor() {
    const val = campaignSkillAddInput.value.trim();
    if (!val) return;
    
    const exists = tempCampaignSkills.some(s => s.toLowerCase() === val.toLowerCase());
    if (exists) {
        showModalAlert({ title: "msg_warning", message: "msg_duplicate_skill" });
        return;
    }
    
    tempCampaignSkills.push(val);
    tempCampaignSkills.sort((a, b) => a.localeCompare(b));
    renderCampaignSkillEditor();
    campaignSkillAddInput.value = "";
}

function removeSkillFromEditor(index) {
    tempCampaignSkills.splice(index, 1);
    renderCampaignSkillEditor();
}

function resetSkillEditorToDefault() {
    tempCampaignSkills = [...DEFAULT_FATE_SKILLS];
    renderCampaignSkillEditor();
}


// === HTML ELEMENTLERİ ===
const burgerMenu = document.getElementById('burger-menu');
const burgerToggle = document.getElementById('burger-toggle');
const navButtons = document.querySelectorAll('.nav-button');
const allViews = document.querySelectorAll('.tab-content');
const themeToggleButton = document.getElementById('theme-toggle-button');
const campaignStatusDisplay = document.getElementById('campaign-status-display');
const campaignStatusText = document.getElementById('campaign-status-text');
const leaveCampaignButton = document.getElementById('leave-campaign-button');
const charNameInput = document.getElementById('char-name');
const charDescInput = document.getElementById('char-desc');
const charRefreshInput = document.getElementById('char-refresh');
const charHighConceptInput = document.getElementById('char-high-concept');
const charTroubleInput = document.getElementById('char-trouble');
const charRelationshipInput = document.getElementById('char-relationship');
const charAspect1Input = document.getElementById('char-aspect-1');
const charAspect2Input = document.getElementById('char-aspect-2');
const skillListContainer = document.getElementById('skill-list');
const stuntListUl = document.getElementById('stunt-list-ul');
const stuntInput = document.getElementById('stunt-input');
const addStuntButton = document.getElementById('add-stunt-button');
const stuntCounter = document.getElementById('stunt-counter');
const stuntLimitDisplay = document.getElementById('stunt-limit-display');
const stuntCurrentDisplay = document.getElementById('stunt-current-display');
const physicalStressTrack = document.getElementById('physical-stress-track');
const mentalStressTrack = document.getElementById('mental-stress-track');
const consequenceMildInput = document.getElementById('consequence-mild');
const consequenceModerateInput = document.getElementById('consequence-moderate');
const consequenceSevereInput = document.getElementById('consequence-severe');
const charFatePointsDisplay = document.getElementById('char-fate-points');
const plusFatePointButton = document.getElementById('plus-fate-point');
const minusFatePointButton = document.getElementById('minus-fate-point');
const rollButton = document.getElementById('roll-button');
const diceElements = document.querySelectorAll('.die');
const skillSelector = document.getElementById('skill-selector');
const resultDice = document.getElementById('result-dice');
const resultSkill = document.getElementById('result-skill');
const resultTotal = document.getElementById('result-total');
const resultDescriptor = document.getElementById('result-descriptor');
const rollLogList = document.getElementById('roll-log-list');
const spendFatePointButton = document.getElementById('spend-fate-point-button');
const fateSpendButtons = document.getElementById('fate-spend-buttons');
const rerollFateButton = document.getElementById('reroll-fate-button');
// YENİ KARAKTER ELEMENTLERİ
const characterSelector = document.getElementById('character-selector');
const addNewCharacterButton = document.getElementById('add-new-character-btn');
const deleteCharacterButton = document.getElementById('delete-character-btn');
// === YENİ KOD BAŞLANGICI: GM FATE PUANI ELEMENTLERİ ===
const gmFatePointsDisplay = document.getElementById('gm-fate-points-display');
const gmPlusFatePointButton = document.getElementById('gm-plus-fate-point');
const gmMinusFatePointButton = document.getElementById('gm-minus-fate-point');
// === YENİ KOD BİTİŞİ ===

// GM Kampanya Formu Elementleri
const newCampaignNameInput = document.getElementById('new-campaign-name');
const newCampaignGmNameInput = document.getElementById('new-campaign-gm-name');
const newCampaignSystemInput = document.getElementById('new-campaign-system');
const newCampaignSettingInput = document.getElementById('new-campaign-setting');
const newCampaignLoreInput = document.getElementById('new-campaign-lore');
const newCampaignPlayersInput = document.getElementById('new-campaign-players');
const newCampaignDescInput = document.getElementById('new-campaign-desc');
const newCampaignPasswordInput = document.getElementById('new-campaign-password');
const campaignSkillChipsContainer = document.getElementById('campaign-skill-chips');
const campaignSkillAddInput = document.getElementById('campaign-skill-add-input');
const campaignSkillAddBtn = document.getElementById('campaign-skill-add-btn');
const campaignSkillResetBtn = document.getElementById('campaign-skill-reset-btn');
const createCampaignButton = document.getElementById('create-campaign-button');

const exportCharButton = document.getElementById('export-char-button');
const importCharButton = document.getElementById('import-char-button');
const importFileInput = document.getElementById('import-file-input');
const resetCharButton = document.getElementById('reset-char-button');
const publicCampaignListContainer = document.getElementById('public-campaign-list');

// GM Admin Paneli Elementleri
const gmAdminTitle = document.getElementById('gm-admin-title');
const gmSituationAspectList = document.getElementById('gm-situation-aspect-list');
const gmSituationAspectInput = document.getElementById('gm-situation-aspect-input');
const gmAddSituationAspectButton = document.getElementById('gm-add-situation-aspect-button');
const gmSubmittedCharList = document.getElementById('gm-submitted-char-list');
const gmApprovedPlayersList = document.getElementById('gm-approved-players-list');
const deleteCampaignButton = document.getElementById('delete-campaign-button');
const editCampaignButton = document.getElementById('edit-campaign-button');
const updateCampaignButton = document.getElementById('update-campaign-button');

// Canlı Aspekt Listesi Elementleri
const liveSituationAspectsCard = document.getElementById('live-situation-aspects-card');
const liveSituationAspectList = document.getElementById('live-situation-aspect-list');

// MODAL Elementleri
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalInputGroup = document.getElementById('modal-input-group');
const modalInput = document.getElementById('modal-input');
const modalConfirmButton = document.getElementById('modal-confirm-button');
const modalCancelButton = document.getElementById('modal-cancel-button');
// YENİ TOAST ELEMENTİ
const saveToastNotification = document.getElementById('save-toast-notification');
const gameModeToggleBtn = document.getElementById('game-mode-toggle-btn');
const gameModeIcon = document.getElementById('game-mode-icon');
const charViewSection = document.getElementById('char-view');


let animationInterval = null;
const ANIMATION_DURATION = 600;
const ANIMATION_FLICKER_RATE = 50;


// === MODAL SİSTEMİ (DİL DESTEKLİ) ===
let modalResolver = null;

function showModalPrompt({ title, message, inputType = 'text' }) {
    // Başlığı çevirmeyi dene (Eğer lang.js'de varsa çevirir, yoksa olduğu gibi yazar)
    modalTitle.textContent = t(title); 
    modalMessage.textContent = message;
    
    modalInput.value = "";
    modalInput.type = inputType;
    modalInputGroup.style.display = 'block';
    
    modalCancelButton.style.display = 'inline-block';
    // Butonları dile göre ayarla
    modalCancelButton.textContent = t('btn_cancel'); 
    modalConfirmButton.textContent = t('btn_confirm'); 
    
    modalOverlay.classList.remove('modal-hidden');
    modalInput.focus();
    return new Promise((resolve) => {
        modalResolver = resolve;
    });
}

function showModalConfirm({ title, message }) {
    modalTitle.textContent = t(title); // Başlık çevirisi
    modalMessage.textContent = message;
    
    modalInputGroup.style.display = 'none';
    
    modalCancelButton.style.display = 'inline-block';
    // Butonları dile göre ayarla
    modalCancelButton.textContent = t('btn_cancel');
    modalConfirmButton.textContent = t('btn_confirm');
    
    modalOverlay.classList.remove('modal-hidden');
    return new Promise((resolve) => {
        modalResolver = resolve;
    });
}

function showModalAlert({ title, message }) {
    modalTitle.textContent = t(title); // Başlık çevirisi
    modalMessage.textContent = message;
    
    modalInputGroup.style.display = 'none';
    modalCancelButton.style.display = 'none'; // Alert'te iptal butonu olmaz
    
    // Tek buton "Tamam/OK" olsun
    modalConfirmButton.textContent = t('btn_ok');
    
    modalOverlay.classList.remove('modal-hidden');
    return new Promise((resolve) => {
        modalResolver = resolve;
    });
}

function handleModalConfirm() {
    if (!modalResolver) return;
    if (modalInputGroup.style.display === 'block') {
        modalResolver(modalInput.value);
    } else {
        modalResolver(true);
    }
    closeModal();
}

function handleModalCancel() {
    if (!modalResolver) return;
    modalResolver(null);
    closeModal();
}

// Modalı kapatırken butonları varsayılan dile döndüren yardımcı fonksiyon
function closeModal() {
    modalOverlay.classList.add('modal-hidden');
    modalResolver = null;
    // Kapanırken butonları tekrar varsayılan "Onayla" haline getirelim (Temizlik)
    setTimeout(() => {
        modalConfirmButton.textContent = t('btn_confirm');
        modalCancelButton.textContent = t('btn_cancel');
    }, 200);
}
// === MODAL SİSTEMİ SONU ===

// === YENİ FONKSİYON: "Kaydedildi" Bildirimini Göster ===
function showSaveIndicator() {
    // saveToastNotification elementinin varlığını kontrol et
    if (!saveToastNotification) {
        console.warn("Kaydetme bildirimi elementi (save-toast-notification) bulunamadı.");
        return;
    }
    if (saveToastTimer) {
        clearTimeout(saveToastTimer);
    }
    saveToastNotification.classList.add('show');
    saveToastTimer = setTimeout(() => {
        saveToastNotification.classList.remove('show');
        saveToastTimer = null;
    }, 2000);
}

// === YENİ FONKSİYON: Karakter Menüsünü (Dropdown) Doldur ===
function renderCharacterMenu() {
    if (!characterSelector) return;

    characterSelector.innerHTML = "";

    characterList.forEach((char, index) => {
        const option = document.createElement('option');
        option.value = index;
        // DÜZELTME: t('txt_unnamed_char') kullanıldı
        const charName = (char && char.name && char.name.trim()) 
            ? char.name.trim() 
            : `${t('txt_unnamed_char')} ${index + 1}`;
            
        option.textContent = charName;
        if (index === activeCharacterIndex) {
            option.selected = true;
        }
        characterSelector.appendChild(option);
    });
}

// === DİL GÜNCELLENDİ: handleCharacterSwitch ===
async function handleCharacterSwitch() {
    const newIndex = parseInt(characterSelector.value, 10);
    
    if (newIndex >= 0 && newIndex < characterList.length) {
        if (localStorage.getItem('fateCampaignStatus') === 'approved' || localStorage.getItem('fateCampaignStatus') === 'pending') {
            await showModalAlert({
                title: "msg_operation_blocked",
                message: "txt_blocked_live"
            });
            characterSelector.value = activeCharacterIndex;
            return;
        }

        activeCharacterIndex = newIndex;
        loadCharacter(); 
        updateUIFromData(); 
        populateSkillManager(); 
        populateSkillSelector(); 
    }
}

// === DİL GÜNCELLENDİ: handleAddNewCharacter ===
function handleAddNewCharacter() {
    if (localStorage.getItem('fateCampaignStatus') === 'approved' || localStorage.getItem('fateCampaignStatus') === 'pending') {
        showModalAlert({
            title: "msg_operation_blocked",
            message: "txt_blocked_live"
        });
        return;
    }
    addNewCharacter(true);
}
// === YENİ FONKSİYON: Yeni karakter ekleyen yardımcı fonksiyon (DÖNGÜ DÜZELTİLDİ) ===
function addNewCharacter(saveAfterAdd = true) {
    const newChar = getDefaultCharacter();
    characterList.push(newChar);
    activeCharacterIndex = characterList.length - 1;

    if (saveAfterAdd) {
        saveCharacter(); // Listeyi kaydeder ve menüyü günceller
    }
    
    // 'characterData'yı ayarla ve UI'ı güncelle
    characterData = newChar;
    renderCharacterMenu(); // Menüyü son isimle güncelle
    updateUIFromData(); // Ekranı yeni boş karakterle doldur
    
    // DÜZELTME: Yeni karakter eklendiğinde beceriler boş gelmesin
    populateSkillManager();
    populateSkillSelector();
}


// === VERİ YÖNETİMİ (localStorage & Firebase) ===

async function updateLiveCharacter(characterObject) {
    const activeCampaignId = localStorage.getItem('fateActiveCampaignId');
    const activeCharacterName = localStorage.getItem('fateActiveCharacterName');
    
    if (localStorage.getItem('fateCampaignStatus') !== 'approved' || !activeCampaignId || !activeCharacterName) {
        return;
    }

    try {
        const playerRef = db.collection("publicCampaigns").doc(activeCampaignId).collection("players").doc(activeCharacterName);
        await playerRef.set(characterObject);
    } catch (error) {
        console.error("Firebase'e canlı karakter güncellemesi başarısız:", error);
    }
}

// === SADECE KOTA DOSTU SAVE CHARACTER ===
async function saveCharacter() {
    // 1. Önceki standart kaydetme işlemleri (Burası aynı kalıyor)
    if (activeCharacterIndex < 0 || activeCharacterIndex >= characterList.length) {
        activeCharacterIndex = 0;
        if (characterList.length === 0) characterList.push(getDefaultCharacter());
    }
    
    if (characterData) {
        characterList[activeCharacterIndex] = characterData;
    } else {
        return;
    }
    
    // LocalStorage'a ANINDA kaydet (Veri kaybı olmasın)
    localStorage.setItem('fateCharacterList', JSON.stringify(characterList));
    
    // Menü ismini güncelle
    const selector = document.getElementById('character-selector');
    if (selector && selector.options[activeCharacterIndex]) {
        const charName = (characterData.name && characterData.name.trim()) 
            ? characterData.name.trim() 
            : `${t('txt_unnamed_char')} ${activeCharacterIndex + 1}`;
            
        selector.options[activeCharacterIndex].textContent = charName;
    }

    // 2. FIREBASE KISMI (Burayı değiştirdik)
    // Sadece "approved" (Canlı) durumundaysak işlem yap
    if (localStorage.getItem('fateCampaignStatus') === 'approved') {
        
        // --- İSİM GÜVENLİK KONTROLÜ ---
        // Sadece bağlı olan karakterin verisini gönder. 
        // Eğer oyuncu başka karaktere geçtiyse Firebase'e yazma.
        const connectedCharName = localStorage.getItem('fateActiveCharacterName');
        const currentEditName = characterData.name;

        if (connectedCharName !== currentEditName) {
            return; // İsim tutmuyor, gönderme!
        }

        // --- FRENE BASMA (DEBOUNCE) ---
        // Eğer zaten bekleyen bir kayıt işlemi varsa, onu iptal et.
        if (firebaseSaveTimer) {
            clearTimeout(firebaseSaveTimer);
        }

        // Yeni bir sayaç başlat (2 saniye bekle)
        firebaseSaveTimer = setTimeout(async () => {
            try {
                await updateLiveCharacter(characterData);
                console.log("Firebase'e yazıldı (Kota korumalı).");
                
                // İstersen "Kaydedildi" bildirimi buraya koyabilirsin
                if (typeof showSaveIndicator === 'function') showSaveIndicator();

            } catch (err) {
                console.error("Firebase hatası:", err);
            }
        }, 2000); // 2000ms = 2 Saniye gecikme
    }
}

function detachAllListeners() {
    if (liveCharacterListener) {
        liveCharacterListener();
        liveCharacterListener = null;
    }
    if (liveAspectListener) {
        liveAspectListener();
        liveAspectListener = null;
    }
    if (liveSubmissionListener) {
        liveSubmissionListener();
        liveSubmissionListener = null;
    }
}

// === DİL GÜNCELLENDİ: showCampaignStatus ===
async function showCampaignStatus(status, campaignName = '') {
    // Çeviri: "txt_status_live" ve "txt_status_pending" anahtarlarını kullanıyoruz.
    if (status === 'approved') {
        campaignStatusText.textContent = t("txt_status_live", { campaign: campaignName });
        campaignStatusDisplay.style.display = 'flex';
        leaveCampaignButton.style.display = 'block';
        leaveCampaignButton.textContent = t("btn_leave_campaign"); // Buton metni
    } else if (status === 'pending') {
        campaignStatusText.textContent = t("txt_status_pending", { campaign: campaignName });
        campaignStatusDisplay.style.display = 'flex';
        leaveCampaignButton.style.display = 'block';
        leaveCampaignButton.textContent = t("btn_leave_campaign"); // Buton metni
    } else {
        campaignStatusDisplay.style.display = 'none';
        leaveCampaignButton.style.display = 'none';
        if (status === 'denied') {
            await showModalAlert({ title: "msg_warning", message: "txt_application_status" });
        }
    }
}

// === DEĞİŞTİ: loadCharacter (Çoklu Karakter ve DÖNGÜ DÜZELTMESİ) ===
function loadCharacter() {
    const savedList = localStorage.getItem('fateCharacterList');
    
    if (savedList) {
        try {
            characterList = JSON.parse(savedList);
        } catch (e) {
            console.error("Karakter listesi okunamadı, sıfırlanıyor:", e);
            characterList = [];
        }
    } else {
        characterList = [];
    }

    // DÜZELTME: Liste boşsa, sonsuz döngü OLUŞTURMADAN ilk karakteri oluştur
    if (characterList.length === 0) {
        const newChar = getDefaultCharacter();
        characterList.push(newChar);
        activeCharacterIndex = 0;
        localStorage.setItem('fateCharacterList', JSON.stringify(characterList));
    }

    if (activeCharacterIndex >= characterList.length) {
        activeCharacterIndex = characterList.length - 1;
    }
    if (activeCharacterIndex < 0) {
        activeCharacterIndex = 0;
    }

    const defaultData = getDefaultCharacter();
    const activeChar = characterList[activeCharacterIndex];
    
    // Veri birleştirme (eski/eksik verileri düzeltmek için)
    const cleanStress = {
        physical: (activeChar && activeChar.stress && activeChar.stress.physical) ? activeChar.stress.physical : defaultData.stress.physical,
        mental: (activeChar && activeChar.stress && activeChar.stress.mental) ? activeChar.stress.mental : defaultData.stress.mental
    };
    const cleanConsequences = { ...defaultData.consequences, ...(activeChar ? activeChar.consequences : {}) };

    characterData = {
        ...defaultData, ...activeChar,
        skills: { ...defaultData.skills, ...(activeChar ? activeChar.skills : {}) },
        stress: cleanStress,
        consequences: cleanConsequences,
    };

    detachAllListeners();
    const status = localStorage.getItem('fateCampaignStatus');
    if (status !== 'approved' && status !== 'pending') {
        localStorage.setItem('fateCampaignStatus', 'offline');
        showCampaignStatus('offline');
    }
    checkActiveCampaignStatus();

    renderCharacterMenu();
}

// === DÜZELTME 1: CANLI MOD GÜNCELLEMESİ ===
async function checkActiveCampaignStatus() {
    const activeCampaignId = localStorage.getItem('fateActiveCampaignId');
    const activeCharacterName = localStorage.getItem('fateActiveCharacterName');

    if (!activeCampaignId || !activeCharacterName) {
        return;
    }

    const campaignRef = db.collection("publicCampaigns").doc(activeCampaignId);
    const playerRef = campaignRef.collection("players").doc(activeCharacterName);
    const submissionRef = campaignRef.collection("submissions").doc(activeCharacterName);

    try {
        const campaignDoc = await campaignRef.get();
       let campaignName = t("nav_campaign");
        if (campaignDoc.exists) {
            const cData = campaignDoc.data();
            campaignName = cData.name;
            
            // Özel Becerileri Yükle
            if (cData.customSkills && cData.customSkills.length > 0) {
                updateSkillList(cData.customSkills);
            } else {
                updateSkillList(null); // Varsayılana dön
            }
        }

        const playerDoc = await playerRef.get();

        if (playerDoc.exists) {
            localStorage.setItem('fateCampaignStatus', 'approved');
            await showCampaignStatus('approved', campaignName);
            detachAllListeners();

            liveCharacterListener = playerRef.onSnapshot(async (liveDoc) => {
                if (liveDoc.exists) {
                    console.log("CANLI VERİ GELDİ!");
                    
                    const parsedData = liveDoc.data();
                    const defaultData = getDefaultCharacter();
                    characterData = {
                        ...defaultData, ...parsedData,
                        skills: { ...defaultData.skills, ...parsedData.skills },
                        stress: { ...defaultData.stress, ...parsedData.stress },
                        consequences: { ...defaultData.consequences, ...parsedData.consequences },
                    };
                    
                    await saveCharacter();
                    updateUIFromData();
                    populateSkillManager();
                    populateSkillSelector();

                } else {
                    console.log("CANLI VERİ SİLİNDİ! (Oyundan Atıldı)");
                    detachAllListeners();
                    localStorage.removeItem('fateActiveCampaignId');
                    localStorage.removeItem('fateActiveCharacterName');
                    localStorage.setItem('fateCampaignStatus', 'denied');
                    await showCampaignStatus('denied');
                    
                    loadCharacter();
                    populateSkillManager();
                    populateSkillSelector();
                    updateUIFromData();
                }
            }, async (error) => {
                console.error("Canlı karakter dinlemesi başarısız:", error);
                await showModalAlert({ title: "msg_connection_error", message: "txt_live_connection_lost" });
            });
        
        } else {
            if (liveSubmissionListener) liveSubmissionListener();

            liveSubmissionListener = submissionRef.onSnapshot(async (subDoc) => {
                if (subDoc.exists) {
                    localStorage.setItem('fateCampaignStatus', 'pending');
                    await showCampaignStatus('pending', campaignName);
                } else {
                    if (liveSubmissionListener) {
                        liveSubmissionListener();
                        liveSubmissionListener = null;
                    }

                    const playerDoc = await playerRef.get();

                    if (playerDoc.exists) {
                        // ONAYLANDI
                        await showModalAlert({
                            title: "msg_success",
                            message: t("txt_approved", { name: activeCharacterName }) // "X oyuna onaylandı!"
                        });

                        loadCharacter();
                        populateSkillManager();
                        populateSkillSelector();
                        updateUIFromData();
                    } else {
                        // REDDEDİLDİ
                        await showModalAlert({
                            title: "msg_warning",
                            message: "txt_application_status" // "Başvurunuz reddedildi veya atıldınız"
                        });

                        localStorage.removeItem('fateActiveCampaignId');
                        localStorage.removeItem('fateActiveCharacterName');
                        localStorage.setItem('fateCampaignStatus', 'offline');

                        loadCharacter();
                        populateSkillManager();
                        populateSkillSelector();
                        updateUIFromData();
                    }
                }
            }, (error) => {
                 console.error("Başvuru dinlenirken hata:", error);
            });
        }
    } catch (error) {
        console.error("Kampanya durumu kontrol edilirken hata:", error);
    }
}


function loadCampaign() {
    campaignData = getDefaultCampaign();
}


// === TEMA YÖNETİMİ ===
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('fateTheme', theme);
    themeToggleButton.textContent = (theme === 'light') ? '🌙' : '☀️';
}
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = (currentTheme === 'light') ? 'dark' : 'light';
    setTheme(newTheme);
}

// === MENÜ VE NAVİGASYON ===
function toggleBurgerMenu() {
    document.body.classList.toggle('menu-is-open');
}

function switchView(viewName) {

    if (document.querySelector('.nav-button[data-view="campaign"].active')) {
        if (viewName !== 'campaign') {
            createCampaignButton.style.display = 'block';
            updateCampaignButton.style.display = 'none';
            newCampaignNameInput.value = "";
            resetSkillEditorToDefault(); // Editörü sıfırla
            newCampaignGmNameInput.value = "";
            newCampaignSystemInput.value = "FATE";
            newCampaignSettingInput.value = "";
            newCampaignLoreInput.value = "";
            newCampaignPlayersInput.value = "3";
            newCampaignDescInput.value = "";
            newCampaignPasswordInput.value = "";
        }
    }
    // === DÜZELTME: Kampanya sayfasına girerken editörü çiz ===
    if (viewName === 'campaign') {
        // Eğer liste boşsa (ilk açılışsa) varsayılanları yükle
        if (tempCampaignSkills.length === 0) {
            tempCampaignSkills = [...DEFAULT_FATE_SKILLS];
        }
        renderCampaignSkillEditor();
    }
    allViews.forEach(view => view.classList.remove('active'));
    navButtons.forEach(button => button.classList.remove('active'));
    
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    const targetButton = document.querySelector(`.nav-button[data-view="${viewName}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }
    
    if (viewName === 'find-campaign') {
        renderPublicCampaigns();
    }

    if (viewName === 'roller') {
        renderLiveSituationAspects();
    } else {
        if (liveAspectListener) {
            liveAspectListener();
            liveAspectListener = null;
        }
    }

    if (window.innerWidth <= 900 && document.body.classList.contains('menu-is-open')) {
        toggleBurgerMenu();
    }
}
// === MODÜL 4: OYUN MODU ===
let isGameMode = false;

function toggleGameMode() {
    isGameMode = !isGameMode;
    
    if (isGameMode) {
        // Oyun Modunu Aç
        document.body.classList.add('game-mode-on'); // TÜM VÜCUDA EKLE (Menü kontrolü için)
        charViewSection.classList.add('game-mode-active');
        
        gameModeToggleBtn.classList.remove('btn-secondary');
        gameModeToggleBtn.classList.add('btn-accent'); 
        gameModeIcon.textContent = "🎮"; 
        gameModeToggleBtn.title = t("lbl_game_mode_active");
        
        showSaveIndicator(); 
    } else {
        // Düzenleme Moduna Dön
        document.body.classList.remove('game-mode-on'); // SINIFI KALDIR
        charViewSection.classList.remove('game-mode-active');
        
        gameModeToggleBtn.classList.add('btn-secondary');
        gameModeToggleBtn.classList.remove('btn-accent');
        gameModeIcon.textContent = "✏️"; 
        gameModeToggleBtn.title = t("btn_edit_mode");
    }
}

// === STUNT YÖNETİMİ (DÜZELTİLDİ) ===

function updateRefreshAndStunts() {
    if (!characterData || !characterData.skills) return; 

    const currentRefresh = parseInt(characterData.refresh) || 1;
    const maxStunts = 6 - currentRefresh;
    const currentStunts = (characterData.stunts && characterData.stunts.length) ? characterData.stunts.length : 0;

    stuntLimitDisplay.textContent = maxStunts;
    stuntCurrentDisplay.textContent = currentStunts;

    // DÜZELTME: Limit ve Kullanılan etiketlerini (varsa HTML'de text varsa) güncellemek için:
    // (Bunun için HTML'de bu sayıların yanındaki yazılara class vermemiz lazım ama 
    // şimdilik sadece placeholder'ları düzeltelim)

    if (currentStunts >= maxStunts) {
        stuntInput.disabled = true;
        addStuntButton.disabled = true;
        stuntInput.placeholder = t("txt_stunt_limit"); 
    } else {
        stuntInput.disabled = false;
        addStuntButton.disabled = false;
        stuntInput.placeholder = t("placeholder_stunt");
    }
}
async function renderStunts() {
    stuntListUl.innerHTML = "";
    if (!characterData.stunts || characterData.stunts.length === 0) {
        // DÜZELTME: "(Boş)" yazısı çeviriden gelsin
        stuntListUl.innerHTML = `<li class='stunt-list-item muted'>${t("card_stunts")} - ${t("txt_empty_stunt")}</li>`; 
        return;
    }
    characterData.stunts.forEach((stuntText, index) => {
        const li = document.createElement('li');
        li.className = 'stunt-list-item';
        const p = document.createElement('p');
        p.textContent = stuntText;
        const removeButton = document.createElement('button');
        removeButton.className = 'btn btn-danger-outline';
        removeButton.textContent = 'X';
        removeButton.title = t("btn_delete"); // "Sil"
        removeButton.addEventListener('click', async () => {
            await handleRemoveStunt(index);
        });
        li.appendChild(p);
        li.appendChild(removeButton);
        stuntListUl.appendChild(li);
    });
}

// === DÜZELTME (PROBLEM 2): handleAddStunt ===
async function handleAddStunt() {
    const currentRefresh = parseInt(characterData.refresh) || 1;
    const maxStunts = 6 - currentRefresh;
    const currentStunts = (characterData.stunts && characterData.stunts.length) ? characterData.stunts.length : 0;

    if (currentStunts >= maxStunts) {
        await showModalAlert({
            title: "msg_limit_exceeded",
            message: "txt_stunt_limit"
        });
        return;
    }
    
    const stuntText = stuntInput.value.trim();
    if (stuntText) {
        if (!characterData.stunts) {
             characterData.stunts = [];
        }
        characterData.stunts.push(stuntText);
        await saveCharacter(); // Kaydet (ve toast'u göster)
        renderStunts(); // DÜZELTME: UI'ı anında güncelle
        updateRefreshAndStunts(); // DÜZELTME: Sayacı güncelle
        stuntInput.value = "";
    }
}
async function handleRemoveStunt(index) {
    if (!characterData.stunts) return;
    characterData.stunts.splice(index, 1);
    await saveCharacter();
    renderStunts();
    updateRefreshAndStunts();
}

function handleCampaignPlayerInputValidation() {
    const min = 1;
    const max = 10;
    
    let value = parseInt(newCampaignPlayersInput.value, 10);

    if (isNaN(value) || value < min) {
        newCampaignPlayersInput.value = min;
    } else if (value > max) {
        newCampaignPlayersInput.value = max;
    } else {
        newCampaignPlayersInput.value = value;
    }
}

// === KAMPANYA YÖNETİMİ (FIREBASE) ===

// === DİL GÜNCELLENDİ: handleCreateCampaign ===
async function handleCreateCampaign() {
    const name = newCampaignNameInput.value.trim();
    const system = newCampaignSystemInput.value.trim();
    const gmName = newCampaignGmNameInput.value.trim();
    const setting = newCampaignSettingInput.value.trim();
    const lore = newCampaignLoreInput.value.trim();
    const players = parseInt(newCampaignPlayersInput.value) || 0;
    const desc = newCampaignDescInput.value.trim();
    const password = newCampaignPasswordInput.value.trim();
    
    if (players < 1 || players > 10) {
        // --- DÜZELTME 1 ---
        await showModalAlert({ 
            title: "msg_rule_violation", 
            message: t("txt_player_count_error") 
        });
        return; 
    }

    if (!name || !password || !desc || !setting || !gmName) {
        // --- DÜZELTME 2 (Senin aldığın hata) ---
        await showModalAlert({ 
            title: "msg_warning", 
            message: t("txt_missing_info") 
        });
        return;
    }
    
    createCampaignButton.disabled = true;
    createCampaignButton.textContent = t("btn_creating");

    try {
        // Beceri Editöründen Veriyi Al
    let customSkills = null;
    // Eğer liste varsayılan değilse, özel listeyi al
    const isDefault = (tempCampaignSkills.length === DEFAULT_FATE_SKILLS.length) && 
                      tempCampaignSkills.every((val, index) => val === DEFAULT_FATE_SKILLS[index]);
    
    if (!isDefault) {
        customSkills = [...tempCampaignSkills];
    }
        const newCampaign = {
            name: name, gmName: gmName, system: system, setting: setting,
            lore: lore, maxPlayers: players, currentPlayerCount: 0, 
            description: desc, password: password,
            customSkills: customSkills,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            situationAspects: []
        };
        await db.collection("publicCampaigns").add(newCampaign);

        // --- DÜZELTME 3 ---
        await showModalAlert({ 
            title: "msg_success", 
            message: t("txt_campaign_created") 
        });
        
        // Inputları temizle
        newCampaignNameInput.value = ""; newCampaignGmNameInput.value = ""; newCampaignSystemInput.value = "FATE"; 
        newCampaignSettingInput.value = ""; newCampaignLoreInput.value = ""; newCampaignPlayersInput.value = "3"; 
        newCampaignDescInput.value = ""; newCampaignPasswordInput.value = "";

        switchView('find-campaign');

    } catch (error) {
        console.error("Kampanya hatası:", error);
        await showModalAlert({ title: "msg_error", message: t("txt_firebase_error") });
    }

    createCampaignButton.disabled = false;
    createCampaignButton.textContent = t("btn_create_campaign");
}

// === DİL GÜNCELLENDİ: handleUpdateCampaign ===
async function handleUpdateCampaign() {
    if (!currentManagedCampaignId) return; 

    const name = newCampaignNameInput.value.trim();
    const gmName = newCampaignGmNameInput.value.trim();
    const system = newCampaignSystemInput.value.trim();
    const setting = newCampaignSettingInput.value.trim();
    const lore = newCampaignLoreInput.value.trim();
    const players = parseInt(newCampaignPlayersInput.value) || 0;
    const desc = newCampaignDescInput.value.trim();
    const password = newCampaignPasswordInput.value.trim();
    
    if (players < 1 || players > 10) {
        // --- DÜZELTME 1 ---
        await showModalAlert({ 
            title: "msg_rule_violation", 
            message: t("txt_player_count_error") 
        });
        return; 
    }
    if (!name || !password || !desc || !setting || !gmName) {
        // --- DÜZELTME 2 ---
        await showModalAlert({ 
            title: "msg_warning", 
            message: t("txt_missing_info") 
        });
        return;
    }
    
    updateCampaignButton.disabled = true;
    updateCampaignButton.textContent = t("btn_updating");
    // === DÜZELTME: Editördeki listeyi güncelleme verisine hazırla ===
    let customSkills = null;
    const isDefault = (tempCampaignSkills.length === DEFAULT_FATE_SKILLS.length) && 
                      tempCampaignSkills.every((val, index) => val === DEFAULT_FATE_SKILLS[index]);
    
    if (!isDefault) {
        customSkills = [...tempCampaignSkills];
    }

    try {
        const updatedCampaignData = {
            name: name, gmName: gmName, system: system, setting: setting,
            lore: lore, maxPlayers: players, description: desc, password: password,
            customSkills: customSkills // <--- BU SATIRI EKLE
        };
        await db.collection("publicCampaigns").doc(currentManagedCampaignId).update(updatedCampaignData);

        // --- DÜZELTME 3 ---
        await showModalAlert({ 
            title: "msg_success", 
            message: t("txt_campaign_updated") 
        });
        
        newCampaignNameInput.value = ""; newCampaignGmNameInput.value = ""; newCampaignSystemInput.value = "FATE"; 
        newCampaignSettingInput.value = ""; newCampaignLoreInput.value = ""; newCampaignPlayersInput.value = "3"; 
        newCampaignDescInput.value = ""; newCampaignPasswordInput.value = "";
        
        createCampaignButton.style.display = 'block'; updateCampaignButton.style.display = 'none';
        switchView('find-campaign'); 

    } catch (error) {
        console.error("Güncelleme hatası:", error);
        await showModalAlert({ title: "msg_error", message: t("txt_firebase_error") });
    }

    updateCampaignButton.disabled = false;
    updateCampaignButton.textContent = t("btn_update_campaign");
}

async function renderPublicCampaigns() {
    // Yükleniyor mesajı için "btn_updating" (Güncelleniyor...) veya benzer bir şey kullanabiliriz
    publicCampaignListContainer.innerHTML = `<li class='stunt-list-item muted'>${t("btn_updating")}</li>`;
    
    try {
        const snapshot = await db.collection("publicCampaigns").orderBy("createdAt", "desc").get();
        
        if (snapshot.empty) {
            // "Henüz kampanya yok"
            publicCampaignListContainer.innerHTML = `<li class='stunt-list-item muted'>${t("card_public_campaigns")} (0)</li>`;
            return;
        }

        publicCampaignListContainer.innerHTML = "";
        
        snapshot.forEach(doc => {
            const campaign = doc.data();
            const campaignId = doc.id;
            
            const maxP = campaign.maxPlayers || 0;
            const currentP = campaign.currentPlayerCount || 0;
            const isFull = currentP >= maxP;
            
            // "DOLU" metni -> "msg_capacity_full"
            const titleSuffix = isFull ? `(${t("msg_capacity_full")})` : '';

            const card = document.createElement('div');
            card.className = `campaign-list-card ${isFull ? 'campaign-card-full' : ''}`;

            // Çeviriler:
            // "Yönet" -> btn_manage
            // "Kampanya Dolu" -> msg_capacity_full
            // "Karakterimi Gönder" -> btn_submit_char
            // "Detaylar / Lore" -> label_camp_lore
            
            card.innerHTML = `
                <div class="campaign-card-header">
                    <h3>${campaign.name} ${titleSuffix}</h3>
                </div>
                <div class="campaign-card-body">
                    <div class="campaign-card-stats">
                        <span><strong>${t("label_camp_gm")}</strong> ${campaign.gmName || 'Bilinmiyor'}</span>
                        <span><strong>${t("label_camp_system")}</strong> ${campaign.system || 'Belirtilmemiş'}</span>
                        <span><strong>${t("label_camp_setting")}</strong> ${campaign.setting || 'Belirtilmemiş'}</span>
                        <span><strong>${t("label_camp_players")}</strong> ${currentP} / ${maxP}</span>
                    </div>
                    <p class="campaign-card-desc">"${campaign.description || '...'}"</p>
                    
                    ${campaign.lore ? `
                        <div class="menu-divider"></div>
                        <p><strong>${t("label_camp_lore")}</strong><br>${campaign.lore.replace(/\n/g, '<br>')}</p>
                    ` : ''}
                </div>
                <div class="campaign-card-footer">
                    <button class="btn btn-secondary" data-action="manage" data-id="${campaignId}" data-password="${campaign.password}" data-name="${campaign.name}">
                        ${t("btn_manage")}
                    </button>
                    <button class="btn btn-primary" data-action="submit" data-id="${campaignId}" data-name="${campaign.name}" ${isFull ? 'disabled' : ''}>
                        ${isFull ? t("msg_capacity_full") : t("btn_submit_char")}
                    </button>
                </div>
            `;
            
            card.querySelector('[data-action="manage"]').addEventListener('click', (e) => {
                const data = e.currentTarget.dataset;
                promptForCampaignPassword(data.id, data.password, data.name);
            });
            
            if (!isFull) {
                card.querySelector('[data-action="submit"]').addEventListener('click', (e) => {
                    const data = e.currentTarget.dataset;
                    handleSubmitToCampaign(data.id, data.name);
                });
            }

            publicCampaignListContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Kampanyalar yüklenirken hata:", error);
        publicCampaignListContainer.innerHTML = `<li class='stunt-list-item danger-zone'>${t("msg_error")}: Firebase.</li>`;
    }
}


// === DİL GÜNCELLENDİ: handleSubmitToCampaign ===
async function handleSubmitToCampaign(campaignId, campaignName) {
    // KONTROL: İsim veya High Concept boşsa uyarı ver
    if (!characterData.name || !characterData.highConcept) {
        // --- DÜZELTME 1: t() eklendi ---
        await showModalAlert({ 
            title: "msg_warning", 
            message: t("txt_submit_missing") 
        });
        switchView('char'); // Karakter sayfasına geri at
        return;
    }
    
    // ONAY KUTUSU
    const isSure = await showModalConfirm({ 
        title: "msg_confirmation", 
        message: t("txt_submit_confirm", { name: characterData.name, campaign: campaignName }) 
    });
    
    if (!isSure) return;

    try {
        const characterSubmission = {
            ...characterData,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection("publicCampaigns").doc(campaignId).collection("submissions").doc(characterData.name).set(characterSubmission);
        
        localStorage.setItem('fateActiveCampaignId', campaignId);
        localStorage.setItem('fateActiveCharacterName', characterData.name);
        localStorage.setItem('fateCampaignStatus', 'pending');
        showCampaignStatus('pending', campaignName);

        // --- DÜZELTME 2: Başarılı mesajı için de t() eklendi ---
        await showModalAlert({ 
            title: "msg_success", 
            message: t("txt_submitted") 
        });
        
        checkActiveCampaignStatus();
       
    } catch (error) {
        console.error("Gönderme hatası:", error);
        // Hata mesajı için de t() eklendi
        await showModalAlert({ title: "msg_error", message: t("txt_firebase_error") });
    }
}

// === GM YÖNETİM PANELİ FONKSİYONLARI ===

// === DİL GÜNCELLENDİ: GM Fonksiyonları ===
async function promptForCampaignPassword(campaignId, correctPassword, campaignName) {
    const promptedPassword = await showModalPrompt({
        title: campaignName, // Başlık kampanya adı olarak kalıyor, bu doğru.
        
        // --- DÜZELTME 1 ---
        // "txt_gm_password_prompt" yazısını t() içine aldık.
        message: t("txt_gm_password_prompt"), 
        
        inputType: "password"
    });
    
    if (promptedPassword === null) return;

    if (promptedPassword === correctPassword) {
        currentManagedCampaignId = campaignId;
        loadGmAdminView(campaignName);
        switchView('gm-admin');
    } else {
        // --- DÜZELTME 2 ---
        // Şifre yanlış girilirse çıkacak hatayı da düzelttim (Bunu da muhtemelen görecektin)
        await showModalAlert({ 
            title: "msg_login_error", 
            message: t("txt_password_wrong") 
        });
    }
}

function loadGmAdminView(campaignName) {
    if (!currentManagedCampaignId) return;
    
    // --- DÜZELTME BURADA ---
    // Eski hali: gmAdminTitle.textContent = `Yönetim: ${campaignName}`;
    // Yeni hali: Sözlükteki "card_gm_admin" anahtarını (Kampanya Yönetimi) kullanıyoruz.
    
    gmAdminTitle.textContent = `${t("card_gm_admin")}: ${campaignName}`;
    
    renderGmSituationAspects();
    renderSubmittedCharacters();
    renderApprovedPlayers();
}

async function renderGmSituationAspects() {
    if (!currentManagedCampaignId) return;

    gmSituationAspectList.innerHTML = "<li class='stunt-list-item muted'>Aspektler yükleniyor...</li>";
    
    try {
        db.collection("publicCampaigns").doc(currentManagedCampaignId)
            .onSnapshot((doc) => {
                if (!doc.exists) {
                    throw new Error("Kampanya bulunamadı.");
                }
                
                const data = doc.data();
                const aspects = doc.data().situationAspects || [];
                const gmPoints = data.gmFatePoints !== undefined ? data.gmFatePoints : 1;
                if (gmFatePointsDisplay) {
                    gmFatePointsDisplay.textContent = gmPoints;
                }
                
                gmSituationAspectList.innerHTML = "";
                
                if (aspects.length === 0) {
                    gmSituationAspectList.innerHTML = "<li class='stunt-list-item muted'>Henüz durum aspekti eklenmemiş.</li>";
                    return;
                }

                aspects.forEach((aspectText) => {
                    const li = document.createElement('li');
                    li.className = 'stunt-list-item';
                    const p = document.createElement('p');
                    p.textContent = aspectText;
                    
                    const removeButton = document.createElement('button');
                    removeButton.className = 'btn btn-danger-outline';
                    removeButton.textContent = 'X';
                    removeButton.title = "Aspekti Sil";
                    removeButton.addEventListener('click', () => {
                        handleGmRemoveSituationAspect(aspectText);
                    });
                    
                    li.appendChild(p);
                    li.appendChild(removeButton);
                    gmSituationAspectList.appendChild(li);
                });
            }, (error) => {
                 console.error("Durum aspektleri dinlenirken hata:", error);
                 gmSituationAspectList.innerHTML = "<li class='stunt-list-item danger-zone'>Hata: Aspektler yüklenemedi.</li>";
            });

    } catch (error) {
        console.error("renderGmSituationAspects hatası:", error);
    }
}

async function renderSubmittedCharacters() {
    if (!currentManagedCampaignId) return;

    // Yükleniyor...
    gmSubmittedCharList.innerHTML = `<li class='stunt-list-item muted'>${t("btn_updating")}</li>`;

    try {
        db.collection("publicCampaigns").doc(currentManagedCampaignId).collection("submissions")
            .orderBy("submittedAt", "desc")
            .onSnapshot((snapshot) => {
                
                if (snapshot.empty) {
                    // "Başvuran yok" (Bunu lang.js'e eklemediysek manuel yazabiliriz veya bir key uydurabiliriz)
                    // Şimdilik: "card_submitted_chars" başlığını kullanıp (0) diyelim.
                    gmSubmittedCharList.innerHTML = `<li class='stunt-list-item muted'>${t("card_submitted_chars")} (0)</li>`;
                    return;
                }

                gmSubmittedCharList.innerHTML = "";
                
                snapshot.forEach(doc => {
                    const char = doc.data();
                    const submissionId = doc.id;
                    
                    const li = document.createElement('li');
                    li.className = 'stunt-list-item';
                    
                    const infoDiv = document.createElement('div');
                    infoDiv.style.flexGrow = '1';
                    infoDiv.innerHTML = `
                        <p style="margin: 0; font-weight: 700; color: var(--color-text);">${char.name}</p>
                        <p style="margin: 0; font-size: 0.9rem; color: var(--color-text-muted);">
                            ${t("label_high_concept")} ${char.highConcept} | ${t("label_trouble")} ${char.trouble}
                        </p>
                    `;
                    
                    const buttonGroup = document.createElement('div');
                    buttonGroup.style.display = 'flex';
                    buttonGroup.style.gap = '10px';
                    buttonGroup.style.marginLeft = '15px';

                    const denyButton = document.createElement('button');
                    denyButton.className = 'btn btn-danger-outline';
                    denyButton.textContent = t("btn_cancel"); // "İptal/Reddet" niyetine
                    denyButton.addEventListener('click', () => {
                        handleDenyCharacter(submissionId, char.name);
                    });

                    const approveButton = document.createElement('button');
                    approveButton.className = 'btn btn-primary';
                    approveButton.textContent = t("btn_confirm"); // "Onayla"
                    approveButton.addEventListener('click', () => {
                        handleApproveCharacter(submissionId, char);
                    });

                    buttonGroup.appendChild(denyButton);
                    buttonGroup.appendChild(approveButton);
                    
                    li.appendChild(infoDiv);
                    li.appendChild(buttonGroup);
                    gmSubmittedCharList.appendChild(li);
                });

            }, (error) => {
                console.error("Hata:", error);
                gmSubmittedCharList.innerHTML = `<li class='stunt-list-item danger-zone'>${t("msg_error")}</li>`;
            });

    } catch (error) {
        console.error("renderSubmittedCharacters hatası:", error);
    }
}

async function renderApprovedPlayers() {
    if (!currentManagedCampaignId) return;

    gmApprovedPlayersList.innerHTML = `<li class='stunt-list-item muted'>${t("btn_updating")}</li>`;

    try {
        const campaignDoc = await db.collection("publicCampaigns").doc(currentManagedCampaignId).get();
        const maxPlayers = campaignDoc.exists ? campaignDoc.data().maxPlayers : 0;

        db.collection("publicCampaigns").doc(currentManagedCampaignId).collection("players")
            .onSnapshot((snapshot) => {
                
                const currentPlayers = snapshot.size;
                if (gmApprovedPlayersList.parentElement) {
                    // "Onaylanmış Oyuncular (X/Y)"
                    gmApprovedPlayersList.parentElement.querySelector('h2.card-title').textContent = `${t("card_approved_players")} (${currentPlayers} / ${maxPlayers})`;
                }

                const openCards = new Set();
                gmApprovedPlayersList.querySelectorAll('.gm-player-card.is-open').forEach(card => {
                    openCards.add(card.dataset.playerId);
                });

                if (snapshot.empty) {
                    gmApprovedPlayersList.innerHTML = `<li class='stunt-list-item muted'>${t("card_approved_players")} (0)</li>`;
                    return;
                }

                gmApprovedPlayersList.innerHTML = "";
                
                snapshot.forEach(doc => {
                    const char = doc.data();
                    const playerName = doc.id;
                    
                    const cardContainer = document.createElement('div');
                    cardContainer.className = 'gm-player-card';
                    cardContainer.dataset.playerId = playerName;
                    
                    const header = document.createElement('div');
                    header.className = 'stunt-list-item gm-player-header';
                    
                    const infoDiv = document.createElement('div');
                    infoDiv.style.flexGrow = '1';
                    
                    const physicalStressCount = (char.stress && char.stress.physical) ? char.stress.physical.filter(Boolean).length : 0;
                    const mentalStressCount = (char.stress && char.stress.mental) ? char.stress.mental.filter(Boolean).length : 0;

                    // Fate, P.Stres, M.Stres çevirileri
                    infoDiv.innerHTML = `
                        <p style="margin: 0; font-weight: 700; color: var(--color-text);">${char.name}</p>
                        <p style="margin: 0; font-size: 0.9rem; color: var(--color-text-muted);">
                            Fate: ${char.currentFatePoints} | ${t("header_phys_stress")}: ${physicalStressCount} | ${t("header_ment_stress")}: ${mentalStressCount}
                        </p>
                    `;

                    const buttonGroup = document.createElement('div');
                    
                    const kickButton = document.createElement('button');
                    kickButton.className = 'btn btn-danger';
                    kickButton.textContent = t("btn_delete"); // "Sil/At"
                    kickButton.title = "Oyuncuyu Oyundan At";
                    kickButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        handleKickPlayer(playerName);
                    });

                    const toggleButton = document.createElement('button');
                    toggleButton.className = 'btn gm-player-toggle';
                    toggleButton.innerHTML = '▼';
                    
                    buttonGroup.appendChild(kickButton);
                    buttonGroup.appendChild(toggleButton);

                    header.appendChild(infoDiv);
                    header.appendChild(buttonGroup);

                    const details = document.createElement('div');
                    details.className = 'gm-player-details';
                    
                    // Beceriler Listesi
                    let skillsHtml = '<ul>';
                    if (char.skills) { 
                        FATE_SKILLS.forEach(skill => {
                            if (char.skills[skill] > 0) {
                                // Skill ismini çevir: t('skill_athletics') gibi
                                const localizedSkill = t(`skill_${skill.toLowerCase()}`);
                                skillsHtml += `<li><strong>${localizedSkill}:</strong> +${char.skills[skill]}</li>`;
                            }
                        });
                    }
                    skillsHtml += '</ul>';

                    // Stunt Listesi
                    let stuntsHtml = '<ul>';
                    if (char.stunts && char.stunts.length > 0) {
                        char.stunts.forEach(stunt => {
                            stuntsHtml += `<li>${stunt}</li>`;
                        });
                    }
                    stuntsHtml += '</ul>';

                    // Detaylar HTML
                    details.innerHTML = `
                        <h3>${t("card_aspects")}</h3>
                        <ul>
                            <li><strong>${t("label_high_concept")}</strong> ${char.highConcept || '...'}</li>
                            <li><strong>${t("label_trouble")}</strong> ${char.trouble || '...'}</li>
                            <li><strong>${t("label_relationship")}</strong> ${char.relationship || '...'}</li>
                            <li><strong>${t("label_aspect1")}</strong> ${char.aspect1 || '...'}</li>
                            <li><strong>${t("label_aspect2")}</strong> ${char.aspect2 || '...'}</li>
                        </ul>
                        <h3>${t("card_skills")}</h3>
                        ${skillsHtml}
                        <h3>${t("card_stunts")}</h3>
                        ${stuntsHtml}
                    `;

                    cardContainer.appendChild(header);
                    cardContainer.appendChild(details);

                    header.addEventListener('click', () => {
                        cardContainer.classList.toggle('is-open');
                    });
                    
                    if (openCards.has(playerName)) {
                        cardContainer.classList.add('is-open');
                    }

                    gmApprovedPlayersList.appendChild(cardContainer);
                });

            }, (error) => {
                console.error("Hata:", error);
                gmApprovedPlayersList.innerHTML = `<li class='stunt-list-item danger-zone'>${t("msg_error")}</li>`;
            });

    } catch (error) {
        console.error("renderApprovedPlayers hatası:", error);
    }
}


async function handleDenyCharacter(submissionId, charName) {
    if (!currentManagedCampaignId) return;
    
    // Çeviri: "txt_deny_confirm" -> "{name} başvurusunu reddetmek istiyor musunuz?"
    const isSure = await showModalConfirm({ 
        title: "msg_confirmation", 
        message: t("txt_deny_confirm", { name: charName }) 
    });
    
    if (!isSure) return;
    try {
        await db.collection("publicCampaigns").doc(currentManagedCampaignId).collection("submissions").doc(submissionId).delete();
    } catch (error) {
        console.error(error); 
        await showModalAlert({ title: "msg_error", message: "txt_firebase_error" });
    }
}

async function handleApproveCharacter(submissionId, characterObject) {
    if (!currentManagedCampaignId) return;
    try {
        const campaignRef = db.collection("publicCampaigns").doc(currentManagedCampaignId);
        const campaignDoc = await campaignRef.get();
        const maxPlayers = campaignDoc.data().maxPlayers || 0; 
        const playersSnapshot = await campaignRef.collection("players").get();
        
        if (playersSnapshot.size >= maxPlayers) {
            await showModalAlert({ title: "msg_capacity_full", message: "msg_capacity_full" });
            return; 
        }

        const isSure = await showModalConfirm({
            title: "msg_confirmation",
            message: t("txt_approve_confirm", { name: characterObject.name })
        });
        if (!isSure) return;
        
        delete characterObject.submittedAt;
        await db.collection("publicCampaigns").doc(currentManagedCampaignId).collection("players").doc(submissionId).set(characterObject);
        await db.collection("publicCampaigns").doc(currentManagedCampaignId).collection("submissions").doc(submissionId).delete();
        await campaignRef.update({ currentPlayerCount: firebase.firestore.FieldValue.increment(1) });
        
        await showModalAlert({ 
            title: "msg_success", 
            message: t("txt_approved", { name: characterObject.name }) 
        });

    } catch (error) {
        console.error(error); 
        await showModalAlert({ title: "msg_error", message: "txt_firebase_error" });
    }
}

async function handleKickPlayer(playerName) {
    if (!currentManagedCampaignId) return;
    
    const isSure = await showModalConfirm({ 
        title: "msg_confirmation", 
        message: t("txt_kick_confirm", { name: playerName }) 
    });
    
    if (!isSure) return;
    try {
        await db.collection("publicCampaigns").doc(currentManagedCampaignId).collection("players").doc(playerName).delete();
        const campaignRef = db.collection("publicCampaigns").doc(currentManagedCampaignId);
        await campaignRef.update({ currentPlayerCount: firebase.firestore.FieldValue.increment(-1) });
        
        await showModalAlert({ 
            title: "msg_success", 
            message: t("txt_kicked", { name: playerName }) 
        });
    } catch (error) {
        console.error(error); 
        await showModalAlert({ title: "msg_error", message: "txt_firebase_error" });
    }
}

async function handleDeleteCampaign() {
    if (!currentManagedCampaignId) return;
    
    const isSure = await showModalConfirm({
        title: "msg_warning",
        message: t("txt_delete_campaign_confirm") // DOĞRUSU: Kampanya silme onayı
    });
    if (!isSure) return;

    const campaignDoc = await db.collection("publicCampaigns").doc(currentManagedCampaignId).get();
    const campaignName = campaignDoc.data().name;
    
    const confirmationText = await showModalPrompt({
        title: "msg_confirmation",
        message: t("txt_delete_campaign_prompt", { name: campaignName }),
        inputType: "text"
    });

    if (confirmationText !== campaignName) {
        await showModalAlert({ title: "msg_operation_blocked", message: "txt_name_mismatch" });
        return;
    }

    try {
        await db.collection("publicCampaigns").doc(currentManagedCampaignId).delete();
        await showModalAlert({ title: "msg_success", message: t("txt_campaign_deleted") });
        currentManagedCampaignId = null; 
        switchView('find-campaign'); 
    } catch (error) {
        console.error(error); 
        await showModalAlert({ title: "msg_error", message: "txt_firebase_error" });
    }
}

async function handleEditCampaignClick() {
    if (!currentManagedCampaignId) return;

    try {
        const campaignDoc = await db.collection("publicCampaigns").doc(currentManagedCampaignId).get();
        if (!campaignDoc.exists) {
            return await showModalAlert({ title: "Hata", message: "Düzenlenecek kampanya bulunamadı." });
        }
        const data = campaignDoc.data();

        newCampaignNameInput.value = data.name || "";
        newCampaignGmNameInput.value = data.gmName || "";
        newCampaignSystemInput.value = data.system || "FATE";
        newCampaignSettingInput.value = data.setting || "";
        newCampaignPlayersInput.value = data.maxPlayers || 3;
        newCampaignDescInput.value = data.description || "";
        newCampaignLoreInput.value = data.lore || "";
        newCampaignPasswordInput.value = data.password || "";
        // === DÜZELTME: Mevcut becerileri editöre yükle ===
        if (data.customSkills && Array.isArray(data.customSkills) && data.customSkills.length > 0) {
            tempCampaignSkills = [...data.customSkills];
        } else {
            tempCampaignSkills = [...DEFAULT_FATE_SKILLS];
        }
        renderCampaignSkillEditor(); 

        createCampaignButton.style.display = 'none';
        updateCampaignButton.style.display = 'block';

        switchView('campaign');

    } catch (error) {
        console.error("Kampanya düzenleme verisi çekilirken hata:", error);
        await showModalAlert({ title: "Hata", message: "Kampanya verisi çekilemedi. Konsolu kontrol edin." });
    }
}
// === YENİ KOD BAŞLANGICI: GM FATE PUANI DEĞİŞTİRME ===
async function handleGmFatePointChange(amount) {
    if (!currentManagedCampaignId) return;

    // Negatif puana düşmeyi engelle
    const currentPoints = parseInt(gmFatePointsDisplay.textContent, 10);
    if (currentPoints <= 0 && amount < 0) {
        return; // Zaten 0, daha fazla azaltamaz
    }

    try {
        const campaignRef = db.collection("publicCampaigns").doc(currentManagedCampaignId);
        
        // Firestore'daki değeri atomik olarak artır/azalt
        await campaignRef.update({
            gmFatePoints: firebase.firestore.FieldValue.increment(amount)
        });
        
        // Not: 'renderGmSituationAspects' içindeki 'onSnapshot' 
        // bu değişikliği otomatik olarak algılayıp UI'ı güncelleyecektir.
        
    } catch (error) {
        console.error("GM Fate Puanı güncellenirken hata:", error);
        await showModalAlert({ title: "Hata", message: "Hata: Fate Puanı güncellenemedi." });
    }
}
// === YENİ KOD BİTİŞİ ===

async function handleGmAddSituationAspect() {
    if (!currentManagedCampaignId) return;

    const aspectText = gmSituationAspectInput.value.trim();
    if (!aspectText) return;

    gmAddSituationAspectButton.disabled = true;
    
    try {
        const campaignRef = db.collection("publicCampaigns").doc(currentManagedCampaignId);
        
        await campaignRef.update({
            situationAspects: firebase.firestore.FieldValue.arrayUnion(aspectText)
        });

        gmSituationAspectInput.value = "";
        
    } catch (error) {
        console.error("Durum aspekti eklenirken hata:", error);
        await showModalAlert({ title: "Hata", message: "Hata: Aspekt eklenemedi." });
    }
    
    gmAddSituationAspectButton.disabled = false;
}

async function handleGmRemoveSituationAspect(aspectText) {
    if (!currentManagedCampaignId) return;
    
    const isSure = await showModalConfirm({ title: "Onay", message: `${aspectText} aspektini silmek istediğinizden emin misiniz?` });
    if (!isSure) return;

    try {
        const campaignRef = db.collection("publicCampaigns").doc(currentManagedCampaignId);

        await campaignRef.update({
            situationAspects: firebase.firestore.FieldValue.arrayRemove(aspectText)
        });
        
    } catch (error) {
        console.error("Durum aspekti silinirken hata:", error);
        await showModalAlert({ title: "Hata", message: "Hata: Aspekt silinemedi." });
    }
}

async function renderLiveSituationAspects() {
    if (liveAspectListener) {
        liveAspectListener();
        liveAspectListener = null;
    }
    
    const activeCampaignId = localStorage.getItem('fateActiveCampaignId');
    if (localStorage.getItem('fateCampaignStatus') !== 'approved' || !activeCampaignId) {
        liveSituationAspectsCard.style.display = 'none';
        return;
    }

    liveSituationAspectsCard.style.display = 'block';
    liveSituationAspectList.innerHTML = "<li class='stunt-list-item muted'>Aspektler yükleniyor...</li>";

    try {
        liveAspectListener = db.collection("publicCampaigns").doc(activeCampaignId)
            .onSnapshot((doc) => {
                if (!doc.exists) {
                    throw new Error("Canlı kampanya bulunamadı.");
                }
                
                const aspects = doc.data().situationAspects || [];
                
                liveSituationAspectList.innerHTML = "";
                
                if (aspects.length === 0) {
                    liveSituationAspectList.innerHTML = "<li class='stunt-list-item muted'>Şu anda aktif bir durum aspekti yok.</li>";
                    return;
                }

                aspects.forEach((aspectText) => {
                    const li = document.createElement('li');
                    li.className = 'stunt-list-item';
                    li.textContent = aspectText;
                    liveSituationAspectList.appendChild(li);
                });
            }, (error) => {
                 console.error("Canlı durum aspektleri dinlenirken hata:", error);
                 liveSituationAspectList.innerHTML = "<li class='stunt-list-item danger-zone'>Hata: Aspektler yüklenemedi.</li>";
            });

    } catch (error) {
        console.error("renderLiveSituationAspects hatası:", error);
    }
}

// === DİL GÜNCELLENDİ: handleLeaveCampaign ===
async function handleLeaveCampaign() {
    const activeCampaignId = localStorage.getItem('fateActiveCampaignId');
    const activeCharacterName = localStorage.getItem('fateActiveCharacterName');
    
    if (!activeCampaignId || !activeCharacterName) return;
    
    // Mesaj sabit, "approved" veya "pending" fark etmez...
    const isSure = await showModalConfirm({ title: "msg_confirmation", message: t("txt_leave_game_confirm") });
    if (!isSure) return;

    try {
        // ... (Ayrılma kodu aynı) ...
        detachAllListeners();
        const campaignRef = db.collection("publicCampaigns").doc(activeCampaignId); 
        const status = localStorage.getItem('fateCampaignStatus');
        if (status === 'approved') {
            await db.collection("publicCampaigns").doc(activeCampaignId).collection("players").doc(activeCharacterName).delete();
            await campaignRef.update({ currentPlayerCount: firebase.firestore.FieldValue.increment(-1) });
        } else if (status === 'pending') {
            await db.collection("publicCampaigns").doc(activeCampaignId).collection("submissions").doc(activeCharacterName).delete();
        }

        localStorage.removeItem('fateActiveCampaignId');
        localStorage.removeItem('fateActiveCharacterName');
        localStorage.setItem('fateCampaignStatus', 'offline');
        
        await showModalAlert({ title: "msg_success", message: t("txt_leave_success") });

        updateSkillList(null); // Varsayılan becerilere dön
        loadCharacter();
        updateUIFromData();

    } catch (error) {
        console.error("Ayrılma hatası:", error);
        await showModalAlert({ title: "msg_error", message: "Hata oluştu." });
    }
}

// YENİ YARDIMCI FONKSİYON (Ekstra Consequence Slotu için)
function renderExtraConsequences() {
    const extraMildSlotGroup = document.getElementById('form-group-consequence-mild-extra');
    const extraMildInput = document.getElementById('consequence-mild-extra');

    if (!extraMildSlotGroup || !extraMildInput) return; 

    const skills = characterData.skills || {};
    const physique = skills['Physique'] || 0;
    const will = skills['Will'] || 0;

    if (physique >= 4 || will >= 4) {
        extraMildSlotGroup.style.display = 'block';
        extraMildInput.value = (characterData.consequences && characterData.consequences.mildExtra) ? characterData.consequences.mildExtra : "";
    } else {
        extraMildSlotGroup.style.display = 'none';
        if (characterData.consequences && characterData.consequences.mildExtra) {
            characterData.consequences.mildExtra = "";
        }
    }
}


// === STRES YÖNETİMİ ===
async function createStressTrack(container, trackName) {
    container.innerHTML = "";
    
    const skills = characterData.skills || {};
    const skillName = (trackName === 'physical') ? 'Physique' : 'Will';
    const skillLevel = skills[skillName] || 0;

    const BASE_BOXES = 4;
    let extraBoxes = 0;
    if (skillLevel >= 1) extraBoxes = 1; 
    if (skillLevel >= 2) extraBoxes = 2; 
    if (skillLevel >= 3) extraBoxes = 3; 

    const unlockedBoxes = BASE_BOXES + extraBoxes;
    const TOTAL_BOXES_VISIBLE = 7; 

    if (!characterData.stress) {
        characterData.stress = getDefaultCharacter().stress;
    }
    if (!characterData.stress[trackName]) {
        characterData.stress[trackName] = getDefaultCharacter().stress[trackName];
    }
    
    while (characterData.stress[trackName].length < unlockedBoxes) {
        characterData.stress[trackName].push(false);
    }
    while (characterData.stress[trackName].length > unlockedBoxes) {
        characterData.stress[trackName].pop();
    }

    for (let i = 0; i < TOTAL_BOXES_VISIBLE; i++) {
        const box = document.createElement('div');
        box.className = 'stress-box';
        
        if (i < unlockedBoxes) {
            const isChecked = (characterData.stress[trackName] && characterData.stress[trackName][i]) ? characterData.stress[trackName][i] : false;
            if (isChecked) {
                box.classList.add('checked');
            }
            
            box.addEventListener('click', async () => {
                (async (index) => {
                    await handleStressClick(trackName, index);
                })(i);
            });

        } else {
            box.classList.add('disabled');
            box.title = `Bu kutuyu açmak için ${skillName} becerisi gerekli.`;
        }
        
        container.appendChild(box);
    }
}

async function handleStressClick(trackName, index) {
    if (index >= characterData.stress[trackName].length) {
        console.warn("Kilitli stres kutusuna tıklandı, işlem yok.");
        return;
    }
    
    characterData.stress[trackName][index] = !characterData.stress[trackName][index];
    await saveCharacter();
    
    const trackContainer = (trackName === 'physical') ? physicalStressTrack : mentalStressTrack;
    const box = trackContainer.children[index];
    if (box) {
        box.classList.toggle('checked', characterData.stress[trackName][index]);
    }
}

// === ARAYÜZ (UI) GÜNCELLEME (DÜZELTİLDİ) ===
function updateUIFromData() {
    if (!characterData) {
        console.error("updateUIFromData: characterData tanımsız!");
        return;
    }
    
    // DÜZELTME: Veri birleştirme 'loadCharacter' fonksiyonuna taşındı.

    charNameInput.value = characterData.name;
    charDescInput.value = characterData.description;
    charRefreshInput.value = characterData.refresh;
    charHighConceptInput.value = characterData.highConcept;
    charTroubleInput.value = characterData.trouble;
    charRelationshipInput.value = characterData.relationship;
    charAspect1Input.value = characterData.aspect1;
    charAspect2Input.value = characterData.aspect2;
    charFatePointsDisplay.textContent = characterData.currentFatePoints;
    
    // Becerileri 'populateSkillManager' oluşturdu, biz sadece değerleri güncelliyoruz
    if (characterData.skills) {
        FATE_SKILLS.forEach(skill => {
            // ID oluşturma mantığı populateSkillManager ile aynı
            const safeId = skill.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const skillId = `skill-${safeId}`;
            const inputElement = document.getElementById(skillId);
            if (inputElement) {
                const val = characterData.skills[skill] || 0;
                inputElement.value = val;
                
                // === DÜZELTME: Yükleme sırasında metin değerlerini de güncelle ===
                // inputElement'in yanındaki span'ı bul
                const parentDiv = inputElement.closest('.skill-entry');
                if (parentDiv) {
                    const displaySpan = parentDiv.querySelector('.skill-val-display');
                    if (displaySpan) {
                        displaySpan.textContent = (val > 0) ? `+${val}` : val;
                    }
                }
            }
        });
    }
    
    renderStunts();
    
    createStressTrack(physicalStressTrack, 'physical');
    createStressTrack(mentalStressTrack, 'mental');
    renderExtraConsequences(); 
    
    if (characterData.consequences) {
        consequenceMildInput.value = characterData.consequences.mild;
        consequenceModerateInput.value = characterData.consequences.moderate;
        consequenceSevereInput.value = characterData.consequences.severe;
        // Ekstra mild slotunu da güncelle (eğer varsa)
        const extraMildInput = document.getElementById('consequence-mild-extra');
        if (extraMildInput) {
            extraMildInput.value = characterData.consequences.mildExtra || "";
        }
    } else {
        consequenceMildInput.value = "";
        consequenceModerateInput.value = "";
        consequenceSevereInput.value = "";
        const extraMildInput = document.getElementById('consequence-mild-extra');
        if (extraMildInput) extraMildInput.value = "";
    }

    updateRefreshAndStunts();
}

// === DÜZELTME (PROBLEM 1): handleChangeFatePoints ===
async function handleChangeFatePoints(amount) {
    if (typeof amount !== 'number') {
        amount = (amount > 0) ? 1 : -1;
    }

    let current = characterData.currentFatePoints;
    let refresh = characterData.refresh;
    current += amount;
    if (current < 0) current = 0;
    
    // --- DÜZELTME BURADA ---
    // Fate puanı Refresh'i geçerse uyarı veriyoruz.
    if (current > refresh && amount > 0) {
        await showModalAlert({ 
            title: "msg_limit_exceeded", 
            message: t("txt_fate_gt_refresh") // t() parantezine aldık, artık düzgün görünecek.
        });
        current = refresh;
    }
    
    characterData.currentFatePoints = current;
    await saveCharacter();
    
    charFatePointsDisplay.textContent = characterData.currentFatePoints;
}

// === DÜZELTME (PROBLEM 1): handleCharacterInputChange ===
async function handleCharacterInputChange(event) {
    const id = event.target.id;
    let value = event.target.type === 'number' ? parseInt(event.target.value) || 0 : event.target.value;

    if (id === 'char-refresh') {
        const oldValue = characterData.refresh;
        if (value > 5) value = 5; if (value < 1) value = 1; event.target.value = value; 

        const newMaxStunts = 6 - value;
        const currentStunts = (characterData.stunts && characterData.stunts.length) ? characterData.stunts.length : 0;

        if (currentStunts > newMaxStunts) {
            await showModalAlert({
                title: "msg_rule_violation",
                message: t("txt_refresh_limit", { value: value })
            });
            event.target.value = oldValue;
            return;
        }
        
        characterData.refresh = value;
        if (characterData.currentFatePoints > value) {
            characterData.currentFatePoints = value;
        }
    }

    const keyMap = {
        'char-name': 'name', 'char-desc': 'description',
        'char-high-concept': 'highConcept', 'char-trouble': 'trouble',
        'char-relationship': 'relationship',
        'char-aspect-1': 'aspect1', 'char-aspect-2': 'aspect2',
        'consequence-mild': 'consequences.mild',
        'consequence-moderate': 'consequences.moderate',
        'consequence-severe': 'consequences.severe',
        'consequence-mild-extra': 'consequences.mildExtra'
    };
    const key = keyMap[id];
    if (key) {
        if (key.includes('.')) {
            const keys = key.split('.');
            if (!characterData[keys[0]]) { 
                 characterData[keys[0]] = {};
            }
            characterData[keys[0]][keys[1]] = value;
        } else {
            characterData[key] = value;
        }
    }

    await saveCharacter();
    
    // DÜZELTME: Refresh değiştiğinde UI'ı anında güncelle
    if (id === 'char-refresh') {
        charFatePointsDisplay.textContent = characterData.currentFatePoints;
        updateRefreshAndStunts();
    }
}

async function validateSkillPyramid(skills, changedSkill, newValue) {
    if (newValue === 0) return true;

    const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
    const currentSkills = skills || {}; 
    Object.keys(currentSkills).forEach(skill => {
        if (skill === changedSkill) return;
        
        const level = currentSkills[skill];
        if (level > 0 && level <= 4) {
            counts[level]++;
        }
    });

    counts[newValue]++;
    
    if (counts[newValue] > SKILL_PYRAMID_LIMITS[newValue]) {
        await showModalAlert({ 
            title: "msg_rule_violation", 
            message: t("txt_skill_pyramid", { limit: SKILL_PYRAMID_LIMITS[newValue], value: newValue }) 
        });
        return false;
    }
    return true; 
}

function populateSkillManager() {
    skillListContainer.innerHTML = "";
    const skillLevels = [
        { text: "+4", value: 4 }, { text: "+3", value: 3 },
        { text: "+2", value: 2 }, { text: "+1", value: 1 }, { text: " 0", value: 0 }
    ];
    const currentSkills = characterData.skills || {};

    // GÜNCELLENDİ: Sıralama ve Çeviri Kontrolü
    const sortedSkills = [...FATE_SKILLS].sort((a, b) => {
        let nameA = t(`skill_${a.toLowerCase()}`);
        if (nameA === `skill_${a.toLowerCase()}`) nameA = a; 
        let nameB = t(`skill_${b.toLowerCase()}`);
        if (nameB === `skill_${b.toLowerCase()}`) nameB = b;
        return nameA.localeCompare(nameB);
    });

    sortedSkills.forEach(skill => {
        const entry = document.createElement('div');
        entry.className = 'skill-entry';
        
        const safeId = skill.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const skillId = `skill-${safeId}`;
        
        const label = document.createElement('label');
        label.setAttribute('for', skillId);

        let localizedName = t(`skill_${skill.toLowerCase()}`);
        if (localizedName === `skill_${skill.toLowerCase()}`) localizedName = skill;
        
        label.textContent = localizedName;
        
        const select = document.createElement('select');
        select.id = skillId;
        
        skillLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.value;
            option.textContent = level.text;
            select.appendChild(option);
        });

        const currentVal = currentSkills[skill] || 0;
        select.value = currentVal;
        
        select.addEventListener('change', (event) => {
            handleSkillChange(skill, event);
        });
        
        // === YENİ: Oyun Modu İçin Salt Okunur Değer ===
        const readOnlyDisplay = document.createElement('span');
        readOnlyDisplay.className = 'skill-val-display';
        // Eğer + pozitifse başına + koy, 0 ise olduğu gibi yaz
        readOnlyDisplay.textContent = (currentVal > 0) ? `+${currentVal}` : currentVal;
        // ===============================================

        entry.appendChild(label);
        entry.appendChild(select);     // Düzenleme modunda bu görünür
        entry.appendChild(readOnlyDisplay); // Oyun modunda bu görünür
        
        skillListContainer.appendChild(entry);
    });
}

async function handleSkillChange(skillName, event) {
    const newValue = parseInt(event.target.value);
    if (!characterData.skills) {
         characterData.skills = getDefaultCharacter().skills;
    }
    const oldValue = characterData.skills[skillName] || 0;

    const isValid = await validateSkillPyramid(characterData.skills, skillName, newValue);

    if (isValid) {
        characterData.skills[skillName] = newValue;
        
        if (skillName === 'Physique') {
            createStressTrack(physicalStressTrack, 'physical');
            renderExtraConsequences();
        }
        if (skillName === 'Will') {
            createStressTrack(mentalStressTrack, 'mental');
            renderExtraConsequences();
        }
        
        await saveCharacter();
        
        populateSkillSelector();
    } else {
        event.target.value = oldValue;
    }
    // === DÜZELTME: Doğrulama bittikten sonra metin (span) değerini güncelle ===
    // (İster kabul edilsin ister reddedilsin, son durumdaki değeri ekrana yaz)
    const finalValue = parseInt(event.target.value);
    const entryDiv = event.target.closest('.skill-entry');
    if (entryDiv) {
        const displaySpan = entryDiv.querySelector('.skill-val-display');
        if (displaySpan) {
            displaySpan.textContent = (finalValue > 0) ? `+${finalValue}` : finalValue;
        }
    }
}
function populateSkillSelector() {
    skillSelector.innerHTML = "";
    const sortedSkills = [...FATE_SKILLS].sort((a, b) => {
        let nameA = t(`skill_${a.toLowerCase()}`);
        if (nameA === `skill_${a.toLowerCase()}`) nameA = a;
        let nameB = t(`skill_${b.toLowerCase()}`);
        if (nameB === `skill_${b.toLowerCase()}`) nameB = b;
        return nameA.localeCompare(nameB);
    });

    sortedSkills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        
        let localizedName = t(`skill_${skill.toLowerCase()}`);
        if (localizedName === `skill_${skill.toLowerCase()}`) localizedName = skill;
        
        option.textContent = localizedName;
        skillSelector.appendChild(option);
    });
}
function handleRollClick() {
    rollButton.disabled = true;
    fateSpendButtons.style.display = 'none';
    startDiceAnimation();
    setTimeout(() => {
        stopDiceAnimationAndRoll();
        rollButton.disabled = false;
    }, ANIMATION_DURATION);
}
function startDiceAnimation() {
    diceElements.forEach(die => die.classList.add('is-rolling'));
    animationInterval = setInterval(() => {
        diceElements.forEach(die => {
            const randomFace = Math.floor(Math.random() * 3) - 1;
            if (randomFace === 1) { die.textContent = '+'; die.className = 'die is-rolling die-plus'; }
            else if (randomFace === -1) { die.textContent = '−'; die.className = 'die is-rolling die-minus'; }
            else { die.textContent = '0'; die.className = 'die is-rolling die-blank'; }
        });
    }, ANIMATION_FLICKER_RATE);
}
function renderRollLog() {
    rollLogList.innerHTML = "";
    if (rollHistory.length === 0) {
        // "Zar Geçmişi Boş" tarzı bir şey yoksa bile genel bir ifade
        rollLogList.innerHTML = `<li class='roll-log-item muted'>...</li>`;
        return;
    }
    rollHistory.forEach(log => {
        const li = document.createElement('li');
        li.className = 'roll-log-item';
        
        const totalText = (log.total > 0) ? `+${log.total}` : log.total;
        const diceText = (log.dice > 0) ? `+${log.dice}` : log.dice;
        const skillText = (log.skillVal > 0) ? `+${log.skillVal}` : log.skillVal;

        // Skill ismini çevir (örn: Athletics -> Atletizm)
        const localizedSkillName = t(`skill_${log.skill.toLowerCase()}`);

        let diceRollsHtml = "";
        if (log.diceRolls && Array.isArray(log.diceRolls)) {
            diceRollsHtml = log.diceRolls.map(roll => {
                if (roll === 1) return '<span class="log-die-plus">+</span>';
                if (roll === -1) return '<span class="log-die-minus">−</span>';
                return '<span class="log-die-blank">0</span>';
            }).join(' ');
            
            // Çeviri: "log_roll_dice" -> "Zar"
            diceRollsHtml = `${t("log_roll_dice")}: [ ${diceRollsHtml} ] = ${diceText}`; 
        } else {
            diceRollsHtml = `${t("log_roll_dice")}: ${diceText}`;
        }

        // Çeviri: "log_roll_skill" -> "Beceri", "log_fate_spent" -> "Fate Puanı harcandı!"
        const fateSpentHTML = log.fateSpent
            ? `<div class="log-item-details fate-spent">(${diceRollsHtml}, ${t("log_roll_skill")}: ${skillText}, ${t("log_fate_spent")})</div>`
            : `<div class="log-item-details">(${diceRollsHtml}, ${t("log_roll_skill")}: ${skillText})</div>`;
        
        li.innerHTML = `
            <div class="log-item-header">
                <span>${localizedSkillName}</span>
                <span class="log-item-total">${totalText}</span>
            </div>
            <div class="log-item-desc">${log.desc}</div>
            ${fateSpentHTML}
        `;
        rollLogList.appendChild(li);
    });
}
function stopDiceAnimationAndRoll() {
    clearInterval(animationInterval);
    diceElements.forEach(die => die.classList.remove('is-rolling'));
    let diceTotal = 0;
    let individualRolls = []; // YENİ EKLENTİ
    diceElements.forEach(die => {
        const roll = Math.floor(Math.random() * 3) - 1;
        diceTotal += roll;
        individualRolls.push(roll); // YENİ EKLENTİ
        if (roll === 1) { die.textContent = '+'; die.className = 'die die-plus'; }
        else if (roll === -1) { die.textContent = '−'; die.className = 'die die-minus'; }
        else { die.textContent = '0'; die.className = 'die die-blank'; }
    });
    const selectedSkill = skillSelector.value;
    const modifier = (characterData.skills && characterData.skills[selectedSkill]) ? characterData.skills[selectedSkill] : 0;
    const finalTotal = diceTotal + modifier;
    const descriptor = getDescriptor(finalTotal);
    // DÜZELTME: "Zar" ve "Beceri" kelimelerini t() ile alıyoruz
    const txtDice = t("log_roll_dice"); // "Zar"
    const txtSkill = t("log_roll_skill"); // "Beceri"
    resultDice.textContent = (diceTotal >= 0) ? `${txtDice}: +${diceTotal}` : `${txtDice}: ${diceTotal}`;
    resultSkill.textContent = (modifier >= 0) ? `${txtSkill}: +${modifier}` : `${txtSkill}: ${modifier}`;
    resultTotal.textContent = (finalTotal >= 0) ? `+${finalTotal}` : finalTotal;
    resultDescriptor.textContent = descriptor;
    const logEntry = {
        skill: selectedSkill, skillVal: modifier, dice: diceTotal,
        diceRolls: individualRolls, // YENİ EKLENTİ
        total: finalTotal, desc: descriptor, fateSpent: false
    };
    lastRoll = {
        total: finalTotal,
        descriptor: descriptor,
        logEntry: logEntry
    };
    rollHistory.unshift(logEntry);
    if (rollHistory.length > 20) {
        rollHistory.pop();
    }
    renderRollLog();
    if (characterData.currentFatePoints > 0) {
        fateSpendButtons.style.display = 'flex'; 
    }
}
function getDescriptor(total) {
    if (total >= 8) return t("ladder_8");
    if (total <= -4) return t("ladder_-4");
    
    const key = `ladder_${total}`;
    // Eğer çeviri varsa döndür, yoksa varsayılanı döndür
    return (t(key) !== key) ? t(key) : (total > 8 ? t("ladder_8") : t("ladder_-4"));
}
async function handleSpendFatePoint() {
    if (characterData.currentFatePoints <= 0) {
        await showModalAlert({ title: "msg_limit_exceeded", message: "txt_fate_point_limit" });
        return;
    }
    characterData.currentFatePoints--;
    await saveCharacter();
    
    charFatePointsDisplay.textContent = characterData.currentFatePoints;

    const newTotal = lastRoll.total + 2;
    const newDescriptor = getDescriptor(newTotal);
    resultTotal.textContent = (newTotal > 0) ? `+${newTotal}` : newTotal;
    resultDescriptor.textContent = newDescriptor;
    const lastLogEntry = rollHistory[0];
    if (lastLogEntry && lastLogEntry === lastRoll.logEntry) {
        lastLogEntry.total = newTotal;
        lastLogEntry.desc = newDescriptor;
        lastLogEntry.fateSpent = true;
    }
    renderRollLog();
    fateSpendButtons.style.display = 'none';
}
async function handleRerollClick() {
    if (characterData.currentFatePoints <= 0) {
        await showModalAlert({ title: "msg_limit_exceeded", message: "txt_fate_point_limit" });
        return;
    }
    await handleChangeFatePoints(-1);
    handleRollClick();
}

// === İÇE/DIŞA AKTARMA VE SIFIRLAMA ===
function handleExportCharacter() {
    const dataStr = JSON.stringify(characterData, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = (characterData.name && characterData.name.trim().replace(/\s+/g, '_')) || 'fate_karakteri';
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
function handleImportClick() {
    importFileInput.click();
}

// === DİL GÜNCELLENDİ: handleImportFile ===
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && importedData.skills) {
                
                if (localStorage.getItem('fateCampaignStatus') === 'approved' || localStorage.getItem('fateCampaignStatus') === 'pending') {
                    await showModalAlert({
                        title: "msg_operation_blocked",
                        message: "txt_blocked_live"
                    });
                    event.target.value = null; 
                    return;
                }

                const isListEffectivelyEmpty = characterList.length === 0 || 
                                              (characterList.length === 1 && !characterList[0].name.trim());

                if (isListEffectivelyEmpty) {
                    characterList[0] = importedData;
                    activeCharacterIndex = 0;
                    await showModalAlert({ title: "msg_success", message: "txt_import_success" });

                } else {
                    // DÜZELTME: Aktif karakter ismi için çeviri
                    const activeCharName = (characterData.name && characterData.name.trim()) 
                        ? characterData.name.trim() 
                        : `${t('txt_unnamed_char')} ${activeCharacterIndex + 1}`;
                        
                    const importedCharName = importedData.name || t('txt_unnamed_char');
                    
                    const overwrite = await showModalConfirm({
                        title: "msg_confirmation",
                        message: t("txt_import_overwrite", { new: importedCharName, current: activeCharName })
                    });

                    if (overwrite) {
                        characterList[activeCharacterIndex] = importedData;
                        await showModalAlert({ title: "msg_success", message: "Karakter güncellendi." });
                    } else {
                        characterList.push(importedData);
                        activeCharacterIndex = characterList.length - 1; 
                        await showModalAlert({ title: "msg_success", message: "Karakter listeye eklendi." });
                    }
                }
                
                localStorage.setItem('fateCharacterList', JSON.stringify(characterList));
                showSaveIndicator();
                loadCharacter();
                updateUIFromData();
                populateSkillManager();
                populateSkillSelector();
                switchView('char'); 
                
            } else {
                await showModalAlert({ title: "msg_error", message: "txt_invalid_file" });
            }
        } catch (error) {
            console.error("Dosya hatası:", error);
            await showModalAlert({ title: "msg_error", message: "txt_invalid_file" });
        }
    };
    reader.readAsText(file);
    event.target.value = null; 
}

// === DİL GÜNCELLENDİ: handleDeleteCharacter ===
// app.js içindeki handleDeleteCharacter fonksiyonunu bununla komple değiştir:

// === DÜZELTİLDİ: handleDeleteCharacter (Otomatik Geçiş ve UI Güncelleme Ekli) ===
async function handleDeleteCharacter() {
    // 1. Canlı mod kontrolü (Değişiklik yok)
    if (localStorage.getItem('fateCampaignStatus') === 'approved' || localStorage.getItem('fateCampaignStatus') === 'pending') {
        await showModalAlert({
            title: "msg_operation_blocked",
            message: "txt_blocked_live"
        });
        return;
    }

    // 2. Son karakter kontrolü (Değişiklik yok)
    if (characterList.length <= 1) {
        await showModalAlert({
            title: "msg_warning",
            message: t("txt_last_char_warning")
        });
        return;
    }

    // 3. İsim belirleme
    const charName = (characterData.name && characterData.name.trim()) 
        ? characterData.name.trim() 
        : `${t('txt_unnamed_char')} ${activeCharacterIndex + 1}`;
    
    // 4. Onay Sorusu
    const isSure = await showModalConfirm({
        title: "msg_confirmation",
        message: t("txt_delete_char_confirm", { name: charName })
    });

    // 5. İŞLEM KISMI (Burada değişiklikler var)
    if (isSure) {
        // A) Listeden sil
        characterList.splice(activeCharacterIndex, 1);
        
        // B) İndeksi düzelt (Eğer sonuncuyu sildiysek bir öncekine kay)
        if (activeCharacterIndex >= characterList.length) {
            activeCharacterIndex = characterList.length - 1;
        }
        
        // C) Eğer liste tamamen boşaldıysa (teorik olarak 2. adım engelliyor ama güvenlik olsun)
        if (activeCharacterIndex < 0) activeCharacterIndex = 0;

        // D) Yeni aktif karakter verisini güncelle
        characterData = characterList[activeCharacterIndex];

        // E) LocalStorage'ı güncelle
        localStorage.setItem('fateCharacterList', JSON.stringify(characterList));

        // --- KRİTİK DÜZELTME BAŞLANGICI ---
        
        // 1. Menüyü yeniden çiz (Silinen isim gitsin)
        renderCharacterMenu(); 

        // 2. Dropdown menüsünde yeni indeksi seçili yap (Otomatik seçim)
        if (characterSelector) {
            characterSelector.value = activeCharacterIndex;
        }

        // 3. Ekranı yeni karakterin verileriyle doldur
        updateUIFromData();
        populateSkillManager();
        populateSkillSelector();

        // --- KRİTİK DÜZELTME BİTİŞİ ---
        
        // F) Başarı mesajı
        await showModalAlert({ 
            title: "msg_success", 
            message: t("txt_char_deleted_success") 
        });
    }
}
// === DİL GÜNCELLENDİ: handleResetCharacterWipe ===
async function handleResetCharacterWipe() {
    if (localStorage.getItem('fateCampaignStatus') === 'approved' || localStorage.getItem('fateCampaignStatus') === 'pending') {
        await showModalAlert({
            title: "msg_operation_blocked",
            message: "txt_blocked_live"
        });
        return;
    }

    // DÜZELTME: Çeviri eklendi
    const charName = (characterData.name && characterData.name.trim()) 
        ? characterData.name.trim() 
        : `${t('txt_unnamed_char')} ${activeCharacterIndex + 1}`;
    
    const isSure = await showModalConfirm({
        title: "msg_confirmation",
        message: t("txt_reset_char_confirm", { name: charName })
    });

    if (isSure) {
        characterData = getDefaultCharacter();
        saveCharacter();
        updateUIFromData();
        await showModalAlert({ 
            title: "msg_success", 
            message: t("txt_char_reset_success") 
        });
        switchView('char');
    }
}


// === SAYFA BAŞLATMA ===
document.addEventListener('DOMContentLoaded', () => {
    // Dili uygula
    if (typeof applyTranslations === 'function') applyTranslations();
    const savedTheme = localStorage.getItem('fateTheme') || 'dark';
    setTheme(savedTheme);
    // === DİL SEÇİCİ DROPDOWN MANTIĞI ===
    const langSelector = document.getElementById('language-selector');
    if (langSelector) {
        // 1. Sayfa açıldığında kayıtlı dili seçili getir
        const savedLang = localStorage.getItem('fateLang') || 'tr';
        langSelector.value = savedLang;

        // 2. Dil değiştirildiğinde çalışacak kod
        langSelector.addEventListener('change', (e) => {
            changeLanguage(e.target.value);
        });
    }
    // DÜZENLENDİ: Sıralama değişti
    loadCharacter();        // 1. Veri modelini (characterData) yükle
    populateSkillManager(); // 2. Becerileri (Skills) oluştur
    populateSkillSelector();  // 3. Zar atıcı menüsünü doldur
    updateUIFromData();     // 4. Tüm UI'ı veriyle doldur
    
    loadCampaign();
    renderRollLog();

    // Olay Dinleyicileri
    
    burgerToggle.addEventListener('click', toggleBurgerMenu);
    // DÜZELTİLMİŞ KOD
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Sadece 'data-view' özelliği olan butonlar sayfa değiştirsin
            // (Emeği Geçenler butonunda bu özellik yok, o yüzden burayı pas geçer)
            if (button.dataset.view) {
                switchView(button.dataset.view);
            }
        });
    });
    if (gameModeToggleBtn) {
        gameModeToggleBtn.addEventListener('click', toggleGameMode);
    }
    // === EMEĞİ GEÇENLER MODALI ===
    const creditsBtn = document.getElementById('credits-button');
    const creditsOverlay = document.getElementById('credits-overlay');
    const closeCreditsBtn = document.getElementById('close-credits-button');

    if (creditsBtn && creditsOverlay && closeCreditsBtn) {
        creditsBtn.addEventListener('click', () => {
            creditsOverlay.classList.remove('modal-hidden');
            // CSS transition için ufak bir hile (style özelliğini JS ile tetiklemek)
            creditsOverlay.style.opacity = '1';
            creditsOverlay.style.visibility = 'visible';
            // Burger menüyü kapat (Mobilde ekranı kaplamasın)
            document.body.classList.remove('menu-is-open');
        });

        const closeCredits = () => {
            creditsOverlay.style.opacity = '0';
            creditsOverlay.style.visibility = 'hidden';
            setTimeout(() => {
                creditsOverlay.classList.add('modal-hidden');
            }, 300); // Transition süresi kadar bekle
        };

        closeCreditsBtn.addEventListener('click', closeCredits);
        
        // Dışarı tıklayınca kapatma
        creditsOverlay.addEventListener('click', (e) => {
            if (e.target === creditsOverlay) {
                closeCredits();
            }
        });
    }
    themeToggleButton.addEventListener('click', toggleTheme);
    
    plusFatePointButton.addEventListener('click', () => handleChangeFatePoints(1));
    minusFatePointButton.addEventListener('click', () => handleChangeFatePoints(-1));
    
    rollButton.addEventListener('click', handleRollClick);
    spendFatePointButton.addEventListener('click', handleSpendFatePoint);
    rerollFateButton.addEventListener('click', handleRerollClick);
    addStuntButton.addEventListener('click', handleAddStunt);
    stuntInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddStunt();
    });
    

    createCampaignButton.addEventListener('click', handleCreateCampaign);
    updateCampaignButton.addEventListener('click', handleUpdateCampaign);
    
    gmAddSituationAspectButton.addEventListener('click', handleGmAddSituationAspect);
    gmSituationAspectInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGmAddSituationAspect();
    });

    gmPlusFatePointButton.addEventListener('click', () => handleGmFatePointChange(1));
    gmMinusFatePointButton.addEventListener('click', () => handleGmFatePointChange(-1));

    leaveCampaignButton.addEventListener('click', handleLeaveCampaign);
    editCampaignButton.addEventListener('click', handleEditCampaignClick);
    deleteCampaignButton.addEventListener('click', handleDeleteCampaign);
    
    modalInput.addEventListener('keypress', (e) => {
        if (!modalOverlay.classList.contains('modal-hidden') && e.key === 'Enter') {
            e.preventDefault();
            handleModalConfirm();
        }
    });
    
    modalConfirmButton.addEventListener('click', handleModalConfirm);
    modalCancelButton.addEventListener('click', handleModalCancel);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            handleModalCancel();
        }
    });


    const charInputsToTrack = [
        charNameInput, charDescInput, charRefreshInput,
        charHighConceptInput, charTroubleInput,
        charRelationshipInput, charAspect1Input, charAspect2Input,
        consequenceMildInput, consequenceModerateInput, consequenceSevereInput,
        document.getElementById('consequence-mild-extra') // Ekstra consequence
    ];
    charInputsToTrack.forEach(input => {
        if (input) { 
             input.addEventListener('input', handleCharacterInputChange);
        }
    });

    exportCharButton.addEventListener('click', handleExportCharacter);
    importCharButton.addEventListener('click', handleImportClick);
    importFileInput.addEventListener('change', handleImportFile);
    
    // "Tehlikeli Bölge"deki sıfırlama butonu
    resetCharButton.addEventListener('click', handleResetCharacterWipe);

    // Karakter menüsü butonları
    characterSelector.addEventListener('change', handleCharacterSwitch);
    addNewCharacterButton.addEventListener('click', handleAddNewCharacter);
    deleteCharacterButton.addEventListener('click', handleDeleteCharacter);
    
    // Kampanya Kişi Sayısı doğrulaması
    newCampaignPlayersInput.addEventListener('change', handleCampaignPlayerInputValidation);
    // === REHBER / KULLANIM KILAVUZU MANTIĞI ===
    const guideOverlay = document.getElementById('guide-overlay');
    const guideButton = document.getElementById('guide-button');
    const closeGuideButton = document.getElementById('close-guide-button');

    // 1. Rehberi Gösteren Fonksiyon
    function showGuide() {
        if (guideOverlay) {
            guideOverlay.classList.remove('modal-hidden');
            // Menüyü mobilde kapat (eğer açıksa)
            document.body.classList.remove('menu-is-open');
        }
    }

    // 2. Rehberi Kapatan Fonksiyon
    function closeGuide() {
        if (guideOverlay) {
            guideOverlay.classList.add('modal-hidden');
            // Kullanıcının rehberi gördüğünü kaydet
            localStorage.setItem('fateGuideSeen', 'true');
        }
    }

    // 3. Menü butonuna tıklayınca aç
    if (guideButton) {
        guideButton.addEventListener('click', showGuide);
    }

    // 4. "Okudum, Anladım" butonuna tıklayınca kapat
    if (closeGuideButton) {
        closeGuideButton.addEventListener('click', closeGuide);
    }

    // 5. Sayfa Yüklendiğinde Otomatik Kontrol
    // Eğer kullanıcı daha önce "Okudum" demediyse rehberi aç
    const hasSeenGuide = localStorage.getItem('fateGuideSeen');
    if (!hasSeenGuide) {
        // Biraz gecikmeli açalım ki sayfa tam otursun
        setTimeout(showGuide, 500);
    }
    
    
    // --- CANLI ARKA PLAN HAREKETİ ---
    
    const moveFactor = 0.04;

    function handleBackgroundMove(e) {
        document.body.classList.remove('bg-is-resetting');
        const xPercent = e.clientX / window.innerWidth;
        const yPercent = e.clientY / window.innerHeight;
        const bgX = 50 + (xPercent - 0.1) * (moveFactor * 100);
        const bgY = 50 + (yPercent - 0.1) * (moveFactor * 100);
        window.requestAnimationFrame(() => {
            document.body.style.setProperty('--mouse-x-percent', `${bgX}%`);
            document.body.style.setProperty('--mouse-y-percent', `${bgY}%`);
        });
    }

    function resetBackground() {
        document.body.classList.add('bg-is-resetting');
        window.requestAnimationFrame(() => {
            document.body.style.setProperty('--mouse-x-percent', '50%');
            document.body.style.setProperty('--mouse-y-percent', '50%');
        });
    }

    document.addEventListener('mousemove', handleBackgroundMove);
    document.addEventListener('mouseleave', resetBackground);
    // === MODÜL 2: SLIDING DRAWER NOT SİSTEMİ ===
    const notesDrawer = document.getElementById('notes-drawer');
    const notesToggleBtn = document.getElementById('notes-toggle-btn');
    const playerNotesArea = document.getElementById('player-notes-area');
    const notesStatusMsg = document.getElementById('notes-status-msg');

    if (notesDrawer && notesToggleBtn && playerNotesArea) {
        
        // 1. Çekmeceyi Aç/Kapa
        notesToggleBtn.addEventListener('click', () => {
            notesDrawer.classList.toggle('open');
        });

        // 2. Sayfa Yüklendiğinde Kayıtlı Notları Getir
        const savedNotes = localStorage.getItem('fatePlayerNotes');
        if (savedNotes) {
            playerNotesArea.value = savedNotes;
        }

        // 3. Not Yazıldıkça Kaydet (Otomatik Kayıt)
        playerNotesArea.addEventListener('input', () => {
            const currentNote = playerNotesArea.value;
            localStorage.setItem('fatePlayerNotes', currentNote);
            
            // Ufak bir "Kaydedildi" bildirimi (Opsiyonel UX dokunuşu)
            notesStatusMsg.textContent = t('txt_notes_saved') + "...";
            setTimeout(() => {
                notesStatusMsg.textContent = "";
            }, 1000);
        });
    }
// Beceri Editörü Eventleri
    if (campaignSkillAddBtn) {
        campaignSkillAddBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            addSkillToEditor();
        });
    }
    if (campaignSkillResetBtn) {
        campaignSkillResetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resetSkillEditorToDefault();
        });
    }
    if (campaignSkillAddInput) {
        campaignSkillAddInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSkillToEditor();
            }
        });
    }
    // ------------------------------------
    
    switchView('char');
});