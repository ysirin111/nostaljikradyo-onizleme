/**
 * Header davranışı: mobil menü çekmecesi, arama paneli, mini sepet (spec §4.2).
 *
 * Tek mekanizma: [data-sb-ac="<id>"] tetikleyicisi o id'li katmanı açar ya da
 * kapatır. Açık katman `data-acik` taşır; içindeki [data-sb-kapat] onu kapatır;
 * aynı anda tek katman açıktır. Yeni bir katman (ör. mobil filtre çekmecesi)
 * yalnız bu işaretlemeyle aynı davranışı alır; ayrıca bağlanmaz.
 *
 * Klavye: açılınca odak katmandaki ilk odaklanabilir öğeye geçer, Tab ve
 * Shift+Tab katmanın içinde döner (odak tuzağı), Esc kapatır ve odağı açan
 * öğeye geri verir.
 *
 * Nostaljikradyo dersleri (nav.js + layout.css, ölçüldü 2026-07-31):
 * - Örtü tık yutmaz: CSS'te pointer-events: none. Dışarı tıkta kapatma
 *   document düzeyinde, capture aşamasında pointerdown ile ve preventDefault
 *   ÇAĞRILMADAN yapılır; tık kendi hedefine de ulaşır.
 * - Sayfa kaydırması kilitlenmez (kilitliyken sepete eklemeden sonraki ilk tık
 *   kayboluyordu).
 *
 * JS yoksa: menü ve arama tetikleyicileri #id çapasıdır (CSS :target katmanı
 * gösterir); sepet ikonu sepet sayfasına gider.
 */
( function () {
	'use strict';

	var ODAKLANABILIR = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
	var acikKatman = null;
	var oncekiOdak = null;

	function tetikleyiciler( id ) {
		return Array.prototype.filter.call( document.querySelectorAll( '[data-sb-ac]' ), function ( t ) {
			return t.getAttribute( 'data-sb-ac' ) === id;
		} );
	}

	function odaklanabilirler( katman ) {
		return Array.prototype.filter.call( katman.querySelectorAll( ODAKLANABILIR ), gorunur );
	}

	function gorunur( el ) {
		return el.getClientRects().length > 0 && 'hidden' !== window.getComputedStyle( el ).visibility;
	}

	/*
	 * Odağı katmanı açan öğeye geri verir. O öğe artık görünmüyorsa (Blocksy sepete
	 * eklenen düğmeyi `.added { display: none }` ile gizleyip yerine "Sepeti
	 * görüntüle" bağlantısını koyar) odak aynı kaptaki ilk görünür öğeye, o da
	 * yoksa katmanın görünür tetikleyicisine gider. Gizli öğeye focus() sessizce
	 * başarısız olur ve odak kapanan katmanın içinde kalırdı.
	 */
	function odagiGeriVer( katman ) {
		var hedef = oncekiOdak && document.contains( oncekiOdak ) ? oncekiOdak : null;
		if ( hedef && ! gorunur( hedef ) ) {
			hedef = hedef.parentElement ? odaklanabilirler( hedef.parentElement )[ 0 ] || null : null;
		}
		if ( ! hedef ) {
			hedef = tetikleyiciler( katman.id ).filter( gorunur )[ 0 ] || null;
		}
		if ( hedef ) {
			hedef.focus();
		}
	}

	function kapat( katman, odakGeriVerilsin ) {
		katman.removeAttribute( 'data-acik' );
		tetikleyiciler( katman.id ).forEach( function ( t ) {
			t.setAttribute( 'aria-expanded', 'false' );
		} );
		if ( acikKatman === katman ) {
			acikKatman = null;
		}
		if ( false !== odakGeriVerilsin ) {
			odagiGeriVer( katman );
		}
		oncekiOdak = null;
	}

	function ac( katman, odakKaynagi ) {
		if ( acikKatman && acikKatman !== katman ) {
			kapat( acikKatman, false );
		}
		oncekiOdak = odakKaynagi || document.activeElement;
		katman.setAttribute( 'data-acik', '' );
		tetikleyiciler( katman.id ).forEach( function ( t ) {
			t.setAttribute( 'aria-expanded', 'true' );
		} );
		acikKatman = katman;
		var ilk = odaklanabilirler( katman )[ 0 ];
		if ( ilk ) {
			ilk.focus();
		}
	}

	// JS'siz yedekle (#sb-cekmece çapası) açılmış katman: :target katmanı JS'nin
	// durumundan bağımsız açık tutacağı için çapa temizlenir.
	var capa = '';
	try {
		capa = window.location.hash ? decodeURIComponent( window.location.hash.slice( 1 ) ) : '';
	} catch ( hata ) {
		capa = '';
	}
	if ( capa && tetikleyiciler( capa ).length ) {
		window.location.replace( '#' );
		window.history.replaceState( null, '', window.location.pathname + window.location.search );
	}

	document.addEventListener( 'click', function ( e ) {
		if ( ! ( e.target instanceof Element ) ) {
			return;
		}
		var tetik = e.target.closest( '[data-sb-ac]' );
		if ( tetik ) {
			var katman = document.getElementById( tetik.getAttribute( 'data-sb-ac' ) );
			if ( ! katman ) {
				return; // Katman bu sayfada yok: bağlantı normal çalışır.
			}
			e.preventDefault();
			if ( katman.hasAttribute( 'data-acik' ) ) {
				kapat( katman );
			} else {
				ac( katman, tetik );
			}
			return;
		}
		var kapatici = e.target.closest( '[data-sb-kapat]' );
		var sahibi = kapatici ? kapatici.closest( '[data-acik]' ) : null;
		if ( sahibi ) {
			e.preventDefault();
			kapat( sahibi );
		}
	} );

	document.addEventListener( 'pointerdown', function ( e ) {
		if ( ! acikKatman || ! ( e.target instanceof Element ) ) {
			return;
		}
		var tetik = e.target.closest( '[data-sb-ac]' );
		if ( acikKatman.contains( e.target ) || ( tetik && tetik.getAttribute( 'data-sb-ac' ) === acikKatman.id ) ) {
			return;
		}
		kapat( acikKatman, false );
	}, true );

	document.addEventListener( 'keydown', function ( e ) {
		if ( ! acikKatman ) {
			return;
		}
		if ( 'Escape' === e.key ) {
			kapat( acikKatman );
			return;
		}
		if ( 'Tab' !== e.key ) {
			return;
		}
		var liste = odaklanabilirler( acikKatman );
		if ( ! liste.length ) {
			e.preventDefault();
			return;
		}
		var ilk = liste[ 0 ];
		var son = liste[ liste.length - 1 ];
		var iceride = acikKatman.contains( document.activeElement );
		if ( e.shiftKey && ( ! iceride || document.activeElement === ilk ) ) {
			e.preventDefault();
			son.focus();
		} else if ( ! e.shiftKey && ( ! iceride || document.activeElement === son ) ) {
			e.preventDefault();
			ilk.focus();
		}
	} );

	// Masaüstüne genişleyince çekmece kapanır (992: base.css'teki kırılım).
	window.matchMedia( '(min-width: 992px)' ).addEventListener( 'change', function ( e ) {
		var cekmece = document.getElementById( 'sb-cekmece' );
		if ( e.matches && cekmece && cekmece === acikKatman ) {
			kapat( cekmece, false );
		}
	} );

	// Geri tuşuyla önbellekten (bfcache) dönülen sayfada katman açık kalmasın.
	window.addEventListener( 'pageshow', function ( e ) {
		if ( e.persisted && acikKatman ) {
			kapat( acikKatman, false );
		}
	} );

	// Çekmecede alt menü akordiyonu. JS yokken alt menüler açık durur.
	var cekmeceMenu = document.getElementById( 'sb-cekmece-menu' );
	if ( cekmeceMenu ) {
		Array.prototype.forEach.call( cekmeceMenu.querySelectorAll( '.menu-item-has-children' ), function ( li, sira ) {
			var link = li.querySelector( ':scope > a' );
			var alt = li.querySelector( ':scope > .sub-menu' );
			if ( ! link || ! alt ) {
				return;
			}
			alt.id = 'sb-cekmece-alt-' + sira;
			alt.hidden = true;
			var dugme = document.createElement( 'button' );
			dugme.type = 'button';
			dugme.className = 'sb-cekmece__alt-dugme';
			dugme.setAttribute( 'aria-expanded', 'false' );
			dugme.setAttribute( 'aria-controls', alt.id );
			dugme.setAttribute( 'aria-label', link.textContent.trim() + ' alt menüsü' );
			dugme.innerHTML = '<svg class="sb-ikon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>';
			dugme.addEventListener( 'click', function () {
				var acilacak = 'true' !== dugme.getAttribute( 'aria-expanded' );
				dugme.setAttribute( 'aria-expanded', String( acilacak ) );
				alt.hidden = ! acilacak;
			} );
			link.after( dugme );
		} );
	}

	// Sepete ekleyince mini sepet açılır. added_to_cart WC ve Blocksy'nin jQuery
	// olayı (woocommerce/assets/js/frontend/add-to-cart.js:128); fragment'ları WC
	// kendisi değiştirir (:221-240). jQuery yalnız varsa dinlenir.
	function sepeteEklenince() {
		var mini = document.getElementById( 'sb-mini' );
		if ( mini && ! mini.hasAttribute( 'data-acik' ) ) {
			ac( mini, document.activeElement );
		}
	}
	function jQueryyeBagla() {
		if ( window.jQuery ) {
			window.jQuery( document.body ).on( 'added_to_cart', sepeteEklenince );
		}
	}
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', jQueryyeBagla );
	} else {
		jQueryyeBagla();
	}
}() );
