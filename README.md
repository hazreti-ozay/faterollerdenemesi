# 🎲 FATE RYO Test Aracı (faterollerdenemesi) v0.2

> **FATE RYO sistemi için Firebase destekli web aracı; D&D dışı sistemler için modern, açık kaynaklı bir platformun ilk adımı.** (Public Beta!)

[![Status](https://img.shields.io/badge/Status-Public%20Beta%20v0.2-orange)](https://hazreti-ozay.github.io/faterollerdenemesi/)
[![Tech](https://img.shields.io/badge/Tech-JS%20%7C%20Firebase%20%7C%20HTML5-blue)]()
[![License](https://img.shields.io/badge/License-Open%20Source-green)]()

🇬🇧 **English:** A Firebase-powered web tool for the FATE RPG system; the first step in a modern, open-source platform for non-D&D systems. (Public Beta!)

🔗 **CANLI TEST LİNKİ:** [https://hazreti-ozay.github.io/faterollerdenemesi/](https://hazreti-ozay.github.io/faterollerdenemesi/)

---

## 🔥 v0.2 İle Gelen Yenilikler (Yeni!)

Bu güncelleme ile platform sadece bir karakter kağıdı olmaktan çıkıp, yaşayan bir oyun masasına dönüştü.

* 🎮 **Oyun Modu (Game Mode):** Karakter yaratma ekranı bitti mi? **Gamepad ikonuna** tıklayın ve sadece oyun sırasında ihtiyacınız olan (Zar, Stres, Aspect) kompakt ızgara (grid) görünümüne geçin.
* 🌍 **Çoklu Dil Desteği:** Platform artık **Türkçe** ve **İngilizce** seçeneklerine sahip.
* 🔗 **Gelişmiş Kampanya Sistemi:** GM'ler artık kampanyalarına özel **Yetenek (Skill) Listeleri** oluşturabilir. Oyuncular kampanyaya bağlandığında karakter kağıtları otomatik olarak o oyunun kurallarına göre güncellenir.
* ⚡ **Firebase Optimizasyonu:** Canlı modda veri işleme mantığı yeniden yazıldı. Artık sunucu şişmesi veya lag olmadan anlık değişiklik yapabilirsiniz.
* 📝 **Hızlı Notlar:** Oyun sırasında siteyi terk etmeden alabileceğiniz, kalıcı stick-note (yapışkan not) sistemi eklendi.

---

## ⚠️ Durum: Public Beta (Aktif Geliştirme)

Bu proje şu anda **aktif geliştirme ve test (Beta)** aşamasındadır. Sistem canlı olarak testilebilir durumdadır, ancak beklenmedik hatalarla (bug) karşılaşabilirsiniz veya veri kaybı yaşanabilir.

> **Önemli:** Verilerinizi kaybetmemek için düzenli olarak **"Araçlar > Dışa Aktar"** seçeneğini kullanın.
> Lütfen bulduğunuz hataları [Issues](https://github.com/hazreti-ozay/faterollerdenemesi/issues) sekmesinden raporlayın!

---

## 🎯 Projenin Amacı ve Vizyonu

Bu projenin nihai vizyonu, **D&D Beyond**'un Dungeons & Dragons için sunduğu entegre ve modern deneyimi, FATE gibi (D&D harici) diğer harika FRP sistemleri için de sağlayabilmektir.
Bu araç, o vizyonun ilk adımıdır ve FATE sistemi üzerine odaklanmıştır.

---

## 🚀 Temel Özellikler (Mevcut Sürüm)

Projenin şu anki sürümü aşağıdaki işlevleri tam olarak desteklemektedir:

### 🧑‍⚖️ GM (Game Master) için:

* **Gelişmiş Kampanya Yönetimi:** Yeni FATE kampanyaları oluşturun (Setting, Lore, Kişi Sayısı). **YENİ:** Kampanyanıza özel **Skill Set (Yetenek Listesi)** tanımlayın ve oyuncularınızı bu kurallara göre oynatın.
* **GM Yönetim Paneli:** Şifre korumalı özel GM paneline erişim.
* **GM Kader Puanı Takibi:** GM paneline, GM'in kendi Fate Puanlarını (+/-) takip etmesi ve kaydetmesi için sayaç eklendi.
* **Başvuru Yönetimi:** Oyuncuların kampanyanıza gönderdiği karakter başvurularını inceleyin, "Onayla" veya "Reddet".
* **Canlı Oyuncu Takibi:** Onaylanmış oyuncularınızın anlık **Stres** ve **Kader Puanı (Fate Point)** durumlarını canlı olarak izleyin.
* **Detaylı Karakter İncelemesi:** Genişletilebilir (expandable) kartlar ile oyuncuların tüm karakter detaylarına (Aspektler, Beceriler, Stunt'lar) erişin.
* **Oyuncu Yönetimi:** Onaylanmış oyuncuları kampanyadan "Atın" (Oyuncu sayacı anlık güncellenir).
* **Canlı Durum Aspektleri:** GM panelinden eklediğiniz "Durum Aspektleri" anlık olarak oyuncunun zar atıcısına yansır.

### 🧙 Oyuncu için:

* **Oyun Modu (Game Mode):** Kampanyaya bağlandıktan sonra (veya bağımsız olarak) **Gamepad** ikonuna tıklayarak dikkatinizi dağıtmayan kompakt görünüme geçin.
* **Entegre Zar Atıcı:** Oyun modunda karakter kağıdının altına sabitlenen panel ile sayfa değiştirmeden zar atın. ("Yeniden At" ve "+2 Ekle" destekli).
* **Dinamik Skill Yönetimi:** Bir kampanyaya bağlandığınızda karakteriniz otomatik olarak GM'in belirlediği skill listesine güncellenir.
* **Çoklu Karakter Yönetimi:** `localStorage`'da birden fazla karakter saklama. Karakterler arası geçiş (dropdown menü), yeni karakter ekleme (+) ve aktif karakteri silme özellikleri.
* **FATE Core Kural Uyumlu Karakter Yaratma:** `validateSkillPyramid` (Beceri Piramidi) doğrulaması, Dinamik Stres Kutuları (Physique/Will'e göre) ve Dinamik Consequence Slotları (+4 beceriye göre).
* **Canlı Mod (Live Mode):** GM tarafından onaylandığınızda, karakter sayfanız otomatik olarak senkronize olur. Yaptığınız değişiklikler (Stres, Fate Puanı) anında GM ekranına düşer.
* **Anlık Bildirimler:** GM onayı, reddi veya oyundan atılma durumunda sayfayı yenilemeden bildirim alma.
* **Notlar:** Oyun içi notlarınızı alabileceğiniz kalıcı not alanı.

---

## 🛠️ Kullanılan Teknolojiler (Tech Stack)

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Backend & Database:** Firebase (Firestore) - (Anlık veri akışı için `onSnapshot` aktif olarak kullanılmaktadır)
* **Deployment:** GitHub Pages

---

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
3.  `app.js` (veya ilgili config) dosyasını açın ve kendi Firebase proje bilgilerinizi (`apiKey`, `authDomain`, vb.) içeren `firebaseConfig` nesnesini güncelleyin.
4.  `index.html` dosyasını tarayıcınızda açın.

---

## 🗺️ Yol Haritası (Roadmap)

Projenin stabilizasyonu ve geleceği için planlanan sıradaki adımlar:

* ✅ **Modal Entegrasyonu:** Tüm yerel `alert/confirm` pencereleri özel modal sistemi ile değiştirildi.
* ✅ **FATE Core Kural Entegrasyonu:** Dinamik Stres ve Consequence mekanikleri eklendi.
* ✅ **Çoklu Karakter Desteği:** `localStorage` yapısı çoklu karakter listesine dönüştürüldü.
* ✅ **v0.2 Güncellemesi:** Kampanya Skill Yönetimi, Oyun Modu Arayüzü ve Dil Desteği eklendi.
* ✨ **Gelecek Vizyonu:** Karakter görselleri (Avatar) yükleme desteği ve diğer (D&D dışı) FRP sistemleri için modüller.

---

## 🤝 Katkıda Bulunma (Contributing)

Bu proje topluluk odaklıdır ve her türlü katkıya açıktır!

* **Hata Raporlama:** Lütfen [Issues](https://github.com/hazreti-ozay/faterollerdenemesi/issues) sekmesini kullanın.
* **Kod Katkısı:** Projenin kod tabanına (codebase) aktif olarak katkı sağlamak isterseniz, lütfen öncelikle `CONTRIBUTING.md` dosyasını okuyun ve benimle iletişime geçin.
* **Davranış Kuralları:** Lütfen `CODE_OF_CONDUCT.md` dosyasını inceleyin.

---

## 📄 Lisans

MIT License

Copyright (c) 2026 OziDev

---
*Developed with ❤️ by OziDev for Cemiyet-i Perdaz.*
