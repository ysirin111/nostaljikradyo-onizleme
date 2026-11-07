/**
 * Ana sayfa slaytı (Görev 6; envanter §1.2) — [data-sb-slayt].
 *
 * Sunucu bütün slaytları basar; JS yokken yalnız ilki görünür (öbürleri hidden), denetimler gizli kalır.
 * JS: öbür slaytların metni inert + saydam olarak açılır (geçiş için), arka plan görseli ancak o slayta
 * gelinince açılır (loading="lazy" görsel o ana kadar inmez). Otomatik dönüş 9 sn; fare üstündeyken ya da
 * odak içerideyken bekler, duraklat düğmesi (aria-pressed) her zaman var (WCAG 2.2.2).
 * prefers-reduced-motion: reduce iken otomatik dönüş hiç başlamaz (düğme basılı gelir), toz, parlama,
 * paralaks ve ilk açılış karartması kurulmaz (tasarımda dönüş sürüyordu; Review Focus 5).
 * Toz kanvası slayt görünmezken ve sekme gizliyken durur.
 */
( function () {
	'use strict';

	var kok = document.querySelector( '[data-sb-slayt]' );
	if ( ! kok ) {
		return;
	}
	var metinler = Array.prototype.slice.call( kok.querySelectorAll( '[data-sb-slayt-metin]' ) );
	var arkalar = Array.prototype.slice.call( kok.querySelectorAll( '[data-sb-slayt-arka]' ) );
	var noktalar = Array.prototype.slice.call( kok.querySelectorAll( '[data-sb-slayt-nokta]' ) );
	var denetim = kok.querySelector( '[data-sb-slayt-denetim]' );
	var duraklat = kok.querySelector( '[data-sb-slayt-duraklat]' );
	var sonraki = kok.querySelector( '[data-sb-slayt-sonraki]' );
	var parlama = kok.querySelector( '[data-sb-slayt-parlama]' );
	var azalt = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	var SURE = 9000;

	if ( metinler.length < 2 || ! denetim || ! duraklat ) {
		return;
	}

	var sira = 0;
	var zamanlayici = null;
	var durduruldu = azalt.matches;
	var bekle = { fare: false, odak: false, gizli: document.hidden };

	metinler.forEach( function ( metin, i ) {
		metin.hidden = false;
		metin.inert = i !== 0;
	} );
	denetim.hidden = false;
	kok.classList.add( 'sb-slayt--js' );

	function durdur() {
		if ( zamanlayici ) {
			window.clearInterval( zamanlayici );
			zamanlayici = null;
		}
	}

	function baslat() {
		durdur();
		if ( durduruldu || bekle.fare || bekle.odak || bekle.gizli ) {
			return;
		}
		zamanlayici = window.setInterval( function () {
			git( sira + 1 );
		}, SURE );
	}

	function git( hedef ) {
		var yeni = ( hedef + metinler.length ) % metinler.length;
		if ( yeni === sira ) {
			return;
		}
		sira = yeni;
		metinler.forEach( function ( metin, i ) {
			var bu = i === sira;
			metin.classList.toggle( 'is-etkin', bu );
			metin.inert = ! bu;
		} );
		arkalar.forEach( function ( arka, i ) {
			if ( i === sira ) {
				arka.hidden = false;
			}
			arka.classList.toggle( 'is-etkin', i === sira );
		} );
		noktalar.forEach( function ( nokta, i ) {
			if ( i === sira ) {
				nokta.setAttribute( 'aria-current', 'true' );
			} else {
				nokta.removeAttribute( 'aria-current' );
			}
		} );
		if ( parlama && ! azalt.matches ) {
			parlama.classList.remove( 'is-parla' );
			void parlama.offsetWidth; // Animasyonu yeniden başlatmak için yeniden akış.
			parlama.classList.add( 'is-parla' );
		}
		baslat();
	}

	function duraklatGuncelle() {
		duraklat.setAttribute( 'aria-pressed', durduruldu ? 'true' : 'false' );
	}

	noktalar.forEach( function ( nokta, i ) {
		nokta.addEventListener( 'click', function () {
			git( i );
		} );
	} );
	if ( sonraki ) {
		sonraki.addEventListener( 'click', function () {
			git( sira + 1 );
		} );
	}
	duraklat.addEventListener( 'click', function () {
		durduruldu = ! durduruldu;
		duraklatGuncelle();
		baslat();
	} );
	kok.addEventListener( 'mouseenter', function () {
		bekle.fare = true;
		durdur();
	} );
	kok.addEventListener( 'mouseleave', function () {
		bekle.fare = false;
		baslat();
	} );
	kok.addEventListener( 'focusin', function () {
		bekle.odak = true;
		durdur();
	} );
	kok.addEventListener( 'focusout', function ( olay ) {
		if ( ! kok.contains( olay.relatedTarget ) ) {
			bekle.odak = false;
			baslat();
		}
	} );
	document.addEventListener( 'visibilitychange', function () {
		bekle.gizli = document.hidden;
		baslat();
	} );
	azalt.addEventListener( 'change', function ( olay ) {
		if ( olay.matches ) {
			durduruldu = true;
			duraklatGuncelle();
			durdur();
		}
	} );

	duraklatGuncelle();
	baslat();

	// İkinci slaytın görseli ilk ekran oturduktan sonra hazırlanır: otomatik geçişte boş zemin görünmez.
	window.addEventListener( 'load', function () {
		window.setTimeout( function () {
			if ( arkalar[ 1 ] ) {
				arkalar[ 1 ].hidden = false;
			}
		}, 3000 );
	} );

	if ( azalt.matches ) {
		return;
	}

	// ---- Sinematik ekler: ilk açılış karartması, toz zerrecikleri, paralaks ----
	var karanlik = kok.querySelector( '[data-sb-slayt-karanlik]' );
	if ( karanlik ) {
		karanlik.addEventListener( 'animationend', function () {
			karanlik.remove();
		} );
	}
	window.setTimeout( function () {
		kok.classList.remove( 'sb-slayt--ilk' );
	}, 4200 );

	var tuval = kok.querySelector( '[data-sb-slayt-toz]' );
	var cizim = tuval && tuval.getContext ? tuval.getContext( '2d' ) : null;
	if ( cizim && 'IntersectionObserver' in window ) {
		var en = 0;
		var boy = 0;
		var parcalar = [];
		var calisiyor = false;
		var gorunur = false;
		var kare = 0;
		var son = 0;

		var olcu = function () {
			var dpr = Math.min( 2, window.devicePixelRatio || 1 );
			var kutu = tuval.getBoundingClientRect();
			en = kutu.width;
			boy = kutu.height;
			tuval.width = Math.round( en * dpr );
			tuval.height = Math.round( boy * dpr );
			cizim.setTransform( dpr, 0, 0, dpr, 0, 0 );
		};
		var uret = function ( adet ) {
			parcalar = [];
			for ( var i = 0; i < adet; i++ ) {
				var bokeh = i < 8;
				parcalar.push( {
					x: Math.random(),
					y: Math.random(),
					z: Math.random(),
					r: bokeh ? 6 + Math.random() * 10 : 0.6 + Math.random() * 1.8,
					bk: bokeh,
					vx: ( Math.random() - 0.5 ) * 0.004,
					vy: -( 0.006 + Math.random() * 0.014 ),
					ph: Math.random() * 6.28,
					sp: 0.4 + Math.random() * 1.2,
				} );
			}
		};
		var ciz = function ( t ) {
			if ( ! calisiyor ) {
				return;
			}
			var dt = Math.min( 50, t - son ) / 1000;
			son = t;
			cizim.clearRect( 0, 0, en, boy );
			parcalar.forEach( function ( p ) {
				p.x += p.vx * dt * ( 0.6 + p.z ) * 3;
				p.y += p.vy * dt * ( 0.5 + p.z ) * 3;
				if ( p.y < -0.05 ) {
					p.y = 1.05;
					p.x = Math.random();
				}
				if ( p.x < -0.05 ) {
					p.x = 1.05;
				}
				if ( p.x > 1.05 ) {
					p.x = -0.05;
				}
				var dx = p.x - 0.62;
				var dy = p.y - 0.55;
				var isik = Math.exp( -( ( dx * dx ) / 0.12 + ( dy * dy ) / 0.16 ) );
				var titre = 0.55 + 0.45 * Math.sin( ( t / 1000 ) * p.sp + p.ph );
				var a = p.bk ? 0.012 + 0.09 * isik : ( 0.18 + 0.7 * isik ) * titre * ( 0.4 + 0.6 * p.z );
				if ( a < 0.01 ) {
					return;
				}
				var x = p.x * en;
				var y = p.y * boy;
				if ( p.bk ) {
					var g = cizim.createRadialGradient( x, y, 0, x, y, p.r * 1.6 );
					g.addColorStop( 0, 'rgba(255,214,150,' + a + ')' );
					g.addColorStop( 1, 'rgba(255,214,150,0)' );
					cizim.fillStyle = g;
					cizim.beginPath();
					cizim.arc( x, y, p.r * 1.6, 0, 6.283 );
					cizim.fill();
				} else {
					cizim.fillStyle = 'rgba(255,226,176,' + a + ')';
					cizim.beginPath();
					cizim.arc( x, y, p.r * ( 0.7 + 0.5 * p.z ), 0, 6.283 );
					cizim.fill();
				}
			} );
			kare = window.requestAnimationFrame( ciz );
		};
		var tozBaslat = function () {
			if ( calisiyor || ! gorunur || document.hidden ) {
				return;
			}
			calisiyor = true;
			son = window.performance.now();
			kare = window.requestAnimationFrame( ciz );
		};
		var tozDurdur = function () {
			calisiyor = false;
			window.cancelAnimationFrame( kare );
		};

		olcu();
		uret( window.innerWidth < 700 ? 36 : 72 );
		window.addEventListener( 'resize', olcu );
		new IntersectionObserver( function ( kayitlar ) {
			gorunur = kayitlar[ 0 ].isIntersecting;
			if ( gorunur ) {
				tozBaslat();
			} else {
				tozDurdur();
			}
		} ).observe( kok );
		document.addEventListener( 'visibilitychange', function () {
			if ( document.hidden ) {
				tozDurdur();
			} else {
				tozBaslat();
			}
		} );
	}

	// Paralaks yalnız masaüstünde (992 px; temanın kırılımı).
	var zeminler = kok.querySelector( '[data-sb-slayt-arkalar]' );
	if ( zeminler && window.matchMedia( '(min-width: 992px)' ).matches ) {
		var bekliyor = false;
		window.addEventListener(
			'scroll',
			function () {
				if ( bekliyor ) {
					return;
				}
				bekliyor = true;
				window.requestAnimationFrame( function () {
					var y = Math.min( 60, Math.max( 0, window.scrollY * 0.12 ) );
					zeminler.style.transform = 'translate3d(0,' + y + 'px,0)';
					bekliyor = false;
				} );
			},
			{ passive: true }
		);
	}
}() );
