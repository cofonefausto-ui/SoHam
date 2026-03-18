/**
 * player.js - Persistent audio player with floating bar on all pages
 */

(function () {
    // ─── 1. Global audio setup ───────────────────────────────────────────────
    if (!window.globalAudio) {
        window.globalAudio = new Audio('public/Mantra.mp3');
        window.globalAudio.loop = true;
        window.globalAudio.volume = 0.5;
    }

    const audio = window.globalAudio;

    // ─── 2. Inject floating bar HTML (once, persists across PJAX) ───────────
    function injectFloatingBar() {
        if (document.getElementById('soham-floating-player')) return;

        const bar = document.createElement('div');
        bar.id = 'soham-floating-player';
        bar.innerHTML = `
            <div id="sfp-inner">
                <div id="sfp-info">
                    <span class="material-symbols-outlined" id="sfp-music-icon">music_note</span>
                    <span id="sfp-title">Mantra de Bienvenida</span>
                </div>
                <div id="sfp-controls">
                    <button id="sfp-play-btn" title="Reproducir / Pausar">
                        <span class="material-symbols-outlined" id="sfp-play-icon">play_arrow</span>
                    </button>
                    <div id="sfp-progress-wrapper">
                        <span id="sfp-current">00:00</span>
                        <div id="sfp-progress-track">
                            <div id="sfp-progress-fill"></div>
                        </div>
                        <span id="sfp-duration">--:--</span>
                    </div>
                    <div id="sfp-volume-wrapper">
                        <span class="material-symbols-outlined" id="sfp-vol-icon">volume_up</span>
                        <input type="range" id="sfp-volume" min="0" max="1" step="0.05" value="0.5" title="Volumen" />
                    </div>
                    <button id="sfp-close-btn" title="Cerrar">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;

        // ── Styles (injected once) ──
        if (!document.getElementById('sfp-styles')) {
            const style = document.createElement('style');
            style.id = 'sfp-styles';
            style.textContent = `
                #soham-floating-player {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%) translateY(120px);
                    z-index: 9999;
                    width: min(640px, calc(100vw - 32px));
                    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
                    opacity: 0;
                    pointer-events: none;
                    font-family: 'Lexend', 'Inter', sans-serif;
                }
                #soham-floating-player.sfp-visible {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                    pointer-events: all;
                }
                #sfp-inner {
                    background: rgba(28, 25, 22, 0.92);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(180, 143, 108, 0.3);
                    border-radius: 999px;
                    padding: 10px 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                }
                #sfp-info {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #b48f6c;
                    flex-shrink: 0;
                }
                #sfp-info #sfp-music-icon {
                    font-size: 18px;
                    animation: sfp-pulse 2s ease-in-out infinite;
                }
                @keyframes sfp-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                #sfp-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: #d4b896;
                    white-space: nowrap;
                    display: none;
                }
                @media (min-width: 480px) {
                    #sfp-title { display: block; }
                }
                #sfp-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                    min-width: 0;
                }
                #sfp-play-btn {
                    background: #b48f6c;
                    border: none;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: transform 0.15s ease, background 0.2s;
                }
                #sfp-play-btn:hover { background: #c9a57e; transform: scale(1.1); }
                #sfp-play-btn .material-symbols-outlined {
                    font-size: 20px;
                    color: #fff;
                    user-select: none;
                }
                #sfp-progress-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex: 1;
                    min-width: 0;
                }
                #sfp-current, #sfp-duration {
                    font-size: 10px;
                    color: rgba(255,255,255,0.5);
                    flex-shrink: 0;
                    font-variant-numeric: tabular-nums;
                }
                #sfp-progress-track {
                    flex: 1;
                    height: 4px;
                    background: rgba(255,255,255,0.15);
                    border-radius: 999px;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }
                #sfp-progress-fill {
                    height: 100%;
                    background: #b48f6c;
                    border-radius: 999px;
                    width: 0%;
                    transition: width 0.5s linear;
                }
                #sfp-volume-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-shrink: 0;
                }
                #sfp-vol-icon {
                    font-size: 18px;
                    color: rgba(255,255,255,0.6);
                    cursor: pointer;
                    transition: color 0.2s;
                    user-select: none;
                }
                #sfp-vol-icon:hover { color: #b48f6c; }
                #sfp-volume {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 64px;
                    height: 4px;
                    background: rgba(255,255,255,0.15);
                    border-radius: 999px;
                    cursor: pointer;
                    outline: none;
                }
                #sfp-volume::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #b48f6c;
                    cursor: pointer;
                }
                @media (max-width: 479px) {
                    #sfp-volume { width: 44px; }
                }
                #sfp-close-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 2px;
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                    opacity: 0.4;
                    transition: opacity 0.2s;
                }
                #sfp-close-btn:hover { opacity: 1; }
                #sfp-close-btn .material-symbols-outlined {
                    font-size: 16px;
                    color: #fff;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(bar);
        bindFloatingBarEvents();
    }

    // ─── 3. Bind events on the floating bar ─────────────────────────────────
    function bindFloatingBarEvents() {
        // Play / Pause
        document.getElementById('sfp-play-btn').addEventListener('click', () => {
            if (audio.paused) {
                audio.play().catch(err => console.error('Playback error:', err));
            } else {
                audio.pause();
            }
        });

        // Progress bar seek
        document.getElementById('sfp-progress-track').addEventListener('click', (e) => {
            if (isNaN(audio.duration)) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            audio.currentTime = ratio * audio.duration;
        });

        // Volume slider
        document.getElementById('sfp-volume').addEventListener('input', (e) => {
            audio.volume = parseFloat(e.target.value);
            updateVolumeIcon();
        });

        // Volume icon click → mute toggle
        document.getElementById('sfp-vol-icon').addEventListener('click', () => {
            if (audio.volume > 0) {
                audio._prevVol = audio.volume;
                audio.volume = 0;
            } else {
                audio.volume = audio._prevVol || 0.5;
            }
            document.getElementById('sfp-volume').value = audio.volume;
            updateVolumeIcon();
        });

        // Close btn → pause + hide
        document.getElementById('sfp-close-btn').addEventListener('click', () => {
            audio.pause();
        });
    }

    // ─── 4. Sync bar state with audio events ────────────────────────────────
    function updatePlayIcon() {
        const icon = document.getElementById('sfp-play-icon');
        if (icon) icon.textContent = audio.paused ? 'play_arrow' : 'pause';
    }

    function updateVolumeIcon() {
        const icon = document.getElementById('sfp-vol-icon');
        if (!icon) return;
        if (audio.volume === 0) icon.textContent = 'volume_off';
        else if (audio.volume <= 0.5) icon.textContent = 'volume_down';
        else icon.textContent = 'volume_up';
    }

    function showFloatingBar() {
        const bar = document.getElementById('soham-floating-player');
        if (bar) bar.classList.add('sfp-visible');
    }

    function hideFloatingBar() {
        const bar = document.getElementById('soham-floating-player');
        if (bar) bar.classList.remove('sfp-visible');
    }

    audio.addEventListener('play', () => {
        updatePlayIcon();
        showFloatingBar();
    });

    audio.addEventListener('pause', () => {
        updatePlayIcon();
        hideFloatingBar();
    });

    audio.addEventListener('timeupdate', () => {
        const fill = document.getElementById('sfp-progress-fill');
        const curr = document.getElementById('sfp-current');
        const dur = document.getElementById('sfp-duration');
        if (!fill || isNaN(audio.duration)) return;

        fill.style.width = (audio.currentTime / audio.duration * 100) + '%';

        const fmt = t => {
            const m = Math.floor(t / 60);
            const s = Math.floor(t % 60);
            return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        };
        if (curr) curr.textContent = fmt(audio.currentTime);
        if (dur)  dur.textContent  = fmt(audio.duration);

        // Also sync legacy on-page player (index.html section)
        syncLegacyPlayer();
    });

    // ─── 5. Legacy on-page player (index.html) ──────────────────────────────
    function syncLegacyPlayer() {
        const containers = document.querySelectorAll('.bg-white\\/50');
        containers.forEach(container => {
            const bar = container.querySelector('.h-full.bg-primary');
            const times = container.querySelectorAll('.flex.justify-between.text-xs span');
            if (bar && !isNaN(audio.duration)) {
                const pct = (audio.currentTime / audio.duration) * 100;
                bar.style.width = pct + '%';
                bar.classList.remove('w-1/3');
                if (times[0]) times[0].textContent = document.getElementById('sfp-current')?.textContent || '00:00';
                if (times[1]) times[1].textContent = document.getElementById('sfp-duration')?.textContent || '--:--';
            }
        });
    }

    function initLegacyPlayer() {
        const containers = document.querySelectorAll('.bg-white\\/50');
        containers.forEach(container => {
            const btn = container.querySelector('button');
            const icon = btn?.querySelector('.material-symbols-outlined');
            if (!btn || !icon) return;
            if (!['play_arrow','pause'].includes(icon.textContent.trim())) return;

            icon.textContent = audio.paused ? 'play_arrow' : 'pause';

            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            const newIcon = newBtn.querySelector('.material-symbols-outlined');

            newBtn.addEventListener('click', () => {
                if (audio.paused) {
                    audio.play().catch(err => console.error(err));
                } else {
                    audio.pause();
                }
            });

            audio.addEventListener('play',  () => { if (newIcon) newIcon.textContent = 'pause'; });
            audio.addEventListener('pause', () => { if (newIcon) newIcon.textContent = 'play_arrow'; });

            // Volume icon
            const volIcon = Array.from(container.querySelectorAll('.material-symbols-outlined'))
                .find(i => i.textContent.trim().startsWith('volume_'));
            if (volIcon) {
                const newVol = volIcon.cloneNode(true);
                volIcon.parentNode.replaceChild(newVol, volIcon);
                updateVolLegacy(newVol);
                newVol.style.cursor = 'pointer';
                newVol.addEventListener('click', () => {
                    if (audio.volume > 0.5) audio.volume = 0.5;
                    else if (audio.volume > 0) audio.volume = 0;
                    else audio.volume = 1;
                    updateVolLegacy(newVol);
                    const sfpVol = document.getElementById('sfp-volume');
                    if (sfpVol) sfpVol.value = audio.volume;
                    updateVolumeIcon();
                });
            }
        });
    }

    function updateVolLegacy(icon) {
        if (audio.volume === 0) icon.textContent = 'volume_off';
        else if (audio.volume <= 0.5) icon.textContent = 'volume_down';
        else icon.textContent = 'volume_up';
    }

    // ─── 6. Init on page load / PJAX ────────────────────────────────────────
    function init() {
        injectFloatingBar();
        initLegacyPlayer();
        updatePlayIcon();
        updateVolumeIcon();
        // Keep bar visible if audio is already playing (e.g. after PJAX nav)
        if (!audio.paused) showFloatingBar();
    }

    document.addEventListener('DOMContentLoaded', init);
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        init();
    }

    // ─── 7. PJAX Navigation ──────────────────────────────────────────────────
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || !href.endsWith('.html') || href.startsWith('http')) return;

        e.preventDefault();
        try {
            const res = await fetch(href);
            if (!res.ok) throw new Error('Network error');
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Save the floating bar before replacing body
            const floatingBar = document.getElementById('soham-floating-player');
            const sfpStyles   = document.getElementById('sfp-styles');

            document.body.innerHTML = doc.body.innerHTML;
            document.title = doc.title;
            history.pushState({}, '', href);
            window.scrollTo(0, 0);

            // Re-attach floating bar (was removed with body innerHTML replacement)
            init();

        } catch (err) {
            console.error('PJAX failed:', err);
            window.location.href = href;
        }
    });

    window.addEventListener('popstate', async () => {
        try {
            const res  = await fetch(window.location.href);
            const html = await res.text();
            const doc  = new DOMParser().parseFromString(html, 'text/html');
            document.body.innerHTML = doc.body.innerHTML;
            document.title = doc.title;
            init();
        } catch {
            window.location.reload();
        }
    });

})();
