# CorexAI Proje Analizi ve Eksiklik Raporu

Bu belge, CorexAI projesinin 0.1.0 sürümü itibariyle teknik durumunu detaylandırmaktadır. Uygulanan özellikleri, sadece görsel olarak bulunan (mock) kısımları ve gelecekteki geliştirmeler için önerileri içerir.

## 1. Yönetici Özeti

**CorexAI**, hibrit bir mimari (Tauri + React + Rust) üzerine inşa edilmiş, gelecek vaat eden modern bir IDE projesidir. Temel kod düzenleme özelliklerini (Monaco Editor), dosya sistemi işlemlerini ve yerel yapay zeka çıkarımı (inference) için güçlü bir altyapıyı başarıyla uygulamaktadır.

Ancak, arayüzde reklamı yapılan "gelişmiş" özelliklerin önemli bir kısmı (Docker, Veritabanı, Eklentiler ve Git'in bazı kısımları) şu anda sadece **görsel taslak (mock)** olarak mevcuttur ve arka planda çalışan gerçek bir işlevselliğe sahip değildir. Proje, ön yüz (frontend) vizyonunun arka uç (backend) uygulamasının önünde gittiği bir geçiş aşamasındadır.

## 2. Mimari Genel Bakış

- **Ön Yüz (Frontend):** React 19, TypeScript 5.8, Tailwind CSS, Vite.
  - Yüksek kaliteli, modern UI bileşenleri.
  - Kod düzenleme için `monaco-editor` kullanılıyor.
  - React Context (`LanguageContext` vb.) ile durum yönetimi.

- **Arka Uç (Backend):** Rust (Tauri v2).
  - **Performans:** Sistem işlemleri (Dosya Okuma/Yazma, Terminal) için Rust'ın mükemmel kullanımı.
  - **Yapay Zeka Motoru:**
    - **Birincil:** Yerel sunucularla (örn. 1234 portundaki LM Studio) iletişim kuran HTTP istemcisi.
    - **Yerel (Deneysel):** `gguf.rs`, `llama-cpp-2` aracılığıyla GGUF modellerini doğrudan yüklemeyi sağlar. Bu, IDE'nin harici araçlara ihtiyaç duymadan modelleri çalıştırmasına olanak tanıyan güçlü bir özelliktir, ancak ana arayüzde HTTP yöntemine göre daha az entegre görünmektedir.
  - **Vektör Veritabanı:** RAG (Retrieval-Augmented Generation) için `vector_db.rs` içinde `lancedb` entegrasyonu uygulanmıştır.

## 3. Özellik Denetimi: Gerçek vs. Taklit (Mock)

| Özellik | Durum | Uygulama Detayları |
| :--- | :--- | :--- |
| **Kod Editörü** | ✅ **Gerçek** | Tam Monaco Editor entegrasyonu. Sözdizimi vurgulama ve temel düzenleme çalışıyor. |
| **Dosya Sistemi** | ✅ **Gerçek** | Tauri Dosya Sistemi API'leri (`read_dir`, `read_file`, `write_file`) tamamen işlevsel. |
| **Terminal** | ✅ **Gerçek** | Rust arka ucu üzerinden gerçek sistem kabuklarını (PowerShell/Bash) başlatır. |
| **Yerel YZ (Sohbet)** | ⚠️ **Hibrit** | Varsayılan olarak HTTP isteklerini (LM Studio) kullanır. Arka uçta yerel `llama.cpp` bağlantısı mevcut ancak arayüz harici sunucuyu tercih ediyor gibi görünüyor. |
| **Git Entegrasyonu** | ⚠️ **Kısmi** | **Backend:** Gerçek `git` komutları uygulanmış (`git_status`, `git_commit` vb.).<br>**Frontend:** `GitPanel.tsx` **SAHTE VERİ (MOCK DATA)** kullanıyor (simüle edilmiş gecikmeler, sahte commit'ler). Birçok yerde gerçek arka uç komutlarına bağlanmıyor. |
| **Eklentiler** | ❌ **Taklit** | `ExtensionsManager.tsx` tamamen kozmetik. Eklenti sistemi, VSIX desteği veya pazar yeri (marketplace) altyapısı yok. |
| **Docker** | ❌ **Taklit** | `DockerIntegration.tsx` kod içine gömülmüş konteyner listeleri kullanıyor. Docker Daemon ile iletişim yok. |
| **Veritabanı** | ❌ **Taklit** | `DatabaseBrowser.tsx` kod içine gömülmüş tablolar/satırlar kullanıyor. Gerçek veritabanı bağlantı mantığı yok. |

## 4. Detaylı Bulgular

### 4.1. "Sahte" Özellikler
Aşağıdaki bileşenler şu anda sadece yer tutucudur. İşlevsel görünseler de gerçek bir işlem yapmazlar:
- **Eklenti Yöneticisi:** Görüntülenen eklenti listesi (Prettier, Python vb.) kodun içine sabitlenmiştir. "Yükle" butonuna basmak sadece tarayıcı hafızasındaki (`localStorage`) bir değeri değiştirir.
- **Docker Paneli:** Gördüğünüz konteynerler (nginx, postgres) statik JavaScript nesneleridir. "Başlat/Durdur"a tıklamak gerçek Docker konteynerlerini değil, sadece yerel React durumunu değiştirir.
- **Veritabanı Tarayıcısı:** Gösterilen tablolar ve veriler kod içine yazılmış örneklerdir.

### 4.2. Git Bağlantı Kopukluğu
Arka uç (`src-tauri/src/commands.rs`), Git işlemleri için sağlam bir uygulamaya sahiptir:
```rust
#[tauri::command]
pub async fn git_status(repo_path: String) -> Result<serde_json::Value, String> { ... }
```
Ancak, ön yüz (`src/components/GitPanel.tsx`) bunu görmezden gelir ve şunu kullanır:
```typescript
const loadGitStatus = async () => {
  // Mock git status - in real implementation, this would call git commands
  const mockStatus: GitStatus = { ... };
  setGitStatus(mockStatus);
};
```
**Etki:** Kullanıcılar, gerçek depo durumlarını yansıtmayan bir Git arayüzü görecektir.

### 4.3. Yapay Zeka Uygulaması (İyi Haber)
Arka uç şaşırtıcı derecede yeteneklidir.
- **`gguf.rs`**: GGUF modellerini yüklemek, bölünmüş dosyaları işlemek ve `llama-cpp-2` kullanarak yerel çıkarım (inference) yapmak için tam bir uygulama.
- **`vector_db.rs`**: RAG (yapay zeka için kod bağlamı alma) için Vektör Veritabanının gerçek uygulaması.
- **`tree_sitter_parser.rs`**: Tree-sitter kullanan gerçek kod analizi.

Proje, gerçek bir "Yapay Zeka Yerlisi (AI-Native)" IDE olma *potansiyeline* sahiptir, ancak ön yüzün harici HTTP sunucularına (LM Studio) güvenmek yerine bu yerel Rust özelliklerini kullanacak şekilde bağlanması gerekmektedir.

## 5. Öneriler

1.  **Git Bağlantısını Kurun:** `GitPanel.tsx`'i mevcut Rust `git_*` komutlarına bağlamaya öncelik verin. Bu, temel bir özelliği gerçek hale getirmek için en kolay adımdır.
2.  **Eklentiler Konusunda Karar Verin:**
    - **Seçenek A:** Kullanıcıları yanıltmamak için Eklentiler panelini kaldırın.
    - **Seçenek B:** Genişletilebilirlik temel bir hedefse, basit bir eklenti sistemi (örn. WASM eklentileri veya basit betikler çalıştıran) uygulayın.
3.  **YZ Stratejisini Netleştirin:** README dosyası LM Studio kullanımını öneriyor, ancak kodun içinde yerleşik bir çalıştırıcı var.
    - **Öneri:** Yerel `llama.cpp` çalıştırıcısını varsayılan yapın. Bu, harici araçlara olan bağımlılığı ortadan kaldırır ve "Önce Gizlilik" vaadiyle uyumludur.
4.  **Taklitleri Kaldırın/Etiketleyin:** Docker ve Veritabanı özelliklerini, arka uç desteği eklenene kadar açıkça "Çok Yakında" olarak etiketleyin veya kaldırın.
5.  **"Eksik" Bağımlılıkları Düzeltin:** Geliştirmeye devam edilecekse, `vitest` ve diğer geliştirme araçlarının ortamda düzgün bir şekilde erişilebilir olduğundan emin olun.

## 6. Sonuç
CorexAI, çok yetenekli bir Rust arka ucuna sahip modern bir IDE'nin sağlam bir "İskeleti"dir. Geliştirmenin bir sonraki aşaması, **taklit (mock) özellikleri kaldırmaya** ve **ön yüzü halihazırda uygulanmış arka uç özelliklerine bağlamaya** odaklanmalıdır.
