# FATE RYO Test Aracı (faterollerdenemesi)

[![Durum: Public Beta](https://img.shields.io/badge/status-public_beta-yellow.svg)](https://hazreti-ozay.github.io/faterollerdenemesi/)
[![Katkı: Açık](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/hazreti-ozay/faterollerdenemesi/blob/main/CONTRIBUTING.md)

FATE RYO sistemi için Firebase destekli web aracı; D&D dışı sistemler için modern, açık kaynaklı bir platformun ilk adımı. (Public Beta!)

**🇬🇧 English:** A Firebase-powered web tool for the FATE RPG system; the first step in a modern, open-source platform for non-D&D systems. (Public Beta!)

---

## ⚠️ Durum: Public Beta (Aktif Geliştirme)

Bu proje şu anda **aktif geliştirme ve test (Beta)** aşamasındadır. Sistem canlı olarak test edilebilir durumdadır, ancak beklenmedik hatalarla (bug) karşılaşabilirsiniz veya veri kaybı yaşanabilir.

Lütfen bulduğunuz hataları [Issues](https://github.com/hazreti-ozay/faterollerdenemesi/issues) sekmesinden raporlayın!

🔗 **CANLI TEST LİNKİ:** [**https://hazreti-ozay.github.io/faterollerdenemesi/**](https://hazreti-ozay.github.io/faterollerdenemesi/)

## 🎯 Projenin Amacı ve Vizyonu

Bu projenin nihai vizyonu, **D&D Beyond'un Dungeons & Dragons için sunduğu entegre ve modern deneyimi, FATE gibi (D&D harici) diğer harika FRP sistemleri için de sağlayabilmektir.**

Bu araç, o vizyonun ilk adımıdır ve FATE sistemi üzerine odaklanmıştır.

## 🔥 Temel Özellikler (Mevcut Sürüm)

Projenin şu anki sürümü aşağıdaki işlevleri tam olarak desteklemektedir:

### 🧑‍⚖️ GM (Game Master) için:
* **Kampanya Yönetimi:** Yeni FATE kampanyaları oluşturun (Setting, Lore, Kişi Sayısı vb. detaylarla), mevcut kampanyaları düzenleyin veya silin.
* **GM Yönetim Paneli:** Şifre korumalı özel GM paneline erişim.
* **Başvuru Yönetimi:** Oyuncuların kampanyanıza gönderdiği karakter başvurularını inceleyin, "Onayla" veya "Reddet".
* **Canlı Oyuncu Takibi:** Onaylanmış oyuncularınızın anlık **Stres** ve **Kader Puanı (Fate Point)** durumlarını canlı olarak izleyin.
* **Detaylı Karakter İncelemesi:** Genişletilebilir (expandable) kartlar ile oyuncuların tüm karakter detaylarına (Aspektler, Beceriler, Stunt'lar) erişin.
* **Oyuncu Yönetimi:** Onaylanmış oyuncuları kampanyadan "Atın" (Oyuncu sayacı anlık güncellenir).
* **Canlı Durum Aspektleri:** GM panelinden eklediğiniz "Durum Aspektleri" anlık olarak oyuncunun zar atıcısına yansır.

### 🧙 Oyuncu için:
* **Kampanya Lobisi:** Mevcut tüm kampanyaları "vitrin" kartları olarak listeleyin. Dolu kampanyalara başvuru kilitlenir.
* **Karakter Yaratma:** FATE kurallarına uygun karakterler yaratın (`validateSkillPyramid` dahil).
* **Başvuru Sistemi:** Yarattığınız karakteri (tarayıcı hafızasından) bir kampanyaya gönderin.
* **"Canlı Mod" (Live Mode):** GM tarafından onaylandığınızda, karakter sayfanız otomatik olarak "Canlı Mod"a geçer.
* **Anlık Güncelleme:** "Canlı Mod"da yaptığınız tüm değişiklikler (Stres almak, Kader Puanı harcamak) anında Firebase'e yazılır ve GM panelinde görünür.
* **Entegre Zar Atıcı:** "Yeniden At (Reroll)" mekaniğini destekleyen zar atıcı.
* **Oyundan Ayrılma:** Dilediğiniz zaman kampanyadan ayrılarak karakterinizi "Lokal Mod"a geri döndürün.

## 🛠️ Kullanılan Teknolojiler (Tech Stack)

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Backend & Database:** Firebase (Firestore) - (Anlık veri akışı için `onSnapshot` aktif olarak kullanılmaktadır)
* **Deployment:** GitHub Pages

## 🚀 Kurulum (Yerel (Local) Geliştirme İçin)

Projeyi kendi bilgisayarınızda çalıştırmak ve geliştirmek için:

1.  Bu repoyu klonlayın:
    ```bash
    git clone [https://github.com/hazreti-ozay/faterollerdenemesi.git](https://github.com/hazreti-ozay/faterollerdenemesi.git)
    ```
2.  Dizine gidin:
    ```bash
    cd faterollerdenemesi
    ```
3.  `app.js` (veya ilgili config) dosyasını açın ve kendi Firebase proje bilgilerinizi (apiKey, authDomain, vb.) içeren `firebaseConfig` nesnesini güncelleyin.
4.  `index.html` dosyasını tarayıcınızda açın.

## 🗺️ Yol Haritası (Roadmap)

Projenin stabilizasyonu ve geleceği için planlanan sıradaki adımlar:

* ✅ **Modal Entegrasyonu:** Tüm yerel `alert/confirm` pencereleri özel modal sistemi ile değiştirildi.
* ⏳ **"Anlık Onay" UX İyileştirmesi:** Oyuncunun, başvurusu onaylandığında sayfayı yenilemeden "Canlı Mod"a geçmesi.
* ⏳ **Çoklu Karakter Desteği:** `localStorage` yapısının tek karakterden, çoklu karakter listesine (`fateCharacterList`) dönüştürülmesi.
* ⏳ **Yeni FATE Kuralları:** Belirlenecek yeni kompleks kuralların entegrasyonu.
* ✨ **Gelecek Vizyonu:** Diğer (D&D dışı) FRP sistemleri için modüllerin eklenmesi.

## 🤝 Katkıda Bulunma (Contributing)

Bu proje topluluk odaklıdır ve her türlü katkıya açıktır!

* **Hata Raporlama:** Lütfen [Issues](https://github.com/hazreti-ozay/faterollerdenemesi/issues) sekmesini kullanın.
* **Kod Katkısı:** Projenin kod tabanına (codebase) aktif olarak katkı sağlamak isterseniz, lütfen öncelikle [**CONTRIBUTING.md**](httpsT://github.com/hazreti-ozay/faterollerdenemesi/blob/main/CONTRIBUTING.md) dosyasını okuyun ve benimle (veya proje sahibiyle) iletişime geçin.
* **Davranış Kuralları:** Lütfen [**CODE_OF_CONDUCT.md**](httpsS://github.com/hazreti-ozay/faterollerdenemesi/blob/main/CODE_OF_CONDUCT.md) dosyasını inceleyin.

## 📄 Lisans

Proje şu anda aktif geliştirme ve test aşamasındadır. Stabil sürüme geçildiğinde bir açık kaynak lisansı (örn: MIT) eklenecektir.
