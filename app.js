// === VERİ ===
const FATE_SKILLS = [
    "Athletics", "Burglary", "Contacts", "Crafts", "Deceive", "Drive",
    "Empathy", "Fight", "Investigate", "Lore", "Notice", "Physique",
    "Provoke", "Rapport", "Resources", "Shoot", "Stealth", "Will"
];

const fateLadderDescriptors = {
    "8": "Efsanevi!", "7": "Olağanüstü!", "6": "Muazzam!", "5": "Süper!",
    "4": "Mükemmel!", "3": "Harika!", "2": "Güzel!", "1": "İyi",
    "0": "Sıradan", "-1": "Zayıf", "-2": "Kötü", "-3": "Berbat!",
    "-4": "Çok Berbat!"
};

// Ana Karakter Veri Objesi
let characterData = {};
// Kampanya Veri Objesi
let campaignData = {};
// Zar Geçmişi için Global Dizi
let rollHistory = [];

// GÜNCELLENDİ: Varsayılan boş karakter yapısı
function getDefaultCharacter() {
    const defaultSkills = {};
    FATE_SKILLS.forEach(skill => {
        defaultSkills[skill] = 0;
    });

    return {
        name: "", description: "", refresh: 3,
        highConcept: "", trouble: "",
        relationship: "", // YENİ
        aspect1: "",      // YENİ
        aspect2: "",      // YENİ
        skills: defaultSkills,
        stunts: [],
        stress: { physical: [false, false, false, false], mental: [false, false, false, false] },
        consequences: { mild: "", moderate: "", severe: "" }
    };
}

// Varsayılan boş kampanya yapısı
function getDefaultCampaign() {
    return {
        campaignName: "",
        gmFatePoints: 1,
        situationAspects: []
    };
}


// === HTML ELEMENTLERİ ===
// Menü ve Navigasyon
const burgerMenu = document.getElementById('burger-menu');
const burgerToggle = document.getElementById('burger-toggle');
const mainContentWrapper = document.getElementById('main-content-wrapper');
const navButtons = document.querySelectorAll('.nav-button');
const allViews = document.querySelectorAll('.tab-content');

// Tema Değiştirme
const themeToggleButton = document.getElementById('theme-toggle-button');

// Karakter Sayfası Elementleri
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
const physicalStressTrack = document.getElementById('physical-stress-track');
const mentalStressTrack = document.getElementById('mental-stress-track');
const consequenceMildInput = document.getElementById('consequence-mild');
const consequenceModerateInput = document.getElementById('consequence-moderate');
const consequenceSevereInput = document.getElementById('consequence-severe');

// Zar Atıcı Elementleri
const rollButton = document.getElementById('roll-button');
const diceElements = document.querySelectorAll('.die');
const skillSelector = document.getElementById('skill-selector');
const resultDice = document.getElementById('result-dice');
const resultSkill = document.getElementById('result-skill');
const resultTotal = document.getElementById('result-total');
const resultDescriptor = document.getElementById('result-descriptor');
const rollLogList = document.getElementById('roll-log-list');

// Kampanya Elementleri
const campaignNameInput = document.getElementById('campaign-name');
const gmFatePointsInput = document.getElementById('gm-fate-points');
const situationAspectList = document.getElementById('situation-aspect-list');
const situationAspectInput = document.getElementById('situation-aspect-input');
const addSituationAspectButton = document.getElementById('add-situation-aspect-button');

// İçe/Dışa Aktar Elementleri
const exportCharButton = document.getElementById('export-char-button');
const importCharButton = document.getElementById('import-char-button');
const importFileInput = document.getElementById('import-file-input');
const resetCharButton = document.getElementById('reset-char-button');

// Animasyon Değişkenleri
let animationInterval = null;
const ANIMATION_DURATION = 600;
const ANIMATION_FLICKER_RATE = 50;


// === VERİ YÖNETİMİ (localStorage) ===
function saveCharacter() {
    try {
        localStorage.setItem('fateCharacterData', JSON.stringify(characterData));
    } catch (e) {
        console.error("Karakter kaydedilemedi:", e);
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
            characterData.stress.physical = (characterData.stress.physical || defaultData.stress.physical).slice(0, defaultData.stress.physical.length);
            characterData.stress.mental = (characterData.stress.mental || defaultData.stress.mental).slice(0, defaultData.stress.mental.length);
        } catch (e) {
            console.error("Kayıtlı veri okunamadı, varsayılana dönülüyor:", e);
            characterData = defaultData;
        }
    } else {
        characterData = defaultData;
    }
}

// Kampanya Veri Yönetimi
function saveCampaign() {
    try {
        localStorage.setItem('fateCampaignData', JSON.stringify(campaignData));
    } catch (e) {
        console.error("Kampanya kaydedilemedi:", e);
    }
}
function loadCampaign() {
    const savedData = localStorage.getItem('fateCampaignData');
    const defaultData = getDefaultCampaign();
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            campaignData = { ...defaultData, ...parsedData };
        } catch (e) {
            console.error("Kayıtlı kampanya okunamadı, varsayılana dönülüyor:", e);
            campaignData = defaultData;
        }
    } else {
        campaignData = defaultData;
    }
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

    // 900px, CSS'teki breakpoint ile aynı olmalı
    if (window.innerWidth <= 900 && document.body.classList.contains('menu-is-open')) {
        toggleBurgerMenu();
    }
}


// === STUNT (YETENEK) YÖNETİMİ ===
function renderStunts() {
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
        removeButton.addEventListener('click', () => {
            handleRemoveStunt(index);
        });
        li.appendChild(p);
        li.appendChild(removeButton);
        stuntListUl.appendChild(li);
    });
}
function handleAddStunt() {
    const stuntText = stuntInput.value.trim();
    if (stuntText) {
        characterData.stunts.push(stuntText);
        saveCharacter();
        renderStunts();
        stuntInput.value = "";
    }
}
function handleRemoveStunt(index) {
    characterData.stunts.splice(index, 1);
    saveCharacter();
    renderStunts();
}

// === KAMPANYA ASPEKT YÖNETİMİ ===
function renderSituationAspects() {
    situationAspectList.innerHTML = "";
    if (!campaignData.situationAspects || campaignData.situationAspects.length === 0) {
        situationAspectList.innerHTML = "<li class='stunt-list-item muted'>Henüz durum aspekti eklenmemiş.</li>";
        return;
    }
    campaignData.situationAspects.forEach((aspectText, index) => {
        const li = document.createElement('li');
        li.className = 'stunt-list-item';
        const p = document.createElement('p');
        p.textContent = aspectText;
        const removeButton = document.createElement('button');
        removeButton.className = 'btn btn-danger-outline';
        removeButton.textContent = 'X';
        removeButton.title = "Aspekti Sil";
        removeButton.addEventListener('click', () => {
            handleRemoveSituationAspect(index);
        });
        li.appendChild(p);
        li.appendChild(removeButton);
        situationAspectList.appendChild(li);
    });
}
function handleAddSituationAspect() {
    const aspectText = situationAspectInput.value.trim();
    if (aspectText) {
        campaignData.situationAspects.push(aspectText);
        saveCampaign();
        renderSituationAspects();
        situationAspectInput.value = "";
    }
}
function handleRemoveSituationAspect(index) {
    campaignData.situationAspects.splice(index, 1);
    saveCampaign();
    renderSituationAspects();
}


// === STRES YÖNETİMİ ===
function createStressTrack(container, trackName, size) {
    container.innerHTML = "";
    for (let i = 0; i < size; i++) {
        const box = document.createElement('div');
        box.className = 'stress-box';
        box.textContent = i + 1;
        if (characterData.stress[trackName][i]) {
            box.classList.add('checked');
        }
        box.addEventListener('click', () => {
            handleStressClick(trackName, i);
        });
        container.appendChild(box);
    }
}
function handleStressClick(trackName, index) {
    characterData.stress[trackName][index] = !characterData.stress[trackName][index];
    saveCharacter();
    const trackContainer = (trackName === 'physical') ? physicalStressTrack : mentalStressTrack;
    const box = trackContainer.children[index];
    box.classList.toggle('checked', characterData.stress[trackName][index]);
}

// === ARAYÜZ (UI) GÜNCELLEME ===
function updateUIFromData() {
    // --- Karakter ---
    charNameInput.value = characterData.name;
    charDescInput.value = characterData.description;
    charRefreshInput.value = characterData.refresh;
    charHighConceptInput.value = characterData.highConcept;
    charTroubleInput.value = characterData.trouble;
    charRelationshipInput.value = characterData.relationship;
    charAspect1Input.value = characterData.aspect1;
    charAspect2Input.value = characterData.aspect2;
    
    FATE_SKILLS.forEach(skill => {
        const skillId = `skill-${skill.toLowerCase()}`;
        const inputElement = document.getElementById(skillId);
        if (inputElement) {
            inputElement.value = characterData.skills[skill] || 0;
        }
    });
    renderStunts();
    createStressTrack(physicalStressTrack, 'physical', characterData.stress.physical.length);
    createStressTrack(mentalStressTrack, 'mental', characterData.stress.mental.length);
    consequenceMildInput.value = characterData.consequences.mild;
    consequenceModerateInput.value = characterData.consequences.moderate;
    consequenceSevereInput.value = characterData.consequences.severe;

    // --- Kampanya ---
    campaignNameInput.value = campaignData.campaignName;
    gmFatePointsInput.value = campaignData.gmFatePoints;
    renderSituationAspects();
}
// Karakter girdilerini yönetir
function handleCharacterInputChange(event) {
    const id = event.target.id;
    const value = event.target.type === 'number' ? parseInt(event.target.value) || 0 : event.target.value;
    const keyMap = {
        'char-name': 'name', 'char-desc': 'description', 'char-refresh': 'refresh',
        'char-high-concept': 'highConcept', 'char-trouble': 'trouble',
        'char-relationship': 'relationship',
        'char-aspect-1': 'aspect1',
        'char-aspect-2': 'aspect2',
        'consequence-mild': 'consequences.mild',
        'consequence-moderate': 'consequences.moderate',
        'consequence-severe': 'consequences.severe',
    };
    const key = keyMap[id];
    if (key) {
        if (key.includes('.')) {
            const keys = key.split('.');
            characterData[keys[0]][keys[1]] = value;
        } else {
            characterData[key] = value;
        }
        saveCharacter();
    }
}
function handleSkillInputChange(skillName, event) {
    const value = parseInt(event.target.value) || 0;
    characterData.skills[skillName] = value;
    saveCharacter();
}
// Kampanya girdilerini yönetir
function handleCampaignInputChange(event) {
    const id = event.target.id;
    const value = event.target.type === 'number' ? parseInt(event.target.value) || 0 : event.target.value;
    if (id === 'campaign-name') {
        campaignData.campaignName = value;
    } else if (id === 'gm-fate-points') {
        campaignData.gmFatePoints = value;
    }
    saveCampaign();
}


// === ZAR ATICI VE BECERİ LİSTESİ FONKSİYONLARI ===
function populateSkillManager() {
    skillListContainer.innerHTML = "";
    FATE_SKILLS.sort().forEach(skill => {
        const entry = document.createElement('div');
        entry.className = 'skill-entry';
        const skillId = `skill-${skill.toLowerCase()}`;
        const label = document.createElement('label');
        label.setAttribute('for', skillId);
        label.textContent = skill;
        const input = document.createElement('input');
        input.type = 'number';
        input.id = skillId;
        input.value = characterData.skills[skill] || 0;
        input.min = "-2"; input.max = "8";
        input.addEventListener('change', (event) => handleSkillInputChange(skill, event));
        entry.appendChild(label);
        entry.appendChild(input);
        skillListContainer.appendChild(entry);
    });
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
        li.innerHTML = `
            <div class="log-item-header">
                <span>${log.skill}</span>
                <span class="log-item-total">${totalText}</span>
            </div>
            <div class="log-item-desc">${log.desc}</div>
            <div class="log-item-details">(Zar: ${diceText}, Beceri: ${skillText})</div>
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
        total: finalTotal, desc: descriptor
    };
    rollHistory.unshift(logEntry);
    if (rollHistory.length > 20) {
        rollHistory.pop();
    }
    renderRollLog();
}
function getDescriptor(total) {
    if (total >= 8) return fateLadderDescriptors["8"];
    if (total <= -4) return fateLadderDescriptors["-4"];
    return fateLadderDescriptors[total.toString()] || (total > 8 ? "Efsanevi!" : "Çok Berbat!");
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
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && importedData.skills) {
                characterData = { ...getDefaultCharacter(), ...importedData };
                saveCharacter();
                updateUIFromData();
                alert('Karakter başarıyla yüklendi!');
                switchView('char');
            } else {
                alert('Hata: Geçersiz karakter dosyası.');
            }
        } catch (error) {
            console.error("Dosya okunurken hata:", error);
            alert('Hata: Dosya okunurken bir sorun oluştu. JSON formatında olduğundan emin olun.');
        }
    };
    reader.readAsText(file);
    event.target.value = null;
}
function handleResetCharacter() {
    const isSure = confirm("UYARI: Bu işlem mevcut karakterinizi tamamen sıfırlayacak. Emin misiniz?");
    if (isSure) {
        characterData = getDefaultCharacter();
        saveCharacter();
        updateUIFromData();
        alert('Karakter sıfırlandı.');
        switchView('char');
    }
}


// === SAYFA BAŞLATMA ===
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Tema ve Verileri Yükle
    const savedTheme = localStorage.getItem('fateTheme') || 'dark';
    setTheme(savedTheme);
    loadCharacter();
    loadCampaign();

    // 2. HTML Listelerini Doldur
    populateSkillManager();
    populateSkillSelector();

    // 3. Arayüzü Yüklenen Verilerle Doldur
    updateUIFromData();
    renderRollLog();

    // 4. Olay Dinleyicilerini Ata
    
    // Burger Menü ve Navigasyon
    burgerToggle.addEventListener('click', toggleBurgerMenu);
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchView(button.dataset.view);
        });
    });

    // Tema Değiştirme
    themeToggleButton.addEventListener('click', toggleTheme);

    // Zar Atıcı
    rollButton.addEventListener('click', handleRollClick);

    // Stunt Ekleme (Karakter)
    addStuntButton.addEventListener('click', handleAddStunt);
    stuntInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddStunt();
    });

    // Stunt Ekleme (Kampanya)
    addSituationAspectButton.addEventListener('click', handleAddSituationAspect);
    situationAspectInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddSituationAspect();
    });

    // Karakter Girdileri
    const charInputsToTrack = [
        charNameInput, charDescInput, charRefreshInput,
        charHighConceptInput, charTroubleInput,
        charRelationshipInput, charAspect1Input, charAspect2Input,
        consequenceMildInput, consequenceModerateInput, consequenceSevereInput
    ];
    charInputsToTrack.forEach(input => {
        input.addEventListener('input', handleCharacterInputChange);
    });

    // Kampanya Girdileri
    campaignNameInput.addEventListener('input', handleCampaignInputChange);
    gmFatePointsInput.addEventListener('input', handleCampaignInputChange);

    // İçe/Dışa Aktar Butonları
    exportCharButton.addEventListener('click', handleExportCharacter);
    importCharButton.addEventListener('click', handleImportClick);
    importFileInput.addEventListener('change', handleImportFile);
    resetCharButton.addEventListener('click', handleResetCharacter);
    
    // Başlangıç görünümünü ayarla
    switchView('char');
});