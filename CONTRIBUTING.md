# Projeye Katkı Rehberi (Contributing)

Öncelikle, [FATE RYO Test Aracı](https://github.com/hazreti-ozay/faterollerdenemesi) projesine katkıda bulunmayı düşündüğünüz için teşekkür ederiz! 🎉

Bu proje, topluluk desteğiyle büyümeyi hedefleyen açık kaynaklı bir girişimdir. Her katkı (küçük bir yazım hatasının düzeltilmesi veya yeni bir dil desteği bile olsa) bizim için çok değerlidir.

Lütfen katkıda bulunmadan önce [Davranış Kurallarımızı (Code of Conduct)](CODE_OF_CONDUCT.md) okuduğunuzdan emin olun.

## 🤝 Nasıl Katkıda Bulunabilirim?

Katkıda bulunmanın birçok yolu var:

### 1. 🌍 Çeviri ve Dil Desteği (YENİ!)
v0.2 sürümüyle birlikte çoklu dil altyapısına geçtik. Eğer projeyi kendi dilinize (veya bildiğiniz başka bir dile) çevirmek isterseniz:
1. Projedeki dil dosyasını (`lang.js` veya ilgili JSON dosyası) bulun.
2. Mevcut dil yapısını kopyalayarak yeni dil koduyla (örn: `fr`, `de`, `es`) ekleyin.
3. Tüm metinleri çevirip bize Pull Request (PR) gönderin!

### 2. 🐞 Hata Raporlama (Bug Reporting)
Sistemi test ederken bir hatayla mı karşılaştınız? Lütfen [GitHub Issues](https://github.com/hazreti-ozay/faterollerdenemesi/issues) sekmesini kullanarak yeni bir "Issue" (Sorun) açın. Raporunuzda lütfen şu detaylara yer verin:
* Hatayı tetiklemek için yaptığınız adımların net bir listesi (Adım 1: ..., Adım 2: ...).
* Beklediğiniz davranışın ne olduğu.
* Gerçekte ne olduğu (hata mesajı, vb.).
* Mümkünse ekran görüntüsü veya konsol (F12) hata çıktıları.

### 3. ✨ Yeni Özellik Önerileri (Feature Requests)
"Şu özellik de olsa harika olur!" dediğiniz bir fikriniz mi var? Bunu da [GitHub Issues](https://github.com/hazreti-ozay/faterollerdenemesi/issues) üzerinden "Feature Request" (Özellik Talebi) olarak açabilirsiniz. Lütfen fikrinizi ve bunun kullanıcılara ne gibi bir fayda sağlayacağını detaylıca açıklayın.

### 4. ⌨️ Kod Katkısı (Code Contribution)
Kod tabanına (codebase) doğrudan katkı sağlamak isterseniz, bu harika! Lütfen aşağıdaki "Pull Request" sürecini takip edin.

---

## 💻 Kod Katkısı ve Pull Request (PR) Süreci

1. **Repo'yu Fork'layın:** Projenin bir kopyasını kendi GitHub hesabınıza almak için sağ üst köşedeki "Fork" butonuna basın.

2. **Repo'yu Klonlayın:** Fork'ladığınız repoyu kendi bilgisayarınıza klonlayın.
    ```bash
    git clone [https://github.com/SENIN_KULLANICI_ADIN/faterollerdenemesi.git](https://github.com/SENIN_KULLANICI_ADIN/faterollerdenemesi.git)
    ```

3. **Yeni Bir Dal (Branch) Oluşturun:** Değişikliklerinizi `main` (veya `master`) dalı üzerinden değil, yapacağınız değişikliği açıklayan yeni bir dal üzerinden yapın.
    ```bash
    # Örnek: Yeni bir özellik için
    git checkout -b ozellik/anlik-onay-sistemi
    
    # Örnek: Bir hata düzeltmesi için
    git checkout -b fix/gm-panel-guncelleme-hatasi
    ```

4. **Değişikliklerinizi Yapın:** Proje **Vanilla JavaScript, HTML ve CSS** kullanmaktadır. Lütfen bu teknoloji yığınına (tech stack) sadık kalın ve gereksiz kütüphaneler (library) eklemekten kaçının.

5. **Değişiklikleri Commit'leyin:** Anlaşılır commit mesajları kullanarak değişikliklerinizi kaydedin.
    ```bash
    git commit -m "Fix: GM panelindeki oyuncu atma sayacını düzeltti."
    ```

6. **Dalınızı Push'layın:** Değişikliklerinizi kendi fork'unuza gönderin.
    ```bash
    git push origin ozellik/anlik-onay-sistemi
    ```

7. **Pull Request (PR) Açın:** Kendi fork'unuzun GitHub sayfasında, "Compare & pull request" butonuna basın. Yaptığınız değişiklikleri açıklayan net bir başlık ve açıklama yazarak PR'ı oluşturun.

PR'ınız incelenecek ve en kısa sürede geri bildirim yapılacaktır.

Katkılarınız için şimdiden teşekkürler!
