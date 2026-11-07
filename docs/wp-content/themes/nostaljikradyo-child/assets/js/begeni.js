/**
 * Beğenilenler (Plan 2 Görev 12; spec §6.5). Ayar: window.sbBegeni (inc/begeni.php).
 *
 * - Misafir: liste yalnız localStorage'da ('sb-begenilenler'), çerez yok; sekmeler arası
 *   storage olayıyla eşitlenir. Erişim yoksa (gizli pencere, engelli site verisi) duyuru.
 * - Üye: REST (nonce'lu çerez). Süresi dolmuş nonce admin-ajax "rest-nonce" ile yenilenip istek
 *   bir kez tekrarlanır; yine olmazsa kalp eski haline döner.
 * - Girişte tarayıcıdaki liste hesaba birleşir (hesap önce), localStorage temizlenir.
 * - Beğenilenler sayfası (misafir): kimlikler kartlar ucuna gider; dönen `idler` listeyi ve
 *   sayacı uzlaştırır (gizlenen, tükenip gizlenen, silinen ürün düşer).
 */
(() => {
  const A = window.sbBegeni;
  if (!A) return;
  const ANAHTAR = 'sb-begenilenler';
  const temiz = (l) => (Array.isArray(l) ? l.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []);

  // null: localStorage erişilemez.
  const oku = () => {
    try {
      return temiz(JSON.parse(localStorage.getItem(ANAHTAR) || '[]'));
    } catch {
      return null;
    }
  };
  const yaz = (l) => {
    try {
      if (l.length) localStorage.setItem(ANAHTAR, JSON.stringify(l));
      else localStorage.removeItem(ANAHTAR);
      return true;
    } catch {
      return false;
    }
  };

  let liste = A.uye ? temiz(A.liste) : oku() || [];
  let tur = false;
  // Üye istekleri sırayla gider (hızlı tıklamada eski yanıt yeni listeyi ezmesin); sunucunun
  // listesi yalnız bekleyen istek kalmayınca uygulanır.
  let kuyruk = Promise.resolve();
  let bekleyen = 0;

  // Aynı ileti art arda gelince de okunsun: sonuna dönüşümlü görünmez boşluk.
  const duyur = (ileti) => {
    const b = document.querySelector('[data-sb-begeni-duyuru]');
    if (!b) return;
    tur = !tur;
    b.textContent = ileti + (tur ? '' : ' ');
  };

  const guncelle = () => {
    document.querySelectorAll('.sb-begeni[data-sb-begeni]').forEach((d) => {
      d.setAttribute('aria-pressed', String(liste.includes(Number(d.dataset.sbBegeni))));
    });
    document.querySelectorAll('[data-sb-begeni-sayac]').forEach((s) => {
      s.textContent = liste.length ? String(liste.length) : '';
      s.hidden = !liste.length;
    });
  };

  // Üye isteği: 403 rest_cookie_invalid_nonce → nonce yenilenir, bir kez tekrar.
  const istek = async (yontem, yol, govde, tekrar = true) => {
    const yanit = await fetch(A.rest + yol, {
      method: yontem,
      credentials: 'same-origin',
      headers: { 'X-WP-Nonce': A.nonce, 'Content-Type': 'application/json' },
      body: govde ? JSON.stringify(govde) : undefined,
    });
    if (yanit.status === 403 && tekrar && A.yenile) {
      const y = await fetch(A.yenile, { credentials: 'same-origin' });
      if (y.ok) {
        A.nonce = (await y.text()).trim();
        return istek(yontem, yol, govde, false);
      }
    }
    if (!yanit.ok) {
      let ileti = '';
      try {
        const h = await yanit.json();
        if (String(h.code || '').startsWith('sb_')) ileti = h.message || '';
      } catch {
        /* Gövde JSON değil. */
      }
      throw new Error(ileti);
    }
    return yanit.json();
  };

  const sayfa = document.querySelector('[data-sb-begenilenler]');
  const ul = sayfa && sayfa.querySelector('[data-sb-begeni-liste]');
  const bos = sayfa && sayfa.querySelector('[data-sb-begeni-bos]');
  const bosMu = () => {
    if (bos) bos.hidden = !!(ul && ul.querySelector('li'));
  };

  // Sayfadaki kart kaldırılınca odak sonraki (yoksa önceki) kartın kalbine, liste boşsa boş durum
  // bağlantısına gider; kaldırılan düğmeyle birlikte kaybolmaz.
  const kartiKaldir = (id) => {
    if (!ul) return;
    const kart = ul.querySelector(`li.post-${id}`);
    if (!kart) return;
    const hedefKart = kart.nextElementSibling || kart.previousElementSibling;
    const odakIcerde = kart.contains(document.activeElement);
    kart.remove();
    bosMu();
    if (!odakIcerde) return;
    const hedef = hedefKart ? hedefKart.querySelector('.sb-begeni') : bos && bos.querySelector('a');
    if (hedef) hedef.focus();
  };

  const degistir = async (dugme) => {
    const id = Number(dugme.dataset.sbBegeni);
    const eklenecek = !liste.includes(id);
    if (eklenecek && liste.length >= A.sinir) {
      duyur(`Beğenilenler listesi en çok ${A.sinir} ürün alabilir.`);
      return;
    }
    const onceki = liste.slice();
    liste = eklenecek ? [...liste, id] : liste.filter((n) => n !== id);

    if (!A.uye) {
      if (!yaz(liste)) {
        liste = onceki;
        duyur('Tarayıcınız beğenilenleri saklamaya izin vermiyor.');
        return;
      }
      guncelle();
      duyur(eklenecek ? 'Beğenilenlere eklendi' : 'Beğenilenlerden çıkarıldı');
      if (!eklenecek) kartiKaldir(id);
      return;
    }

    guncelle();
    duyur(eklenecek ? 'Beğenilenlere eklendi' : 'Beğenilenlerden çıkarıldı');
    bekleyen += 1;
    kuyruk = kuyruk.then(async () => {
      try {
        const y = await istek(eklenecek ? 'POST' : 'DELETE', eklenecek ? '' : `/${id}`, eklenecek ? { id } : null);
        if (bekleyen === 1) liste = temiz(y.idler);
        // Üye sayfasında kart sunucu onaylayınca kalkar; reddedilirse ya da kullanıcı bu arada geri
        // beğendiyse yerinde kalır.
        if (!eklenecek && !liste.includes(id)) kartiKaldir(id);
      } catch (hata) {
        // Yalnız bu işlem geri alınır; sıradaki işlemler korunur.
        if (eklenecek) liste = liste.filter((n) => n !== id);
        else if (!liste.includes(id)) liste = [...liste, id];
        duyur(hata.message || 'İşlem tamamlanamadı. Lütfen yeniden deneyin.');
      } finally {
        bekleyen -= 1;
        guncelle();
        kartlariUzlastir();
      }
    });
  };

  // Arşivde sıralama/filtre/sayfalama sonuçları yeniden yazınca (arsiv.js) yeni kartların kalpleri.
  document.addEventListener('sb:arsiv-guncellendi', guncelle);

  document.addEventListener('click', (e) => {
    const dugme = e.target.closest('.sb-begeni[data-sb-begeni]');
    if (!dugme) return;
    e.preventDefault();
    degistir(dugme);
  });

  // Misafir: başka sekmedeki değişiklik; açık Beğenilenler sayfasında kartlar da yenilenir.
  window.addEventListener('storage', (e) => {
    if (A.uye || e.key !== ANAHTAR) return;
    liste = oku() || [];
    guncelle();
    if (ul) kartlariGetir();
  });

  // Kart istekleri kuşakla sayılır: yalnız en son isteğin yanıtı uygulanır (öteki sekmede art arda
  // beğeni birden çok istek başlatır; her biri yeni kuşak). Yanıt beklenirken bu sayfada çıkarılan
  // ürünün kartı yanıtla geri gelmez.
  // Üye ve misafir sayfası aynı yolu kullanır; üyede liste sunucunundur, localStorage'a yazılmaz.
  let kartKusagi = 0;
  const kartlariGetir = async () => {
    const kusak = ++kartKusagi;
    const istenen = liste.slice();
    if (!istenen.length) {
      ul.innerHTML = '';
      guncelle();
      bosMu();
      return;
    }
    try {
      const y = await fetch(`${A.rest}/kartlar?ids=${istenen.join(',')}`, { credentials: 'omit' });
      if (!y.ok) throw new Error(String(y.status));
      const veri = await y.json();
      if (kusak !== kartKusagi) return;
      const kalan = temiz(veri.idler);
      const budanan = liste.filter((n) => kalan.includes(n));
      if (budanan.length !== liste.length) {
        liste = budanan;
        if (!A.uye) yaz(liste);
      }
      ul.innerHTML = veri.html;
      ul.querySelectorAll('li').forEach((li) => {
        const m = li.className.match(/\bpost-(\d+)\b/);
        if (m && !liste.includes(Number(m[1]))) li.remove();
      });
    } catch {
      if (kusak === kartKusagi) duyur('Beğenilenler yüklenemedi. Sayfayı yenileyin.');
    }
    guncelle();
    bosMu();
  };

  // Üye sayfası: kuyruk boşalınca kartlar listeyle uzlaşır. Eksik kart varsa (reddedilen silme,
  // birleştirmeyle gelen ürün) kartlar liste sırasıyla yeniden getirilir; fazlası kaldırılır.
  const kartlariUzlastir = () => {
    if (!ul || bekleyen) return;
    const kartlar = [...ul.querySelectorAll('li')].map((li) => Number((li.className.match(/\bpost-(\d+)\b/) || [])[1]));
    if (liste.some((n) => !kartlar.includes(n))) {
      kartlariGetir();
      return;
    }
    kartlar.filter((n) => !liste.includes(n)).forEach(kartiKaldir);
    bosMu();
  };

  // Girişte birleştirme: tarayıcıda liste varsa hesaba katılır, sonra silinir.
  // Kuyruğun ilk işi: birleştirme bitmeden gelen tıklamanın isteği onu beklemeli (ikisi de sunucuda
  // listeyi oku-değiştir-yaz yapıyor; sonra yazan öbürünü silerdi).
  const birlestir = () => {
    const yerel = oku();
    if (!yerel || !yerel.length) return;
    bekleyen += 1;
    kuyruk = kuyruk.then(async () => {
      try {
        const y = await istek('POST', '/birlestir', { ids: yerel.slice(0, A.sinir) });
        yaz([]);
        const sunucu = temiz(y.idler);
        liste = bekleyen === 1 ? sunucu : [...liste, ...sunucu.filter((n) => !liste.includes(n))];
        if (y.dusen > 0) duyur(`${y.dusen} ürün, liste sınırı (${A.sinir}) nedeniyle eklenemedi.`);
      } catch {
        /* Bir sonraki sayfada yeniden denenir; liste tarayıcıda kalır. */
      } finally {
        bekleyen -= 1;
        guncelle();
        kartlariUzlastir();
      }
    });
  };

  if (A.uye) {
    birlestir();
  } else {
    if (oku() === null) duyur('Tarayıcınız beğenilenleri saklamaya izin vermiyor.');
    if (ul) kartlariGetir();
  }
  guncelle();
})();
