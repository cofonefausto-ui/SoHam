/**
 * player.js - Handles persistent audio across page navigations (PJAX)
 */

(function () {
    // 1. Initialize global audio if it doesn't exist
    if (!window.globalAudio) {
        // Use the mp3 file located in the 'public' folder
        window.globalAudio = new Audio('public/Mantra.mp3'); 
        window.globalAudio.loop = true;
        // Default volume
        window.globalAudio.volume = 0.5;
        
        // Add timeupdate listener to update progress bar across all pages
        window.globalAudio.addEventListener('timeupdate', () => {
            const soundBarContainers = document.querySelectorAll('.bg-white\\/50.dark\\:bg-black\\/20');
            soundBarContainers.forEach(container => {
                // Find progress bar and time texts based on the HTML structure
                const progressBar = container.querySelector('.h-full.bg-primary');
                const timeDisplays = container.querySelectorAll('.flex.justify-between.text-xs span');
                
                if (progressBar && timeDisplays.length >= 2 && !isNaN(window.globalAudio.duration)) {
                    const percent = (window.globalAudio.currentTime / window.globalAudio.duration) * 100;
                    progressBar.style.width = percent + '%';
                    
                    // Remove initial hardcoded width if present
                    if (progressBar.classList.contains('w-1/3')) {
                        progressBar.classList.remove('w-1/3');
                    }

                    const formatTime = (time) => {
                        const mins = Math.floor(time / 60);
                        const secs = Math.floor(time % 60);
                        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                    };

                    timeDisplays[0].textContent = formatTime(window.globalAudio.currentTime);
                    timeDisplays[1].textContent = formatTime(window.globalAudio.duration);
                }
            });
        });
        
        // When audio ends playing (if not looping) or user pauses
        window.globalAudio.addEventListener('pause', updateAllPlayButtons);
        window.globalAudio.addEventListener('play', updateAllPlayButtons);
    }
    
    function updateAllPlayButtons() {
        const soundBarContainers = document.querySelectorAll('.bg-white\\/50.dark\\:bg-black\\/20');
        soundBarContainers.forEach(container => {
            const btn = container.querySelector('button');
            const icon = btn ? btn.querySelector('.material-symbols-outlined') : null;
            if (icon && (icon.textContent.trim() === 'play_arrow' || icon.textContent.trim() === 'pause')) {
                icon.textContent = window.globalAudio.paused ? 'play_arrow' : 'pause';
            }
        });
    }

    // 2. Function to bind the sound bar in the current HTML
    function initSoundBar() {
        const soundBarContainers = document.querySelectorAll('.bg-white\\/50.dark\\:bg-black\\/20');

        soundBarContainers.forEach(container => {
            const btn = container.querySelector('button');
            const icon = btn ? btn.querySelector('.material-symbols-outlined') : null;
            
            if (btn && icon && (icon.textContent.trim() === 'play_arrow' || icon.textContent.trim() === 'pause')) {
                // Initial icon sync
                icon.textContent = window.globalAudio.paused ? 'play_arrow' : 'pause';
                
                // Remove old listeners to avoid duplicates if re-initialized
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                const newIcon = newBtn.querySelector('.material-symbols-outlined');
                
                newBtn.addEventListener('click', () => {
                    if (window.globalAudio.paused) {
                        // Browser might require user interaction before playing audio
                        let playPromise = window.globalAudio.play();
                        if (playPromise !== undefined) {
                            playPromise.then(_ => {
                                // icon updated by 'play' event listener
                            }).catch(error => {
                                console.error("Audio playback prevented:", error);
                                alert("No se pudo reproducir el audio. Verifica que exista el archivo 'audio.mp3' en la carpeta o interactúa con la página.");
                            });
                        }
                    } else {
                        window.globalAudio.pause();
                        // icon updated by 'pause' event listener
                    }
                });
            }

            // Volume control functionality
            const volumeIcon = Array.from(container.querySelectorAll('.material-symbols-outlined'))
                                  .find(icon => icon.textContent.trim().startsWith('volume_'));
            
            if (volumeIcon) {
                // Initial icon sync based on volume
                updateVolumeIcon(volumeIcon);

                const newVolumeIcon = volumeIcon.cloneNode(true);
                volumeIcon.parentNode.replaceChild(newVolumeIcon, volumeIcon);

                newVolumeIcon.addEventListener('click', () => {
                    // Toggle volume: 1.0 -> 0.5 -> 0.0 -> 1.0
                    if (window.globalAudio.volume > 0.5) {
                        window.globalAudio.volume = 0.5;
                    } else if (window.globalAudio.volume > 0) {
                        window.globalAudio.volume = 0;
                    } else {
                        window.globalAudio.volume = 1;
                    }
                    updateVolumeIcon(newVolumeIcon);
                });
            }
        });
    }

    function updateVolumeIcon(icon) {
        icon.style.cursor = 'pointer'; // Make it clickable visually
        if (window.globalAudio.volume === 0) {
            icon.textContent = 'volume_off';
        } else if (window.globalAudio.volume <= 0.5) {
            icon.textContent = 'volume_down';
        } else {
            icon.textContent = 'volume_up';
        }
    }

    // Run on initial load
    document.addEventListener('DOMContentLoaded', initSoundBar);
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initSoundBar();
    }

    // 3. PJAX Navigation logic to keep audio playing
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');

        // Intercept local `.html` links only
        if (href && href.endsWith('.html') && !href.startsWith('http')) {
            e.preventDefault();

            try {
                // Fetch the new page
                const response = await fetch(href);
                if (!response.ok) throw new Error('Network error');

                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Replace body content (preserves window context & audio)
                document.body.innerHTML = doc.body.innerHTML;
                document.title = doc.title;

                // Update URL in browser history
                history.pushState({}, '', href);

                // Scroll to top
                window.scrollTo(0, 0);

                // Re-initialize sound bar if we navigated to a page that has it (like index.html)
                initSoundBar();

            } catch (err) {
                console.error('PJAX navigation failed, falling back to standard navigation.', err);
                window.location.href = href;
            }
        }
    });

    // 4. Handle browser Back/Forward tracking via PJAX
    window.addEventListener('popstate', async () => {
        try {
            const response = await fetch(window.location.href);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            document.body.innerHTML = doc.body.innerHTML;
            document.title = doc.title;
            
            initSoundBar();
        } catch (err) {
            window.location.reload();
        }
    });

})();
