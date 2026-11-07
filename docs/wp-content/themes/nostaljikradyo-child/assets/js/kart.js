/**
 * Model kartı (Görev 6; envanter §1.4) — li.sb-kart[data-sb-kart] ve hızlı bakışın içeriği.
 *
 * Sunucu her rengi ürün sayfasına (?attribute_pa_renk=<slug>) giden düz bir bağlantı olarak basar, sepet
 * düğmesi ?add-to-cart= bağlantısıdır: JS yokken ikisi de çalışır. JS renk bağlantılarını WAI-ARIA radyo
 * grubuna çevirir (tek sekme durağı, oklarla gezinme). Renk seçilince o rengin varyasyon görseli gelir;
 * rengin fotoğrafı yoksa görsel o rengin yer tutucusudur ve "Görsel hazırlanıyor · <Renk>" notu görünür
 * (başka rengin fotoğrafı gösterilmez; spec §2, Review Focus 1). Renk verisi kartın data-sb-renkler
 * özniteliğinde (sunucu, WooCommerce varyasyonlarından).
 *
 * Sepete ekleme: ?wc-ajax=add_to_cart yalnız product_id ve quantity okur; radyoda product_id seçili
 * varyasyonun kimliğidir (WC üst ürünü ve renk niteliğini varyasyondan çözer). Başarıda WC parçaları
 * (header sayacı, mini sepet) değiştirilir ve added_to_cart olayı tetiklenir (nav.js mini sepeti açar);
 * hata yanıtında kartın notu görünür.
 */
( function () {
	'use strict';

	var ayar = window.sbKart || {};

	function renkler( kart ) {
		try {
			return JSON.parse( kart.getAttribute( 'data-sb-renkler' ) || '[]' );
		} catch ( hata ) {
			return [];
		}
	}

	function gorselUygula( img, gorsel, yerTutucu ) {
		if ( ! img ) {
			return;
		}
		// Rengin görseli yoksa (varyasyon görseli de WC yer tutucusu da yok) önceki rengin fotoğrafı
		// kalmaz: görsel gizlenir, yer tutucu notu rengi söyler (spec §2).
		if ( ! gorsel || ! gorsel.src ) {
			img.hidden = true;
			img.removeAttribute( 'data-sb-yer-tutucu' );
			return;
		}
		img.hidden = false;
		if ( gorsel.srcset ) {
			img.setAttribute( 'srcset', gorsel.srcset );
			img.setAttribute( 'sizes', gorsel.sizes || '100vw' );
		} else {
			img.removeAttribute( 'srcset' );
			img.removeAttribute( 'sizes' );
		}
		img.src = gorsel.src;
		img.alt = gorsel.alt || '';
		if ( yerTutucu ) {
			img.setAttribute( 'data-sb-yer-tutucu', yerTutucu );
		} else {
			img.removeAttribute( 'data-sb-yer-tutucu' );
		}
	}

	/**
	 * Rengi bir kaba (kart ya da hızlı bakış içeriği) uygular.
	 *
	 * @param {Element} kap     Kart ya da hızlı bakış içeriği.
	 * @param {Object}  renk    Renk kaydı.
	 * @param {string}  anahtar Görsel anahtarı: 'kart' | 'bakis'.
	 */
	function renkUygula( kap, renk, anahtar ) {
		kap.setAttribute( 'data-sb-secili', renk.slug );
		Array.prototype.forEach.call( kap.querySelectorAll( '[data-sb-renk]' ), function ( a ) {
			var bu = a.getAttribute( 'data-sb-renk' ) === renk.slug;
			if ( a.hasAttribute( 'role' ) ) {
				a.setAttribute( 'aria-checked', bu ? 'true' : 'false' );
				a.setAttribute( 'tabindex', bu ? '0' : '-1' );
			}
		} );
		var img = kap.querySelector( 'kart' === anahtar ? '.sb-mkart__ana' : '.sb-bakis__gorsel img' );
		gorselUygula( img, renk[ anahtar ], renk.yer_tutucu );
		var ikinci = kap.querySelector( '[data-sb-ikinci]' );
		if ( ikinci ) {
			if ( renk.ikinci && 'kart' === anahtar ) {
				gorselUygula( ikinci, renk.ikinci, '' );
				ikinci.hidden = false;
			} else {
				ikinci.hidden = true;
			}
		}
		Array.prototype.forEach.call( kap.querySelectorAll( '[data-sb-gorsel-notu]' ), function ( not ) {
			not.hidden = ! renk.yer_tutucu;
			not.textContent = renk.yer_tutucu ? 'Görsel hazırlanıyor · ' + renk.yer_tutucu : '';
		} );
		Array.prototype.forEach.call( kap.querySelectorAll( '[data-sb-renk-adi]' ), function ( ad ) {
			ad.textContent = renk.ad;
		} );
		Array.prototype.forEach.call( kap.querySelectorAll( '[data-sb-kart-link]' ), function ( a ) {
			a.href = renk.url;
		} );
		Array.prototype.forEach.call( kap.querySelectorAll( '[data-sb-sepete]' ), function ( a ) {
			a.setAttribute( 'data-sb-sepete', String( renk.varyasyon ) );
			a.setAttribute( 'href', renk.sepet || renk.url );
			if ( renk.stok ) {
				a.removeAttribute( 'aria-disabled' );
			} else {
				a.setAttribute( 'aria-disabled', 'true' );
			}
		} );
		var bakisSepet = kap.querySelector( '[data-sb-bakis-sepete]' );
		if ( bakisSepet ) {
			bakisSepet.disabled = ! renk.stok;
		}
		Array.prototype.forEach.call( kap.querySelectorAll( '[data-sb-kart-hata]' ), function ( not ) {
			not.textContent = renk.stok ? '' : 'Bu renk şu an tükendi.';
		} );
	}

	/**
	 * Renk bağlantılarını radyo grubuna çevirir. secildiginde( renk ) seçimden sonra çağrılır.
	 */
	function renkGrubuKur( kap, kayitlar, secili, anahtar, secildiginde ) {
		var liste = kap.querySelector( '[data-sb-renk-listesi]' );
		if ( ! liste || ! kayitlar.length ) {
			return;
		}
		var baglantilar = Array.prototype.slice.call( liste.querySelectorAll( '[data-sb-renk]' ) );
		liste.setAttribute( 'role', 'radiogroup' );
		baglantilar.forEach( function ( a ) {
			a.setAttribute( 'role', 'radio' );
			a.removeAttribute( 'aria-current' ); // JS'siz seçili işaret; radyo grubunda aria-checked taşır.
		} );
		var bul = function ( slug ) {
			return kayitlar.filter( function ( r ) {
				return r.slug === slug;
			} )[ 0 ];
		};
		var sec = function ( a, odakla ) {
			var renk = bul( a.getAttribute( 'data-sb-renk' ) );
			if ( ! renk ) {
				return;
			}
			renkUygula( kap, renk, anahtar );
			if ( odakla ) {
				a.focus();
			}
			if ( secildiginde ) {
				secildiginde( renk );
			}
		};
		baglantilar.forEach( function ( a, i ) {
			a.addEventListener( 'click', function ( olay ) {
				olay.preventDefault();
				sec( a, false );
			} );
			a.addEventListener( 'keydown', function ( olay ) {
				var hedef = null;
				if ( 'ArrowRight' === olay.key || 'ArrowDown' === olay.key ) {
					hedef = baglantilar[ ( i + 1 ) % baglantilar.length ];
				} else if ( 'ArrowLeft' === olay.key || 'ArrowUp' === olay.key ) {
					hedef = baglantilar[ ( i - 1 + baglantilar.length ) % baglantilar.length ];
				} else if ( ' ' === olay.key ) {
					hedef = a;
				}
				if ( hedef ) {
					olay.preventDefault();
					sec( hedef, true );
				}
			} );
		} );
		var ilk = bul( secili ) || kayitlar[ 0 ];
		renkUygula( kap, ilk, anahtar );
	}

	function parcalariUygula( parcalar ) {
		Object.keys( parcalar || {} ).forEach( function ( secici ) {
			var sablon = document.createElement( 'template' );
			sablon.innerHTML = String( parcalar[ secici ] ).trim();
			Array.prototype.forEach.call( document.querySelectorAll( secici ), function ( eski ) {
				eski.replaceWith( sablon.content.cloneNode( true ) );
			} );
		} );
	}

	/**
	 * Sepete ekler. Başarıda once() (varsa) çağrılır, sonra WC olayı tetiklenir.
	 *
	 * @return {Promise<boolean>}
	 */
	function sepeteEkle( kimlik, adet, notOgesi, once ) {
		if ( ! ayar.ucu || ! kimlik ) {
			return Promise.resolve( false );
		}
		var govde = new URLSearchParams();
		govde.set( 'product_id', String( kimlik ) );
		govde.set( 'quantity', String( adet || 1 ) );
		var hata = function () {
			if ( notOgesi ) {
				notOgesi.textContent = 'Sepete eklenemedi. Ürün sayfasından deneyebilirsiniz.';
			}
			return false;
		};
		return window
			.fetch( ayar.ucu, { method: 'POST', credentials: 'same-origin', body: govde } )
			.then( function ( yanit ) {
				return yanit.ok ? yanit.json() : null;
			} )
			.then( function ( veri ) {
				if ( ! veri || veri.error || ! veri.fragments ) {
					return hata();
				}
				if ( notOgesi ) {
					notOgesi.textContent = '';
				}
				parcalariUygula( veri.fragments );
				if ( once ) {
					once();
				}
				if ( window.jQuery ) {
					window.jQuery( document.body ).trigger( 'added_to_cart', [ veri.fragments, veri.cart_hash ] );
				}
				return true;
			} )
			.catch( hata );
	}

	function kartKur( kart ) {
		var kayitlar = renkler( kart );
		renkGrubuKur( kart, kayitlar, kart.getAttribute( 'data-sb-secili' ), 'kart', null );
		var sepet = kart.querySelector( '[data-sb-sepete]' );
		if ( sepet ) {
			sepet.addEventListener( 'click', function ( olay ) {
				olay.preventDefault();
				if ( sepet.hasAttribute( 'aria-disabled' ) || sepet.hasAttribute( 'data-sb-bekliyor' ) ) {
					return;
				}
				sepet.setAttribute( 'data-sb-bekliyor', '' );
				sepeteEkle( sepet.getAttribute( 'data-sb-sepete' ), 1, kart.querySelector( '[data-sb-kart-hata]' ) ).then( function () {
					sepet.removeAttribute( 'data-sb-bekliyor' );
				} );
			} );
		}
	}

	// Kart bir kez kurulur (data-sb-kuruldu); arşiv sıralaması/sayfalaması (arsiv.js) ve Beğenilenler
	// (begeni.js) kartları sonradan yerleştirir, o zaman yeniden taranır.
	function hepsiniKur() {
		Array.prototype.forEach.call( document.querySelectorAll( '[data-sb-kart]:not([data-sb-kuruldu])' ), function ( kart ) {
			kart.setAttribute( 'data-sb-kuruldu', '' );
			kartKur( kart );
		} );
	}

	hepsiniKur();
	document.addEventListener( 'sb:arsiv-guncellendi', hepsiniKur );
	if ( window.MutationObserver ) {
		Array.prototype.forEach.call( document.querySelectorAll( '.sb-arsiv__icerik, [data-sb-begeni-liste]' ), function ( kap ) {
			new MutationObserver( hepsiniKur ).observe( kap, { childList: true, subtree: true } );
		} );
	}

	window.sbKartlar = {
		renkler: renkler,
		renkUygula: renkUygula,
		renkGrubuKur: renkGrubuKur,
		sepeteEkle: sepeteEkle,
	};
}() );
