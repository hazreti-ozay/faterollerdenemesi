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


// === VERİ ===
const FATE_SKILLS = [
    "Athletics", "Burglary", "Contacts", "Crafts", "Deceive", "Drive",
    "Empathy", "Fight", "Investigate", "Lore", "Notice", "Physique",
    "Provoke", "Rapport", "Resources", "Shoot", "Stealth", "Will"
];
// YENİ: Beceri Piramidi Limitleri
const SKILL_PYRAMID_LIMITS = {
    4: 1, // 1 adet +4
    3: 2, // 2 adet +3
    2: 3, // 3 adet +2
    1: 4  // 4 adet +1
};

const fateLadderDescriptors = {
    "8": "Efsanevi!", "7": "Olağanüstü!", "6": "Muazzam!", "5": "Süper!",
    "4": "Mükemmel!", "3": "Harika!", "2": "Güzel!", "1": "İyi",
    "0": "Sıradan", "-1": "Zayıf", "-2": "Kötü", "-3": "Berbat!",
    "-4": "Çok Berbat!"
};

let characterData = {};
let campaignData = {}; 
let rollHistory = [];
let lastRoll = { total: 0, descriptor: "", logEntry: null };

let currentManagedCampaignId = null;
let liveCharacterListener = null; 
let liveAspectListener = null;
let liveSubmissionListener = null; 


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
        // DEĞİŞTİ: Temel stres 4 kutu oldu
        stress: { physical: [false, false, false, false], mental: [false, false, false, false] }, 
        // DEĞİŞTİ: mildExtra eklendi
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

// GM Kampanya Formu Elementleri
const newCampaignNameInput = document.getElementById('new-campaign-name');
const newCampaignGmNameInput = document.getElementById('new-campaign-gm-name');
const newCampaignSystemInput = document.getElementById('new-campaign-system');
const newCampaignSettingInput = document.getElementById('new-campaign-setting');
const newCampaignLoreInput = document.getElementById('new-campaign-lore');
const newCampaignPlayersInput = document.getElementById('new-campaign-players');
const newCampaignDescInput = document.getElementById('new-campaign-desc');
const newCampaignPasswordInput = document.getElementById('new-campaign-password');
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

// YENİ: MODAL Elementleri
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalInputGroup = document.getElementById('modal-input-group');
const modalInput = document.getElementById('modal-input');
const modalConfirmButton = document.getElementById('modal-confirm-button');
const modalCancelButton = document.getElementById('modal-cancel-button');


let animationInterval = null;
const ANIMATION_DURATION = 600;
const ANIMATION_FLICKER_RATE = 50;


// === YENİ: MODAL SİSTEMİ ===
let modalResolver = null; // Modal'ın cevabını (Promise) tutar

// 'prompt'u taklit eden fonksiyon
function showModalPrompt({ title, message, inputType = 'text' }) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalInput.value = "";
    modalInput.type = inputType;
    modalInputGroup.style.display = 'block';

    modalCancelButton.style.display = 'inline-block';
    modalConfirmButton.textContent = "Onayla";
    
    modalOverlay.classList.remove('modal-hidden');
    modalInput.focus();

    return new Promise((resolve) => {
        modalResolver = resolve;
    });
}

// YENİ: 'confirm'i taklit eden fonksiyon
function showModalConfirm({ title, message }) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalInputGroup.style.display = 'none'; // Input'u gizle

    modalCancelButton.style.display = 'inline-block'; // İptal'i göster
    modalConfirmButton.textContent = "Onayla";
    
    modalOverlay.classList.remove('modal-hidden');

    return new Promise((resolve) => {
        // 'resolve(true)' veya 'resolve(null)' olarak çözülecek
        modalResolver = resolve; 
    });
}

// YENİ: 'alert'i taklit eden fonksiyon
function showModalAlert({ title, message }) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    modalInputGroup.style.display = 'none'; // Input'u gizle

    modalCancelButton.style.display = 'none'; // İptal'i GİZLE
    modalConfirmButton.textContent = "Tamam"; // Buton metnini "Tamam" yap
    
    modalOverlay.classList.remove('modal-hidden');

    return new Promise((resolve) => {
        // Sadece 'Tamam'a basılmasını bekliyor
        modalResolver = resolve; 
    });
}

// GÜNCELLENDİ: handleModalConfirm (Buton metnini sıfırlar)
function handleModalConfirm() {
    if (!modalResolver) return;
    
    if (modalInputGroup.style.display === 'block') {
        modalResolver(modalInput.value);
    } else {
        modalResolver(true); // 'Confirm' ve 'Alert' için 'true' döndür
    }
    
    modalOverlay.classList.add('modal-hidden');
    modalResolver = null;
    modalConfirmButton.textContent = "Onayla"; // Metni varsayılana döndür
}

// GÜNCELLENDİ: handleModalCancel (Buton metnini sıfırlar)
function handleModalCancel() {
    if (!modalResolver) return;

    modalResolver(null); // 'Confirm' ve 'Prompt' için 'null' döndür
    
    modalOverlay.classList.add('modal-hidden');
    modalResolver = null;
    modalConfirmButton.textContent = "Onayla"; // Metni varsayılana döndür
}
// === MODAL SİSTEMİ SONU ===


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

async function saveCharacter() {
    localStorage.setItem('fateCharacterData', JSON.stringify(characterData));
    
    if (localStorage.getItem('fateCampaignStatus') === 'approved') {
        await updateLiveCharacter(characterData);
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
    // YENİ: Başvuru dinleyicisini de kapat
    if (liveSubmissionListener) {
        liveSubmissionListener();
        liveSubmissionListener = null;
    }
    
}

async function showCampaignStatus(status, campaignName = '') {
    if (status === 'approved') {
        campaignStatusText.textContent = `CANLI MOD: "${campaignName}" oyununa bağlısınız.`;
        campaignStatusDisplay.style.display = 'flex';
        leaveCampaignButton.style.display = 'block';
    } else if (status === 'pending') {
        campaignStatusText.textContent = `ONAY BEKLENİYOR: "${campaignName}" oyunu için başvurunuz alındı.`;
        campaignStatusDisplay.style.display = 'flex';
        leaveCampaignButton.style.display = 'block';
    } else {
        campaignStatusDisplay.style.display = 'none';
        leaveCampaignButton.style.display = 'none';
        if (status === 'denied') {
            // (Bunu da yakında modal'a çevireceğiz)
            await showModalAlert({ title: "Başvuru Durumu", message: "Başvurunuz reddedildi veya GM tarafından oyundan çıkarıldınız. Lokal karakterinize döndünüz." });
        }
    }
}

function loadCharacter() {
    const savedData = localStorage.getItem('fateCharacterData');
    const defaultData = getDefaultCharacter();
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            characterData = {
                ...defaultData, ...parsedData,
                skills: { ...defaultData.skills, ...parsedData.skills },
                stress: { ...defaultData.stress, ...parsedData.stress },
                consequences: { ...defaultData.consequences, ...parsedData.consequences },
            };
            if (parsedData.aspect3 || parsedData.aspect4 || parsedData.aspect5) {
                delete characterData.aspect3;
                delete characterData.aspect4;
                delete characterData.aspect5;
            }
            if (characterData.currentFatePoints === undefined) {
                characterData.currentFatePoints = characterData.refresh;
            }
            characterData.stress.physical = (characterData.stress.physical || defaultData.stress.physical).slice(0, defaultData.stress.physical.length);
            characterData.stress.mental = (characterData.stress.mental || defaultData.stress.mental).slice(0, defaultData.stress.mental.length);
        } catch (e) {
            console.error("Kayıtlı veri okunamadı, varsayılana dönülüyor:", e);
            characterData = defaultData;
        }
    } else {
        characterData = defaultData;
    }
    
    detachAllListeners();
    localStorage.setItem('fateCampaignStatus', 'offline');
    showCampaignStatus('offline');

    checkActiveCampaignStatus();
}

// GÜNCELLENDİ: "Anlık Onay" özelliğini ekler (Yeniden Yükleme Hatası Düzeltildi)
async function checkActiveCampaignStatus() {
    const activeCampaignId = localStorage.getItem('fateActiveCampaignId');
    const activeCharacterName = localStorage.getItem('fateActiveCharacterName');

    if (!activeCampaignId || !activeCharacterName) {
        return; // Aktif oyun yok, lokalden devam (zaten edildi)
    }

    const campaignRef = db.collection("publicCampaigns").doc(activeCampaignId);
    const playerRef = campaignRef.collection("players").doc(activeCharacterName);
    const submissionRef = campaignRef.collection("submissions").doc(activeCharacterName);

    try {
        const campaignDoc = await campaignRef.get();
        const campaignName = campaignDoc.exists ? campaignDoc.data().name : "Bilinmeyen Oyun";

        const playerDoc = await playerRef.get();

        // DURUM 1: OYUNCU ONAYLANMIŞ (CANLI MOD)
        if (playerDoc.exists) {
            localStorage.setItem('fateCampaignStatus', 'approved');
            await showCampaignStatus('approved', campaignName);

            // Önceki dinleyicileri temizle
            detachAllListeners();

            // ... checkActiveCampaignStatus fonksiyonunun içindeyiz ...

        // CANLI KARAKTERİ DİNLE
        liveCharacterListener = playerRef.onSnapshot(async (liveDoc) => { // 'async' eklendi
            // === BAŞLANGIÇ: GÖREV 1.2 DÜZELTMESİ (Oyundan Atılma) ===
            if (liveDoc.exists) {
                // Durum A: Oyuncu hala oyunda, veri güncellendi
                console.log("CANLI VERİ GELDİ!");
                
                const parsedData = liveDoc.data();
                const defaultData = getDefaultCharacter();
                characterData = {
                    ...defaultData, ...parsedData,
                    skills: { ...defaultData.skills, ...parsedData.skills },
                    stress: { ...defaultData.stress, ...parsedData.stress },
                    consequences: { ...defaultData.consequences, ...parsedData.consequences },
                };
                
                localStorage.setItem('fateCharacterData', JSON.stringify(characterData));
                updateUIFromData(); 
            } else {
                // Durum B: Doküman silindi (Oyuncu GM tarafından ATILDI)
                console.log("CANLI VERİ SİLİNDİ! (Oyundan Atıldı)");
                
                // 1. Tüm dinleyicileri kapat
                detachAllListeners();
                
                // 2. Durumu 'denied' olarak ayarla (atılma ile aynı)
                localStorage.removeItem('fateActiveCampaignId');
                localStorage.removeItem('fateActiveCharacterName');
                localStorage.setItem('fateCampaignStatus', 'denied');
                
                // 3. Modal'ı göster (showCampaignStatus'un 'denied' durumu bunu yapacak)
                await showCampaignStatus('denied');
                
                // 4. Lokal karakteri yeniden yükle
                loadCharacter();
                populateSkillManager();
                populateSkillSelector();
                updateUIFromData();
            }
            // === BİTİŞ: GÖREV 1.2 DÜZELTMESİ ===
        }, async (error) => {
            console.error("Canlı karakter dinlemesi başarısız:", error);
            await showModalAlert({ title: "Bağlantı Hatası", message: "Hata: Oyuna olan canlı bağlantı koptu." });
        });
// ... fonksiyonun geri kalanı ...
        // DURUM 2: ONAYLANMAMIŞ (BEKLEMEDE VEYA REDDEDİLMİŞ)
        } else {
            // Önceki "onay bekleme" dinleyicisini temizle (varsa)
            if (liveSubmissionListener) liveSubmissionListener();

            // Onaylanıp onaylanmadığını anlamak için başvurusunu DİNLE
            liveSubmissionListener = submissionRef.onSnapshot(async (subDoc) => {
                if (subDoc.exists) {
                    // Başvuru hala oradaysa: Beklemede
                    localStorage.setItem('fateCampaignStatus', 'pending');
                    await showCampaignStatus('pending', campaignName);
                } else {
                    // Başvuru silindi (GM onayladı veya reddetti)
                    // Bu durumda "bekleme" dinleyicisini kapatıyoruz.
                    if (liveSubmissionListener) {
                        liveSubmissionListener();
                        liveSubmissionListener = null;
                    }

                    // Neden silindiğini kontrol et: Oyuncu onaylandı mı?
                    const playerDoc = await playerRef.get();

                    if (playerDoc.exists) {
                        // Onaylandı: Canlı moda geçiş
                        await showModalAlert({
                            title: "Onaylandınız!",
                            message: "GM başvurunuzu onayladı. Canlı mod'a geçiliyor!"
                        });

                        // Lokal veriyi yeniden yükle ve UI'ı güncelle
                        loadCharacter();
                        populateSkillManager();
                        populateSkillSelector();
                        updateUIFromData();
                    } else {
                        // Reddedildi: Lokal moda dön
                        await showModalAlert({
                            title: "Başvuru Reddedildi",
                            message: "GM başvurunuzu reddetti. Lokal karakterinize dönüyorsunuz."
                        });

                        // Aktif kampanya bilgilerini temizle
                        localStorage.removeItem('fateActiveCampaignId');
                        localStorage.removeItem('fateActiveCharacterName');
                        localStorage.setItem('fateCampaignStatus', 'offline');

                        // Lokal veriyi yükle ve UI'ı güncelle
                        loadCharacter();
                        populateSkillManager();
                        populateSkillSelector();
                        updateUIFromData();
                    }
                }
// ... onSnapshot dinleyicisinin ve fonksiyonun geri kalanı ...
            }, (error) => {
                 console.error("Başvuru dinlenirken hata:", error);
                 // (Hata olursa sessiz kal, oyuncu zaten lokal modda)
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

    // YENİ: Formu sıfırlama mantığı
    // Eğer 'campaign' sekmesinden AYRILIYORSAK, butonları 'Oluştur' moduna sıfırla
    if (document.querySelector('.nav-button[data-view="campaign"].active')) {
        if (viewName !== 'campaign') {
            createCampaignButton.style.display = 'block';
            updateCampaignButton.style.display = 'none';
            // Formu da temizleyebiliriz
            newCampaignNameInput.value = "";
            newCampaignGmNameInput.value = "";
            newCampaignSystemInput.value = "FATE";
            newCampaignSettingInput.value = "";
            newCampaignLoreInput.value = "";
            newCampaignPlayersInput.value = "3";
            newCampaignDescInput.value = "";
            newCampaignPasswordInput.value = "";
        }
    }
    // --- YENİ KOD SONU ---
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

// === STUNT YÖNETİMİ ===

// YENİ: Refresh ve Stunt limitlerini kontrol eden ve UI'ı güncelleyen ana fonksiyon
function updateRefreshAndStunts() {
    if (!characterData || !characterData.skills) return; // Veri henüz yüklenmemişse çık

    const currentRefresh = parseInt(characterData.refresh) || 1;
    const maxStunts = 6 - currentRefresh;
    const currentStunts = characterData.stunts.length;

    // UI'ı Güncelle
    stuntLimitDisplay.textContent = maxStunts;
    stuntCurrentDisplay.textContent = currentStunts;

    // Stunt Ekleme Butonunu Yönet
    if (currentStunts >= maxStunts) {
        stuntInput.disabled = true;
        addStuntButton.disabled = true;
        stuntInput.placeholder = "Maksimum Stunt hakkına ulaştınız.";
    } else {
        stuntInput.disabled = false;
        addStuntButton.disabled = false;
        stuntInput.placeholder = "Yeni Stunt açıklaması...";
    }
}
async function renderStunts() { 
    stuntListUl.innerHTML = "";
    if (!characterData.stunts || characterData.stunts.length === 0) {
        stuntListUl.innerHTML = "<li class='stunt-list-item muted'>Henüz stunt eklenmemiş.</li>";
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
        removeButton.title = "Stunt'ı Sil";
        removeButton.addEventListener('click', async () => { 
            await handleRemoveStunt(index); 
        });
        li.appendChild(p);
        li.appendChild(removeButton);
        stuntListUl.appendChild(li);
    });
}
async function handleAddStunt() { 
    // YENİ: Stunt eklemeden önce limiti kontrol et
    const currentRefresh = parseInt(characterData.refresh) || 1;
    const maxStunts = 6 - currentRefresh;
    const currentStunts = characterData.stunts.length;

    if (currentStunts >= maxStunts) {
        await showModalAlert({
            title: "Limit Dolu",
            message: `Stunt limitine ulaştınız (${maxStunts} adet). Daha fazla Stunt eklemek için Refresh puanınızı düşürmelisiniz.`
        });
        return; // Fonksiyonu durdur
    }
    // --- KONTROL SONU ---
    const stuntText = stuntInput.value.trim();
    if (stuntText) {
        characterData.stunts.push(stuntText);
        await saveCharacter(); 
        renderStunts();
        stuntInput.value = "";
    }
}
async function handleRemoveStunt(index) { 
    characterData.stunts.splice(index, 1);
    await saveCharacter(); 
    renderStunts();
    updateRefreshAndStunts(); // Refresh ve Stunt limitlerini güncelle
}
// YENİ FONKSİYON: Kampanya oyuncu sayısı input'unu doğrulama
function handleCampaignPlayerInputValidation() {
    const min = 1;
    const max = 10;
    
    // Değeri al ve tam sayıya çevirmeye çalış
    let value = parseInt(newCampaignPlayersInput.value, 10);

    if (isNaN(value) || value < min) {
        // Eğer 'abc' gibi bir şey yazıldıysa VEYA 1'den küçükse
        // Değeri 'min' (1) olarak ayarla
        newCampaignPlayersInput.value = min;
    } else if (value > max) {
        // Eğer 10'dan büyükse
        // Değeri 'max' (10) olarak ayarla
        newCampaignPlayersInput.value = max;
    } else {
        // Değer 1-10 arasındaysa, (örn: "3.14" yazmışsa) tam sayı olduğundan emin ol
        newCampaignPlayersInput.value = value; 
    }
}

// === KAMPANYA YÖNETİMİ (FIREBASE) ===

async function handleCreateCampaign() {
    const name = newCampaignNameInput.value.trim();
    const system = newCampaignSystemInput.value.trim();
    const gmName = newCampaignGmNameInput.value.trim();
    const setting = newCampaignSettingInput.value.trim(); 
    const lore = newCampaignLoreInput.value.trim(); 
    const players = parseInt(newCampaignPlayersInput.value) || 0;
    const desc = newCampaignDescInput.value.trim();
    const password = newCampaignPasswordInput.value.trim();
    // === YENİ KONTROL BAŞLANGICI ===
    if (players < 1 || players > 10) {
        await showModalAlert({ title: "Geçersiz Oyuncu Sayısı", message: "Hata: Kişi sayısı en az 1, en fazla 10 olabilir." });
        return; // Fonksiyonu durdur
    }
    // === YENİ KONTROL BİTİŞİ ===

    if (!name || !password || !desc || !setting || !gmName) {
       await showModalAlert({ title: "Eksik Bilgi", message: "Hata: Lütfen Oyun Adı, GM Adı, Sistem, Setting, Hikaye Kancası ve Yönetim Şifresi alanlarını doldurun." });
        return;
    }
    
    createCampaignButton.disabled = true;
    createCampaignButton.textContent = "Oluşturuluyor...";

    try {
        const newCampaign = {
            name: name,
            gmName: gmName,
            system: system,
            setting: setting, 
            lore: lore, 
            maxPlayers: players,
            currentPlayerCount: 0, // <-- YENİ SATIR
            description: desc, 
            password: password, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            situationAspects: [] 
        };

        await db.collection("publicCampaigns").add(newCampaign);

        await showModalAlert({ title: "Başarılı", message: "Kampanyanız lobiye eklendi." });
        
        newCampaignNameInput.value = "";
        newCampaignGmNameInput.value = ""; // <-- YENİ SATIR
        newCampaignSystemInput.value = "FATE";
        newCampaignSettingInput.value = ""; 
        newCampaignLoreInput.value = ""; 
        newCampaignPlayersInput.value = "3";
        newCampaignDescInput.value = "";
        newCampaignPasswordInput.value = "";

        switchView('find-campaign');

    } catch (error) {
        console.error("Kampanya oluşturulurken hata:", error);
        await showModalAlert({ title: "Firebase Hatası", message: "Hata: Kampanya oluşturulamadı. Lütfen konsolu (F12) kontrol edin." });
    }

    createCampaignButton.disabled = false;
    createCampaignButton.textContent = "Kampanyayı Lobiye Ekle";
}
// YENİ: Kampanyayı Güncelleme
async function handleUpdateCampaign() {
    if (!currentManagedCampaignId) return; // Güncellenecek ID yoksa dur

    // 1. Formdan verileri oku
    const name = newCampaignNameInput.value.trim();
    const gmName = newCampaignGmNameInput.value.trim();
    const system = newCampaignSystemInput.value.trim();
    const setting = newCampaignSettingInput.value.trim(); 
    const lore = newCampaignLoreInput.value.trim(); 
    const players = parseInt(newCampaignPlayersInput.value) || 0;
    const desc = newCampaignDescInput.value.trim();
    const password = newCampaignPasswordInput.value.trim();
    // === YENİ KONTROL BAŞLANGICI ===
    if (players < 1 || players > 10) {
        await showModalAlert({ title: "Geçersiz Oyuncu Sayısı", message: "Hata: Kişi sayısı en az 1, en fazla 10 olabilir." });
        return; // Fonksiyonu durdur
    }
    // === YENİ KONTROL BİTİŞİ ===

    // 2. Doğrulama
    if (!name || !password || !desc || !setting || !gmName) {
        await showModalAlert({ title: "Eksik Bilgi", message: "Hata: Lütfen Oyun Adı, GM Adı, Sistem, Setting, Hikaye Kancası ve Yönetim Şifresi alanlarını doldurun." });
        return;
    }
    
    updateCampaignButton.disabled = true;
    updateCampaignButton.textContent = "Güncelleniyor...";

    try {
        const updatedCampaignData = {
            name: name,
            gmName: gmName,
            system: system,
            setting: setting, 
            lore: lore, 
            maxPlayers: players,
            description: desc, 
            password: password, 
            // createdAt ve situationAspects'e dokunmuyoruz, onlar korunacak
        };

        // 3. .add() yerine .doc().update() kullanıyoruz
        await db.collection("publicCampaigns").doc(currentManagedCampaignId).update(updatedCampaignData);

        await showModalAlert({ title: "Başarılı", message: "Kampanyanız güncellendi." });
        
        // 4. Formu temizle ve butonları sıfırla
        newCampaignNameInput.value = "";
        newCampaignGmNameInput.value = ""; 
        newCampaignSystemInput.value = "FATE";
        newCampaignSettingInput.value = ""; 
        newCampaignLoreInput.value = ""; 
        newCampaignPlayersInput.value = "3";
        newCampaignDescInput.value = "";
        newCampaignPasswordInput.value = "";

        // 5. Butonları sıfırla (Oluştur'u göster, Güncelle'yi gizle)
        createCampaignButton.style.display = 'block';
        updateCampaignButton.style.display = 'none';

        switchView('find-campaign'); // Lobiye dön

    } catch (error) {
        console.error("Kampanya güncellenirken hata:", error);
        await showModalAlert({ title: "Firebase Hatası", message: "Hata: Kampanya güncellenemedi. Lütfen konsolu (F12) kontrol edin." });
    }

    updateCampaignButton.disabled = false;
    updateCampaignButton.textContent = "Kampanya Bilgilerini Güncelle";
}

// GÜNCELLENDİ: renderPublicCampaigns (Kapasite kontrolü ve "Dolu" butonu eklendi)
async function renderPublicCampaigns() {
    publicCampaignListContainer.innerHTML = "<li class='stunt-list-item muted'>Kampanyalar yükleniyor...</li>";
    
    try {
        const snapshot = await db.collection("publicCampaigns").orderBy("createdAt", "desc").get();
        
        if (snapshot.empty) {
            publicCampaignListContainer.innerHTML = "<li class='stunt-list-item muted'>Henüz oluşturulmuş bir kampanya yok.</li>";
            return;
        }

        publicCampaignListContainer.innerHTML = ""; 
        
        snapshot.forEach(doc => {
            const campaign = doc.data();
            const campaignId = doc.id;
            
            // YENİ: Kapasite Kontrolü
            const maxP = campaign.maxPlayers || 0;
            const currentP = campaign.currentPlayerCount || 0;
            const isFull = currentP >= maxP;
            
            const card = document.createElement('div');
            // YENİ: Kart doluysa CSS sınıfı ekle
            card.className = `campaign-list-card ${isFull ? 'campaign-card-full' : ''}`;

            card.innerHTML = `
                <div class="campaign-card-header">
                    <h3>${campaign.name} ${isFull ? '(DOLU)' : ''}</h3>
                </div>
                <div class="campaign-card-body">
                    <div class="campaign-card-stats">
                        <span><strong>GM:</strong> ${campaign.gmName || 'Bilinmiyor'}</span>
                        <span><strong>Sistem:</strong> ${campaign.system || 'Belirtilmemiş'}</span>
                        <span><strong>Setting:</strong> ${campaign.setting || 'Belirtilmemiş'}</span>
                        <span><strong>Kişi:</strong> ${currentP} / ${maxP}</span>
                    </div>
                    <p class="campaign-card-desc">"${campaign.description || 'Açıklama yok.'}"</p>
                    
                    ${campaign.lore ? `
                        <div class="menu-divider"></div>
                        <p><strong>Detaylar / Lore:</strong><br>${campaign.lore.replace(/\n/g, '<br>')}</p>
                    ` : ''}
                </div>
                <div class="campaign-card-footer">
                    <button class="btn btn-secondary" data-action="manage" data-id="${campaignId}" data-password="${campaign.password}" data-name="${campaign.name}">
                        Yönet
                    </button>
                    <button class="btn btn-primary" data-action="submit" data-id="${campaignId}" data-name="${campaign.name}" ${isFull ? 'disabled' : ''}>
                        ${isFull ? 'Kampanya Dolu' : 'Karakterimi Gönder'}
                    </button>
                </div>
            `;
            
            card.querySelector('[data-action="manage"]').addEventListener('click', (e) => {
                const data = e.currentTarget.dataset;
                promptForCampaignPassword(data.id, data.password, data.name);
            });
            
            // "Dolu" değilse 'submit' dinleyicisini ekle
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
        publicCampaignListContainer.innerHTML = "<li class='stunt-list-item danger-zone'>Hata: Kampanyalar yüklenemedi.</li>";
    }
}


async function handleSubmitToCampaign(campaignId, campaignName) {
    if (!characterData.name || !characterData.highConcept) {
       await showModalAlert({ title: "Eksik Karakter", message: "Hata: Lütfen 'Karakter Sayfası' sekmesine gidin ve en azından karakterinizin 'İsim' ve 'High Concept' alanlarını doldurun." });
        switchView('char');
        return;
    }
    
    // (Bunu da yakında modal'a çevireceğiz)
    const isSure = await showModalConfirm({ title: "Onay", message: `${characterData.name}' adlı karakterinizi '${campaignName}' oyununa göndermek istediğinizden emin misiniz?` });
    
    if (!isSure) {
        return;
    }

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

       await showModalAlert({ title: "Başvuru Alındı", message: "Başarılı! Karakteriniz GM'in onayına gönderildi." });
       
       checkActiveCampaignStatus();
        
    } catch (error) {
        console.error("Karakter gönderilirken hata:", error);
      await showModalAlert({ title: "Firebase Hatası", message: "Hata: Karakteriniz gönderilemedi. Lütfen konsolu (F12) kontrol edin." });
    }
}

// === GM YÖNETİM PANELİ FONKSİYONLARI ===

// GÜNCELLENDİ: 'prompt' yerine yeni modal'ı kullanır
async function promptForCampaignPassword(campaignId, correctPassword, campaignName) {
    
    const promptedPassword = await showModalPrompt({
        title: `Yönetim: ${campaignName}`,
        message: "Bu kampanyayı yönetmek için lütfen şifrenizi girin:",
        inputType: "password"
    });

    if (promptedPassword === null) { // Kullanıcı "İptal"e bastı
        return;
    }

    if (promptedPassword === correctPassword) {
        currentManagedCampaignId = campaignId; 
        loadGmAdminView(campaignName); 
        switchView('gm-admin'); 
    } else {
        await showModalAlert({ title: "Giriş Hatası", message: "Şifre yanlış!" });
    }
}

function loadGmAdminView(campaignName) {
    if (!currentManagedCampaignId) return;
    
    gmAdminTitle.textContent = `Yönetim: ${campaignName}`;
    
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
                
                const aspects = doc.data().situationAspects || [];
                
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
                 gmSituationAspectList.innerHTML = "<li class'stunt-list-item danger-zone'>Hata: Aspektler yüklenemedi.</li>";
            });

    } catch (error) {
        console.error("renderGmSituationAspects hatası:", error);
    }
}

async function renderSubmittedCharacters() {
    if (!currentManagedCampaignId) return;

    gmSubmittedCharList.innerHTML = "<li class='stunt-list-item muted'>Başvurular yükleniyor...</li>";

    try {
        db.collection("publicCampaigns").doc(currentManagedCampaignId).collection("submissions")
            .orderBy("submittedAt", "desc")
            .onSnapshot((snapshot) => {
                
                if (snapshot.empty) {
                    gmSubmittedCharList.innerHTML = "<li class='stunt-list-item muted'>Henüz başvuran karakter yok.</li>";
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
                            High Concept: ${char.highConcept} | Trouble: ${char.trouble}
                        </p>
                    `;
                    
                    const buttonGroup = document.createElement('div');
                    buttonGroup.style.display = 'flex';
                    buttonGroup.style.gap = '10px';
                    buttonGroup.style.marginLeft = '15px';

                    const denyButton = document.createElement('button');
                    denyButton.className = 'btn btn-danger-outline';
                    denyButton.textContent = 'Reddet';
                    denyButton.addEventListener('click', () => {
                        handleDenyCharacter(submissionId, char.name);
                    });

                    const approveButton = document.createElement('button');
                    approveButton.className = 'btn btn-primary'; 
                    approveButton.textContent = 'Onayla';
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
                console.error("Başvuran karakterler dinlenirken hata:", error);
                gmSubmittedCharList.innerHTML = "<li class='stunt-list-item danger-zone'>Hata: Başvurular yüklenemedi.</li>";
            });

    } catch (error) {
        console.error("renderSubmittedCharacters hatası:", error);
    }
}

// GÜNCELLENDİ: renderApprovedPlayers (Başlığa sayaç eklendi)
async function renderApprovedPlayers() {
    if (!currentManagedCampaignId) return;

    gmApprovedPlayersList.innerHTML = "<li class'stunt-list-item muted'>Oyuncular yükleniyor...</li>";

    try {
        // Önce ana kampanya dokümanını alıp limiti öğrenelim
        const campaignDoc = await db.collection("publicCampaigns").doc(currentManagedCampaignId).get();
        const maxPlayers = campaignDoc.data().maxPlayers || 0;

        // Şimdi oyuncuları dinle
        db.collection("publicCampaigns").doc(currentManagedCampaignId).collection("players")
            .onSnapshot((snapshot) => {
                
                const currentPlayers = snapshot.size;
                // YENİ: Kartın başlığını güncelle
                gmApprovedPlayersList.parentElement.querySelector('h2.card-title').textContent = `Onaylanmış Oyuncular (${currentPlayers} / ${maxPlayers})`;

                const openCards = new Set();
                gmApprovedPlayersList.querySelectorAll('.gm-player-card.is-open').forEach(card => {
                    openCards.add(card.dataset.playerId);
                });

                if (snapshot.empty) {
                    gmApprovedPlayersList.innerHTML = "<li class='stunt-list-item muted'>Henüz onaylanmış oyuncu yok.</li>";
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
                    infoDiv.innerHTML = `
                        <p style="margin: 0; font-weight: 700; color: var(--color-text);">${char.name}</p>
                        <p style="margin: 0; font-size: 0.9rem; color: var(--color-text-muted);">
                            Fate: ${char.currentFatePoints} | P. Stres: ${char.stress.physical.filter(Boolean).length} | M. Stres: ${char.stress.mental.filter(Boolean).length}
                        </p>
                    `;

                    const buttonGroup = document.createElement('div');
                    
                    const kickButton = document.createElement('button');
                    kickButton.className = 'btn btn-danger'; 
                    kickButton.textContent = 'At';
                    kickButton.title = "Oyuncuyu Oyundan At";
                    kickButton.addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        handleKickPlayer(playerName);
                    });

                    const toggleButton = document.createElement('button');
                    toggleButton.className = 'btn gm-player-toggle'; 
                    toggleButton.innerHTML = '▼';
                    toggleButton.title = "Detayları Gör";
                    
                    buttonGroup.appendChild(kickButton);
                    buttonGroup.appendChild(toggleButton);

                    header.appendChild(infoDiv);
                    header.appendChild(buttonGroup);

                    const details = document.createElement('div');
                    details.className = 'gm-player-details';
                    
                    let skillsHtml = '<ul>';
                    FATE_SKILLS.forEach(skill => {
                        if (char.skills[skill] > 0) {
                            skillsHtml += `<li><strong>${skill}:</strong> +${char.skills[skill]}</li>`;
                        }
                    });
                    if (skillsHtml === '<ul>') skillsHtml = '<p><em>(Yüksek beceri girilmemiş)</em></p>';
                    else skillsHtml += '</ul>';

                    let stuntsHtml = '<ul>';
                    if (char.stunts && char.stunts.length > 0) {
                        char.stunts.forEach(stunt => {
                            stuntsHtml += `<li>${stunt}</li>`;
                        });
                    } else {
                        stuntsHtml = '<p><em>(Stunt girilmemiş)</em></p>';
                    }
                    stuntsHtml += '</ul>';

                    details.innerHTML = `
                        <h3>Aspektler</h3>
                        <ul>
                            <li><strong>High Concept:</strong> ${char.highConcept || '...'}</li>
                            <li><strong>Trouble:</strong> ${char.trouble || '...'}</li>
                            <li><strong>Relationship:</strong> ${char.relationship || '...'}</li>
                            <li><strong>Aspekt 1:</strong> ${char.aspect1 || '...'}</li>
                            <li><strong>Aspekt 2:</strong> ${char.aspect2 || '...'}</li>
                        </ul>
                        <h3>Beceriler</h3>
                        ${skillsHtml}
                        <h3>Stunt'lar</h3>
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
                console.error("Onaylanmış oyuncular dinlenirken hata:", error);
                gmApprovedPlayersList.innerHTML = "<li class='stunt-list-item danger-zone'>Hata: Oyuncular yüklenemedi.</li>";
            });

    } catch (error) {
        console.error("renderApprovedPlayers hatası:", error);
    }
}


async function handleDenyCharacter(submissionId, charName) {
    if (!currentManagedCampaignId) return;

    const isSure = await showModalConfirm({ title: "Onay", message: `${charName}' adlı karakterin başvurusunu reddetmek (ve silmek) istediğinizden emin misiniz?` });
    if (!isSure) return;

    try {
        await db.collection("publicCampaigns").doc(currentManagedCampaignId)
                .collection("submissions").doc(submissionId).delete();
    } catch (error) {
        console.error("Başvuru reddedilirken hata:", error);
     await showModalAlert({ title: "Hata", message: "Hata: Başvuru reddedilemedi." });
    }
}

// GÜNCELLENDİ: handleApproveCharacter (Kapasite Kontrolü Eklendi)
async function handleApproveCharacter(submissionId, characterObject) {
    if (!currentManagedCampaignId) return;

    try {
        // --- YENİ KONTROL BAŞLANGICI ---
        // 1. Mevcut oyuncu sayısını ve limiti al
        const campaignRef = db.collection("publicCampaigns").doc(currentManagedCampaignId);
        const campaignDoc = await campaignRef.get();
        const maxPlayers = campaignDoc.data().maxPlayers || 0; // Limiti al
        
        const playersSnapshot = await campaignRef.collection("players").get();
        const currentPlayers = playersSnapshot.size; // Mevcut oyuncu sayısını al

        // 2. Limiti kontrol et
        if (currentPlayers >= maxPlayers) {
            await showModalAlert({ title: "Kapasite Dolu", message: `Bu oyun zaten ${maxPlayers} oyuncu limitine ulaşmış. Yeni oyuncu onaylayamazsınız.` });
            return; // Fonksiyonu durdur
        }
        // --- YENİ KONTROL SONU ---

        // 3. Onay al (Eğer limit dolu değilse)
        const isSure = await showModalConfirm({ 
            title: "Onay", 
            message: `'${characterObject.name}' adlı karakteri oyuna onaylamak istediğinizden emin misiniz? (${currentPlayers + 1} / ${maxPlayers} oyuncu olacak)` 
        });
        if (!isSure) return;
        
        // 4. Oyuncuyu onayla
        delete characterObject.submittedAt;

        await db.collection("publicCampaigns").doc(currentManagedCampaignId)
                .collection("players").doc(submissionId).set(characterObject);

        await db.collection("publicCampaigns").doc(currentManagedCampaignId)
                .collection("submissions").doc(submissionId).delete();

        await campaignRef.update({
            currentPlayerCount: firebase.firestore.FieldValue.increment(1)
        });
        
        await showModalAlert({ title: "Başarılı", message: `'${characterObject.name}' oyuna onaylandı!` });

    } catch (error) {
        console.error("Karakter onaylanırken hata:", error);
        await showModalAlert({ title: "Hata", message: "Hata: Karakter onaylanamadı. Konsolu kontrol edin." });
    }
}

async function handleKickPlayer(playerName) {
    if (!currentManagedCampaignId) return;

    const isSure = await showModalConfirm({ title: "Onay", message: `${playerName} adlı oyuncuyu oyundan atmak (ve karakterini silmek) istediğinizden emin misiniz?` });
    if (!isSure) return;

    try {
        await db.collection("publicCampaigns").doc(currentManagedCampaignId)
                .collection("players").doc(playerName).delete();
                const campaignRef = db.collection("publicCampaigns").doc(currentManagedCampaignId);
        await campaignRef.update({
            currentPlayerCount: firebase.firestore.FieldValue.increment(-1)
        });
        await showModalAlert({ title: "Başarılı", message: `${playerName} oyundan atıldı.` });
    } catch (error) {
        console.error("Oyuncu atılırken hata:", error);
        await showModalAlert({ title: "Hata", message: "Hata: Oyuncu atılamadı." });
    }
}
// YENİ: Kampanyayı Kalıcı Olarak Silme
async function handleDeleteCampaign() {
    if (!currentManagedCampaignId) return;

    // 1. Onay Al
    const isSure = await showModalConfirm({ 
        title: "DİKKAT! KAMPANYAYI SİL", 
        message: "Bu kampanyayı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm başvurular/oyuncular silinir."
    });
    if (!isSure) return;

    // 2. Ekstra Onay (Kullanıcının yanlışlıkla tıklamasını engelle)
    const campaignDoc = await db.collection("publicCampaigns").doc(currentManagedCampaignId).get();
    const campaignName = campaignDoc.data().name;
    const confirmationText = await showModalPrompt({
        title: "Son Onay",
        message: `Silmek için lütfen kampanya adını tam olarak yazın: "${campaignName}"`,
        inputType: "text"
    });

    if (confirmationText !== campaignName) {
        await showModalAlert({ title: "İptal Edildi", message: "Kampanya adı eşleşmedi. Silme işlemi iptal edildi." });
        return;
    }

    // 3. Silme İşlemi
    try {
        // Not: Bu yöntem, alt koleksiyonları (players, submissions) "yetim" bırakır.
        // Tam bir temizlik için Firebase Functions (Cloud Fonksiyonları) gerekir.
        // Ancak bu "yetim" veriye artık ulaşılamayacağı için lobi sistemimiz için bu yeterlidir.
        await db.collection("publicCampaigns").doc(currentManagedCampaignId).delete();

        await showModalAlert({ title: "Başarılı", message: `"${campaignName}" kampanyası başarıyla silindi.` });
        
        currentManagedCampaignId = null; // Yönetilen ID'yi temizle
        switchView('find-campaign'); // Lobiye geri dön

    } catch (error) {
        console.error("Kampanya silinirken hata:", error);
        await showModalAlert({ title: "Hata", message: "Hata: Kampanya silinemedi. Lütfen konsolu (F12) kontrol edin." });
    }
}
// YENİ: Kampanya Düzenle formunu yükler
async function handleEditCampaignClick() {
    if (!currentManagedCampaignId) return;

    try {
        const campaignDoc = await db.collection("publicCampaigns").doc(currentManagedCampaignId).get();
        if (!campaignDoc.exists) {
            return await showModalAlert({ title: "Hata", message: "Düzenlenecek kampanya bulunamadı." });
        }
        const data = campaignDoc.data();

        // 1. Formu doldur
        newCampaignNameInput.value = data.name || "";
        newCampaignGmNameInput.value = data.gmName || "";
        newCampaignSystemInput.value = data.system || "FATE";
        newCampaignSettingInput.value = data.setting || "";
        newCampaignPlayersInput.value = data.maxPlayers || 3;
        newCampaignDescInput.value = data.description || "";
        newCampaignLoreInput.value = data.lore || "";
        newCampaignPasswordInput.value = data.password || ""; // Şifreyi de yüklüyoruz

        // 2. Butonları ayarla (Oluştur'u gizle, Güncelle'yi göster)
        createCampaignButton.style.display = 'none';
        updateCampaignButton.style.display = 'block';

        // 3. Sayfayı değiştir
        switchView('campaign');

    } catch (error) {
        console.error("Kampanya düzenleme verisi çekilirken hata:", error);
        await showModalAlert({ title: "Hata", message: "Kampanya verisi çekilemedi. Konsolu kontrol edin." });
    }
}


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

async function handleLeaveCampaign() {
    const activeCampaignId = localStorage.getItem('fateActiveCampaignId');
    const activeCharacterName = localStorage.getItem('fateActiveCharacterName');
    const status = localStorage.getItem('fateCampaignStatus');

    if (!activeCampaignId || !activeCharacterName) return;
    
    const confirmationText = (status === 'approved') 
        ? "Şu an bağlı olduğunuz oyundan ayrılmak istediğinize emin misiniz? (Karakteriniz oyundan silinecek)"
        : "Kampanya başvurunuzu geri çekmek istediğinizden emin misiniz?";
    
    const isSure = await showModalConfirm({ title: "Oyundan Ayrıl", message: confirmationText });
    if (!isSure) return;

    try {
        detachAllListeners();
        
        const campaignRef = db.collection("publicCampaigns").doc(activeCampaignId); // <-- YENİ REFERANS
        if (status === 'approved') {
            await db.collection("publicCampaigns").doc(activeCampaignId).collection("players").doc(activeCharacterName).delete();
            // YENİ: Sadece onaylanmış oyuncu ayrılırsa sayacı azalt
            await campaignRef.update({
                currentPlayerCount: firebase.firestore.FieldValue.increment(-1)
            });
        } else if (status === 'pending') {
            await db.collection("publicCampaigns").doc(activeCampaignId).collection("submissions").doc(activeCharacterName).delete();
        }

        localStorage.removeItem('fateActiveCampaignId');
        localStorage.removeItem('fateActiveCharacterName');
        localStorage.setItem('fateCampaignStatus', 'offline');
        
        await showModalAlert({ title: "Başarılı", message: "Oyundan başarıyla ayrıldınız. Lokal karakterinize dönülüyor." });
        
        loadCharacter(); 
        updateUIFromData(); 

    } catch (error) {
        console.error("Oyundan ayrılırken hata:", error);
        await showModalAlert({ title: "Hata", message: "Hata: Oyundan ayrılamadınız. Lütfen tekrar deneyin." });
    }
}
async function handleStressClick(trackName, index) {
    // Kilitli bir kutuya tıklanıp tıklanmadığını kontrol et
    // (Veri dizisinin uzunluğundan büyük bir indexe tıklanmışsa)
    if (index >= characterData.stress[trackName].length) {
        console.warn("Kilitli stres kutusuna tıklandı, işlem yok.");
        return;
    }
    
    characterData.stress[trackName][index] = !characterData.stress[trackName][index];
    await saveCharacter();
    
    // UI'ı Güncelle
    const trackContainer = (trackName === 'physical') ? physicalStressTrack : mentalStressTrack;
    const box = trackContainer.children[index];
    if (box) { // Kutunun var olduğundan emin ol
        box.classList.toggle('checked', characterData.stress[trackName][index]);
    }
}
// YENİ YARDIMCI FONKSİYON (Ekstra Consequence Slotu için)
function renderExtraConsequences() {
    const extraMildSlotGroup = document.getElementById('form-group-consequence-mild-extra');
    const extraMildInput = document.getElementById('consequence-mild-extra');

    if (!extraMildSlotGroup || !extraMildInput) return; // HTML bulunamazsa çık

    const physique = characterData.skills['Physique'] || 0;
    const will = characterData.skills['Will'] || 0;

    // Kural: Physique VEYA Will +4 ise slotu göster
    if (physique >= 4 || will >= 4) {
        extraMildSlotGroup.style.display = 'block';
        extraMildInput.value = characterData.consequences.mildExtra || "";
    } else {
        // Slotu gizle ve veriyi temizle
        extraMildSlotGroup.style.display = 'none';
        if (characterData.consequences.mildExtra) {
            characterData.consequences.mildExtra = "";
            // saveCharacter() burada çağrılabilir ama 'handleSkillChange' zaten çağıracak.
        }
    }
}


// === STRES YÖNETİMİ ===
async function createStressTrack(container, trackName) {
    container.innerHTML = "";
    
    // 1. İlgili beceriyi ve seviyesini belirle
    const skillName = (trackName === 'physical') ? 'Physique' : 'Will';
    const skillLevel = characterData.skills[skillName] || 0;

    // 2. Kurala göre kaç kutunun açık olduğunu hesapla
    const BASE_BOXES = 4;
    let extraBoxes = 0;
    if (skillLevel >= 1) extraBoxes = 1; // +1 = 5. kutu
    if (skillLevel >= 2) extraBoxes = 2; // +2 = 6. kutu
    if (skillLevel >= 3) extraBoxes = 3; // +3/+4 = 7. kutu

    const unlockedBoxes = BASE_BOXES + extraBoxes;
    const TOTAL_BOXES_VISIBLE = 7; // Toplamda 7 kutu (4 base + 3 extra)

    // 3. Karakter verisindeki diziyi, toplam AÇIK kutu sayısına uydur
    // (Beceriniz artarsa, [false, false, false, false] dizisine yeni 'false'lar ekler)
    while (characterData.stress[trackName].length < unlockedBoxes) {
        characterData.stress[trackName].push(false);
    }
    // (Beceriniz azalırsa, fazla kutuları (ve içindeki 'true' değerini) sondan siler)
    while (characterData.stress[trackName].length > unlockedBoxes) {
        characterData.stress[trackName].pop();
    }

    // 4. Görünür 7 kutuyu oluştur
    for (let i = 0; i < TOTAL_BOXES_VISIBLE; i++) {
        const box = document.createElement('div');
        box.className = 'stress-box';
        
        // DEĞİŞTİ: Sayıları kaldırdık (box.textContent = i + 1; satırı silindi)

        if (i < unlockedBoxes) {
            // Kutu KİLİT DEĞİL (Açık)
            const isChecked = characterData.stress[trackName][i] || false;
            if (isChecked) {
                box.classList.add('checked');
            }
            
            // Dinleyiciyi sadece açık kutulara ekle
            box.addEventListener('click', async () => {
                // 'i' değerini (index) korumak için IIFE (fonk.) kullanıyoruz
                (async (index) => {
                    await handleStressClick(trackName, index);
                })(i);
            });

        } else {
            // Kutu KİLİTLİ (5, 6 veya 7. kutu)
            box.classList.add('disabled');
            box.title = `Bu kutuyu açmak için ${skillName} becerisi gerekli.`;
        }
        
        container.appendChild(box);
    }
}
// === ARAYÜZ (UI) GÜNCELLEME ===
function updateUIFromData() {
    if (!characterData) {
        console.error("updateUIFromData: characterData tanımsız!");
        return; 
    }
    
    // Veri modelini varsayılanla birleştir (eksik 'mildExtra' gibi alanlar için)
    const defaultData = getDefaultCharacter();
    characterData.skills = { ...defaultData.skills, ...characterData.skills };
    characterData.stress = { ...defaultData.stress, ...characterData.stress };
    characterData.consequences = { ...defaultData.consequences, ...characterData.consequences };

    charNameInput.value = characterData.name;
    charDescInput.value = characterData.description;
    charRefreshInput.value = characterData.refresh;
    charHighConceptInput.value = characterData.highConcept;
    charTroubleInput.value = characterData.trouble;
    charRelationshipInput.value = characterData.relationship;
    charAspect1Input.value = characterData.aspect1;
    charAspect2Input.value = characterData.aspect2;
    charFatePointsDisplay.textContent = characterData.currentFatePoints;
    
    FATE_SKILLS.forEach(skill => {
        const skillId = `skill-${skill.toLowerCase()}`;
        const inputElement = document.getElementById(skillId);
        if (inputElement) {
            inputElement.value = characterData.skills[skill] || 0;
        }
    });
    
    renderStunts();
    
    // DEĞİŞTİ: Stres ve Consequence'ları yeni kurallara göre güncelle
    createStressTrack(physicalStressTrack, 'physical');
    createStressTrack(mentalStressTrack, 'mental');
    renderExtraConsequences(); // Ekstra mild slotunu kontrol et
    
    consequenceMildInput.value = characterData.consequences.mild;
    consequenceModerateInput.value = characterData.consequences.moderate;
    consequenceSevereInput.value = characterData.consequences.severe;
    // (Ekstra mild slotu 'renderExtraConsequences' içinde dolduruluyor)

    updateRefreshAndStunts();
}
async function handleChangeFatePoints(amount) { 
    if (typeof amount !== 'number') {
        amount = (amount > 0) ? 1 : -1; 
    }

    let current = characterData.currentFatePoints;
    let refresh = characterData.refresh;
    current += amount;
    if (current < 0) current = 0;
    if (current > refresh && amount > 0) {
        await showModalAlert({ title: "Limit Aşıldı", message: "Fate Puanı, Refresh değerinden yüksek olamaz." });
        current = refresh;
    }
    characterData.currentFatePoints = current;
    await saveCharacter(); 
    
    charFatePointsDisplay.textContent = characterData.currentFatePoints;
}
// GÜNCELLENDİ: handleCharacterInputChange (Refresh/Stunt kuralı eklendi)
async function handleCharacterInputChange(event) {
    const id = event.target.id;
    let value = event.target.type === 'number' ? parseInt(event.target.value) || 0 : event.target.value;

    // === REFRESH/STUNT KONTROLÜ (Bu kısım aynı kalıyor) ===
    if (id === 'char-refresh') {
        const oldValue = characterData.refresh;
        
        if (value > 5) value = 5;
        if (value < 1) value = 1;
        event.target.value = value; 

        const newMaxStunts = 6 - value;
        const currentStunts = characterData.stunts.length;

        if (currentStunts > newMaxStunts) {
            await showModalAlert({
                title: "Kural İhlali",
                message: `Refresh'i ${value}'e düşüremezsiniz. Önce ${currentStunts - newMaxStunts} adet Stunt silmelisiniz.`
            });
            event.target.value = oldValue;
            return;
        }
        
        characterData.refresh = value;
        if (characterData.currentFatePoints > value) {
            characterData.currentFatePoints = value;
        }
    }
    // === KONTROL SONU ===

    const keyMap = {
        'char-name': 'name', 'char-desc': 'description',
        'char-high-concept': 'highConcept', 'char-trouble': 'trouble',
        'char-relationship': 'relationship',
        'char-aspect-1': 'aspect1', 'char-aspect-2': 'aspect2',
        'consequence-mild': 'consequences.mild',
        'consequence-moderate': 'consequences.moderate',
        'consequence-severe': 'consequences.severe',
        // DEĞİŞTİ: YENİ EKLENTİ
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
    
    if (id === 'char-refresh') {
        charFatePointsDisplay.textContent = characterData.currentFatePoints;
        updateRefreshAndStunts();
    }
}

// YENİ: Beceri Piramidini doğrulayan yardımcı fonksiyon
async function validateSkillPyramid(skills, changedSkill, newValue) {
    // Eğer 0'a çekiliyorsa her zaman izin ver
    if (newValue === 0) return true;

    // Yeni değeri hesaba katmadan önce mevcut sayımı yap
    const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
    Object.keys(skills).forEach(skill => {
        // Değiştirdiğimiz beceriyi sayma, onu yeni değeriyle ayrıca ele alacağız
        if (skill === changedSkill) return; 
        
        const level = skills[skill];
        if (level > 0 && level <= 4) {
            counts[level]++;
        }
    });

    // Şimdi yeni değeri ekle
    counts[newValue]++;
    
    // Limiti aşıp aşmadığını kontrol et
    if (counts[newValue] > SKILL_PYRAMID_LIMITS[newValue]) {
        // (Bunu yakında modal'a çevireceğiz)
        await showModalAlert({ title: "Piramit Kuralı İhlali", message: `Sadece ${SKILL_PYRAMID_LIMITS[newValue]} adet "+${newValue}" beceriye sahip olabilirsiniz.` });
        return false;
    }
    
    return true; // Limit aşılmadı
}

// GÜNCELLENDİ: 'populateSkillManager' (Artık 'select' menüsü oluşturuyor)
function populateSkillManager() {
    skillListContainer.innerHTML = "";
    const skillLevels = [
        { text: "+4", value: 4 },
        { text: "+3", value: 3 },
        { text: "+2", value: 2 },
        { text: "+1", value: 1 },
        { text: " 0", value: 0 }
    ];

    FATE_SKILLS.sort().forEach(skill => {
        const entry = document.createElement('div');
        entry.className = 'skill-entry';
        const skillId = `skill-${skill.toLowerCase()}`;
        
        const label = document.createElement('label');
        label.setAttribute('for', skillId);
        label.textContent = skill;
        
        // 'input' yerine 'select'
        const select = document.createElement('select');
        select.id = skillId;
        
        skillLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.value;
            option.textContent = level.text;
            select.appendChild(option);
        });

        select.value = characterData.skills[skill] || 0;
        
        // Olay dinleyicisini 'change' olarak güncelle
        select.addEventListener('change', (event) => handleSkillChange(skill, event)); 
        
        entry.appendChild(label);
        entry.appendChild(select);
        skillListContainer.appendChild(entry);
    });
}

// GÜNCELLENDİ: 'handleSkillInputChange' -> 'handleSkillChange' (Validasyon eklendi)
async function handleSkillChange(skillName, event) {
    const newValue = parseInt(event.target.value);
    const oldValue = characterData.skills[skillName] || 0;

    // 1. Piramiti kontrol et
    const isValid = await validateSkillPyramid(characterData.skills, skillName, newValue);

    if (isValid) {
        // 2. Geçerliyse, değeri güncelle
        characterData.skills[skillName] = newValue;
        
        // DEĞİŞTİ: Stres/Consequence Güncellemesini tetikle
        if (skillName === 'Physique') {
            // Fiziksel stres kutularını ve ekstra sonucu yeniden çiz
            createStressTrack(physicalStressTrack, 'physical');
            renderExtraConsequences();
        }
        if (skillName === 'Will') {
            // Zihinsel stres kutularını ve ekstra sonucu yeniden çiz
            createStressTrack(mentalStressTrack, 'mental');
            renderExtraConsequences();
        }
        
        // 3. Kaydet
        await saveCharacter();
        
        // 4. Zar atıcıdaki listeyi de güncelle
        populateSkillSelector(); 
    } else {
        // 5. Geçerli değilse, değişikliği geri al
        event.target.value = oldValue;
    }
}
function populateSkillSelector() {
    skillSelector.innerHTML = "";
    FATE_SKILLS.sort().forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
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
        rollLogList.innerHTML = "<li class='roll-log-item muted'>Henüz zar atılmadı.</li>";
        return;
    }
    rollHistory.forEach(log => {
        const li = document.createElement('li');
        li.className = 'roll-log-item';
        const totalText = (log.total > 0) ? `+${log.total}` : log.total;
        const diceText = (log.dice > 0) ? `+${log.dice}` : log.dice;
        const skillText = (log.skillVal > 0) ? `+${log.skillVal}` : log.skillVal;
        const fateSpentHTML = log.fateSpent 
            ? `<div class="log-item-details fate-spent">(Zar: ${diceText}, Beceri: ${skillText}, Fate Puanı harcandı!)</div>`
            : `<div class="log-item-details">(Zar: ${diceText}, Beceri: ${skillText})</div>`;
        li.innerHTML = `
            <div class="log-item-header">
                <span>${log.skill}</span>
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
    diceElements.forEach(die => {
        const roll = Math.floor(Math.random() * 3) - 1;
        diceTotal += roll;
        if (roll === 1) { die.textContent = '+'; die.className = 'die die-plus'; }
        else if (roll === -1) { die.textContent = '−'; die.className = 'die die-minus'; }
        else { die.textContent = '0'; die.className = 'die die-blank'; }
    });
    const selectedSkill = skillSelector.value;
    const modifier = characterData.skills[selectedSkill] || 0;
    const finalTotal = diceTotal + modifier;
    const descriptor = getDescriptor(finalTotal);
    resultDice.textContent = (diceTotal >= 0) ? `Zar: +${diceTotal}` : `Zar: ${diceTotal}`;
    resultSkill.textContent = (modifier >= 0) ? `Beceri: +${modifier}` : `Beceri: ${modifier}`;
    resultTotal.textContent = (finalTotal >= 0) ? `+${finalTotal}` : finalTotal;
    resultDescriptor.textContent = descriptor;
    const logEntry = {
        skill: selectedSkill, skillVal: modifier, dice: diceTotal,
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
        fateSpendButtons.style.display = 'flex'; // 'block' yerine 'flex'
    }
}
function getDescriptor(total) {
    if (total >= 8) return fateLadderDescriptors["8"];
    if (total <= -4) return fateLadderDescriptors["-4"];
    return fateLadderDescriptors[total.toString()] || (total > 8 ? "Efsanevi!" : "Çok Berbat!");
}
async function handleSpendFatePoint() { 
    if (characterData.currentFatePoints <= 0) {
        await showModalAlert({ title: "Yetersiz Puan", message: "Harcanacak Fate Puanın yok!" });
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
// YENİ: Fate Puanı ile Yeniden Atma
async function handleRerollClick() {
    if (characterData.currentFatePoints <= 0) {
        await showModalAlert({ title: "Yetersiz Puan", message: "Harcanacak Fate Puanın yok!" });
        return;
    }

    // 1. Puanı harca (Bu, saveCharacter'ı ve canlı güncellemeyi tetikler)
    // handleChangeFatePoints zaten asenkron olduğu için 'await' kullanıyoruz.
    await handleChangeFatePoints(-1);
    
    // 2. Yeniden zar at (Bu, butonları gizleyip animasyonu başlatacak)
    handleRollClick();
}

// === İÇE/DIŞA AKTARMA VE SIFIRLAMA ===
function handleExportCharacter() {
    const dataStr = JSON.stringify(characterData, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = characterData.name.trim().replace(/\s+/g, '_') || 'fate_karakteri';
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
function handleImportClick() {
    importFileInput.click();
}
function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && importedData.skills) {
                detachAllListeners();
                localStorage.removeItem('fateActiveCampaignId');
                localStorage.removeItem('fateActiveCharacterName');
                localStorage.setItem('fateCampaignStatus', 'offline');
                showCampaignStatus('offline');
                
                characterData = { ...getDefaultCharacter(), ...importedData };
                saveCharacter(); 
                updateUIFromData();
                await showModalAlert({ title: "Başarılı", message: "Karakter başarıyla yüklendi! (Canlı oyun bağlantısı kesildi)" });
                switchView('char');
            } else {
                await showModalAlert({ title: "Hata", message: "Hata: Geçersiz karakter dosyası." });
            }
        } catch (error) {
            console.error("Dosya okunurken hata:", error);
            await showModalAlert({ title: "Hata", message: "Hata: Dosya okunurken bir sorun oluştu. JSON formatında olduğundan emin olun." });
        }
    };
    reader.readAsText(file);
    event.target.value = null;
}
async function handleResetCharacter() {
    const isSure = await showModalConfirm({ title: "Onay Gerekli", message: "UYARI: Bu işlem mevcut karakterinizi tamamen sıfırlayacak. Emin misiniz? (Canlı oyun bağlantınız varsa kesilecektir)" });
    if (isSure) {
        detachAllListeners();
        localStorage.removeItem('fateActiveCampaignId');
        localStorage.removeItem('fateActiveCharacterName');
        localStorage.setItem('fateCampaignStatus', 'offline');
        showCampaignStatus('offline');

        characterData = getDefaultCharacter();
        saveCharacter(); 
        updateUIFromData();
        await showModalAlert({ title: "Başarılı", message: "Karakter sıfırlandı." });
        switchView('char');
    }
}


// === SAYFA BAŞLATMA ===
document.addEventListener('DOMContentLoaded', () => {
    
    const savedTheme = localStorage.getItem('fateTheme') || 'dark';
    setTheme(savedTheme);
    
    loadCharacter(); 
    loadCampaign(); 

    populateSkillManager();
    populateSkillSelector();
    updateUIFromData(); 
    
    renderRollLog();

    // Olay Dinleyicileri
    
    burgerToggle.addEventListener('click', toggleBurgerMenu);
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchView(button.dataset.view);
        });
    });
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

    leaveCampaignButton.addEventListener('click', handleLeaveCampaign);
    // YENİ:
    editCampaignButton.addEventListener('click', handleEditCampaignClick);
    // YENİ: Kampanya Silme Butonu
    deleteCampaignButton.addEventListener('click', handleDeleteCampaign);
    
    // YENİ: Modal Buton Dinleyicileri
    modalConfirmButton.addEventListener('click', handleModalConfirm);
    modalCancelButton.addEventListener('click', handleModalCancel);
    modalOverlay.addEventListener('click', (e) => {
        // Sadece dışarıdaki gri alana tıklanırsa kapat
        if (e.target === modalOverlay) {
            handleModalCancel();
        }
    });


    const charInputsToTrack = [
        charNameInput, charDescInput, charRefreshInput,
        charHighConceptInput, charTroubleInput,
        charRelationshipInput, charAspect1Input, charAspect2Input,
        consequenceMildInput, consequenceModerateInput, consequenceSevereInput
    ];
    charInputsToTrack.forEach(input => {
        input.addEventListener('input', handleCharacterInputChange); 
    });

    exportCharButton.addEventListener('click', handleExportCharacter);
    importCharButton.addEventListener('click', handleImportClick);
    importFileInput.addEventListener('change', handleImportFile);
    resetCharButton.addEventListener('click', handleResetCharacter);
    newCampaignPlayersInput.addEventListener('change', handleCampaignPlayerInputValidation);
    
    // --- CANLI ARKA PLAN HAREKETİ ---
    
    const moveFactor = 0.05; 

    function handleBackgroundMove(e) {
        document.body.classList.remove('bg-is-resetting');

        const xPercent = e.clientX / window.innerWidth;
        const yPercent = e.clientY / window.innerHeight;
        
        const bgX = 50 + (xPercent - 0.5) * (moveFactor * 100);
        const bgY = 50 + (yPercent - 0.5) * (moveFactor * 100);

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

    // ------------------------------------
    
    switchView('char');
});