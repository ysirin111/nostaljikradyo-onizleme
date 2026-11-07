/**
 * Arşiv sayfalarında (mağaza, kategori, arama) sıralama, filtre ve sayfalamanın sayfayı yeniden
 * yüklemeden çalışması (owner isteği 2026-10-01: filtre seçimi kullanıcıyı sayfanın başına atıyordu).
 *
 * İlerleyen geliştirme: JS yoksa ya da bir şey ters giderse (ağ hatası, beklenmeyen yanıt) olağan
 * gezinme çalışır, hiçbir bağlantı bozulmaz. Çalışma şekli:
 * - Sıralama formu (.woocommerce-ordering), filtre bağlantıları ve fiyat formu (.sb-filtre), "Temizle"
 *   ve sayfalama bağlantıları engellenir; adres fetch ile alınır, yanıttaki sonuç alanı
 *   (.sb-arsiv__icerik) ve filtre grupları şimdiki sayfaya yerleştirilir, adres history.pushState ile
 *   güncellenir (geri/ileri çalışır). Kaydırma konumu KORUNUR; yalnız sayfalama tıkı sonuçların
 *   başına götürür (sayfanın sonundan tıklanıyor).
 * - Mobil filtre çekmecesi açık kalır (yalnız içindeki gruplar yenilenir); çekmecenin açıp kapanması
 *   nav.js'te belge düzeyinde olay devriyle çalıştığı için yenilenen düğümlerde de geçerlidir.
 * - Güncellemeden sonra jQuery varsa WC fiyat çubuğu yeniden kurulur, `sb:arsiv-guncellendi` olayı
 *   yayılır (beğeni kalpleri bunu dinler), ekran okuyucuya sonuç sayısı duyurulur.
 */
( function () {
	'use strict';

	var icerik = document.querySelector( '.sb-arsiv__icerik' );
	if ( ! icerik || ! window.fetch || ! window.DOMParser || ! window.history || ! history.pushState ) {
		return;
	}

	var istek = null;
	var duyuru = null;

	function ayniKaynakMi( url ) {
		try {
			return new URL( url, location.href ).origin === location.origin;
		} catch ( e ) {
			return false;
		}
	}

	function duyur( metin ) {
		if ( ! duyuru ) {
			duyuru = document.createElement( 'p' );
			duyuru.className = 'screen-reader-text';
			duyuru.setAttribute( 'role', 'status' );
			duyuru.setAttribute( 'aria-live', 'polite' );
			document.body.appendChild( duyuru );
		}
		duyuru.textContent = metin;
	}

	function yenile( yeniSayfa ) {
		var yeniIcerik = yeniSayfa.querySelector( '.sb-arsiv__icerik' );
		if ( ! yeniIcerik ) {
			return false;
		}

		var simdikiGruplar = document.querySelector( '.sb-filtre__gruplar' );
		var yeniGruplar = yeniSayfa.querySelector( '.sb-filtre__gruplar' );
		// Filtre paneli bir yanıtta var, ötekinde yok: parça parça güncellenemez, olağan gezinme.
		if ( !! simdikiGruplar !== !! yeniGruplar ) {
			return false;
		}

		icerik.innerHTML = yeniIcerik.innerHTML;

		if ( simdikiGruplar && yeniGruplar ) {
			simdikiGruplar.innerHTML = yeniGruplar.innerHTML;
			var simdikiAlt = document.querySelector( '.sb-filtre__alt' );
			var yeniAlt = yeniSayfa.querySelector( '.sb-filtre__alt' );
			if ( simdikiAlt && yeniAlt ) {
				simdikiAlt.innerHTML = yeniAlt.innerHTML;
			}
		}

		if ( yeniSayfa.title ) {
			document.title = yeniSayfa.title;
		}

		return true;
	}

	function odagiGeriVer( ipucu ) {
		var hedef = null;

		if ( 'siralama' === ipucu.tur ) {
			hedef = document.querySelector( '.woocommerce-ordering select.orderby' );
		} else if ( 'baglanti' === ipucu.tur && ipucu.href ) {
			var baglantilar = document.querySelectorAll( '.sb-filtre a, .sb-sayfalama a' );
			Array.prototype.some.call( baglantilar, function ( a ) {
				if ( a.href === ipucu.href ) {
					hedef = a;
					return true;
				}
				return false;
			} );
		}

		if ( hedef && hedef.focus ) {
			hedef.focus( { preventScroll: true } );
		}
	}

	function yukle( url, secenek ) {
		if ( istek ) {
			istek.abort();
		}
		istek = new AbortController();
		var bu = istek;
		icerik.setAttribute( 'aria-busy', 'true' );
		icerik.classList.add( 'sb-arsiv--yukleniyor' );

		fetch( url, { credentials: 'same-origin', signal: bu.signal, headers: { Accept: 'text/html' } } )
			.then( function ( yanit ) {
				if ( ! yanit.ok ) {
					throw new Error( 'durum ' + yanit.status );
				}
				return yanit.text();
			} )
			.then( function ( metin ) {
				var yeni = new DOMParser().parseFromString( metin, 'text/html' );
				if ( ! yenile( yeni ) ) {
					throw new Error( 'ayrıştırılamadı' );
				}

				if ( secenek.it ) {
					history.pushState( { sbArsiv: true }, '', url );
				}

				icerik.removeAttribute( 'aria-busy' );
				icerik.classList.remove( 'sb-arsiv--yukleniyor' );

				if ( secenek.basaGit ) {
					icerik.scrollIntoView( { block: 'start' } );
				}
				odagiGeriVer( secenek.odak || {} );

				if ( window.jQuery ) {
					window.jQuery( document.body ).trigger( 'init_price_filter' );
				}
				document.dispatchEvent( new CustomEvent( 'sb:arsiv-guncellendi' ) );

				var sayi = icerik.querySelector( '.woocommerce-result-count' );
				duyur( sayi ? sayi.textContent.replace( /\s+/g, ' ' ).trim() : 'Sonuçlar güncellendi' );
			} )
			.catch( function ( hata ) {
				if ( hata && 'AbortError' === hata.name ) {
					return;
				}
				// Olağan gezinmeye düş: bağlantı ne yapacaksa onu yapar.
				location.assign( url );
			} );
	}

	function formAdresi( form ) {
		var taban = new URL( form.getAttribute( 'action' ) || location.href, location.href );
		var veri = new FormData( form );
		var parametre = new URLSearchParams( taban.search );
		veri.forEach( function ( deger, ad ) {
			if ( 'string' === typeof deger ) {
				parametre.set( ad, deger );
			}
		} );
		taban.search = parametre.toString();
		return taban.href;
	}

	// Sıralama: WC seçim değişince jQuery trigger('submit') ile formu gönderiyor; bu yerel form.submit()
	// çağırdığı için `submit` olayı hiç yayılmıyor. Bu yüzden `change` yakalama aşamasında yakalanır ve
	// WC'nin dinleyicisine ulaşmadan durdurulur (olay hedefe inmez).
	document.addEventListener( 'change', function ( olay ) {
		var secim = olay.target;
		if ( ! secim || ! secim.matches || ! secim.matches( '.woocommerce-ordering select.orderby' ) || ! secim.form ) {
			return;
		}
		var url = formAdresi( secim.form );
		if ( ! ayniKaynakMi( url ) ) {
			return;
		}
		olay.stopPropagation();
		yukle( url, { it: true, odak: { tur: 'siralama' } } );
	}, true );

	// Form gönderimleri (Enter, fiyat filtresi): yerel submit olayı gelirse aynı yol.
	document.addEventListener( 'submit', function ( olay ) {
		var form = olay.target;
		if ( ! form || ! form.matches ) {
			return;
		}

		if ( form.matches( '.woocommerce-ordering' ) ) {
			var url = formAdresi( form );
			if ( ! ayniKaynakMi( url ) ) {
				return;
			}
			olay.preventDefault();
			yukle( url, { it: true, odak: { tur: 'siralama' } } );
		} else if ( form.matches( '.sb-filtre form' ) ) {
			var fiyatUrl = formAdresi( form );
			if ( ! ayniKaynakMi( fiyatUrl ) ) {
				return;
			}
			olay.preventDefault();
			yukle( fiyatUrl, { it: true } );
		}
	}, true );

	// Filtre grupları, "Temizle" ve sayfalama bağlantıları.
	document.addEventListener( 'click', function ( olay ) {
		if ( olay.defaultPrevented || olay.button !== 0 || olay.metaKey || olay.ctrlKey || olay.shiftKey || olay.altKey ) {
			return;
		}
		var a = olay.target.closest ? olay.target.closest( '.sb-filtre__gruplar a, .sb-filtre__alt a.sb-btn--cerceve, .sb-sayfalama a' ) : null;
		if ( ! a || ! a.href || '_blank' === a.target || a.hasAttribute( 'download' ) || '#' === a.getAttribute( 'href' ).charAt( 0 ) || ! ayniKaynakMi( a.href ) ) {
			return;
		}
		olay.preventDefault();
		yukle( a.href, { it: true, basaGit: !! a.closest( '.sb-sayfalama' ), odak: { tur: 'baglanti', href: a.href } } );
	} );

	// Geri / ileri: ilk giriş de bir durum taşısın ki geri dönüşte geri yüklensin.
	history.replaceState( { sbArsiv: true }, '' );
	window.addEventListener( 'popstate', function ( olay ) {
		if ( olay.state && olay.state.sbArsiv ) {
			yukle( location.href, { it: false } );
		}
	} );
}() );
